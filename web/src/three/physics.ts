// spring layer on top of keyframed poses: hit reactions, recoil, whiffs and a hurt fighter's wobble
import type { Hand, HitKind, Offsets } from './moves.ts'

export const CHANS = ['headPitch', 'headYaw', 'headRoll', 'pitch', 'yaw', 'roll', 'fwd', 'side', 'drop', 'leadX', 'rearX', 'leadElbow', 'rearElbow', 'guard'] as const
export type Chan = (typeof CHANS)[number]
export type Kick = Partial<Record<Chan, number>>

interface Spec {
  omega: number
  zeta: number
  lo: number
  hi: number
}

const head = { omega: 20, zeta: 0.35, lo: -0.9, hi: 0.9 }
const torso = { omega: 14, zeta: 0.5, lo: -0.6, hi: 0.6 }
const pelvis = { omega: 9, zeta: 0.7, lo: -0.3, hi: 0.3 }
const arm = { omega: 16, zeta: 0.45, lo: -0.8, hi: 0.8 }

const SPECS: Record<Chan, Spec> = {
  headPitch: head,
  headYaw: head,
  headRoll: { ...head, lo: -0.6, hi: 0.6 },
  pitch: torso,
  yaw: torso,
  roll: { ...torso, lo: -0.45, hi: 0.45 },
  fwd: pelvis,
  side: pelvis,
  drop: { omega: 7, zeta: 0.4, lo: -0.1, hi: 0.45 },
  leadX: arm,
  rearX: arm,
  leadElbow: arm,
  rearElbow: arm,
  guard: { ...arm, lo: -0.3, hi: 0.9 },
}

const STEP = 1 / 120
const MAX_STEPS = 8
const zero = () => Object.fromEntries(CHANS.map((c) => [c, 0])) as Record<Chan, number>

export class FighterBody {
  readonly x = zero()
  private v = zero()
  private rest = zero()
  private acc = 0
  private loose = { k: 1, left: 0 }
  private t = 0

  /** dt in fight seconds; damage and rocked are 0..1 */
  step(dt: number, damage: number, rocked: number, reduced: boolean) {
    this.t += dt
    this.loose.left -= dt
    if (this.loose.left <= 0) this.loose.k = 1
    const sway = reduced ? 0.5 : Math.sin(this.t * 0.8) * 0.6 + Math.sin(this.t * 1.95 + 1.3) * 0.4
    this.rest.drop = 0.22 * rocked
    this.rest.guard = 0.35 * rocked
    this.rest.roll = 0.12 * rocked * sway
    this.rest.side = 0.06 * rocked * sway
    this.rest.headPitch = 0.15 * rocked
    const stiff = (1 - 0.4 * damage) * (1 - 0.3 * rocked) * this.loose.k
    const damp = 1 - 0.45 * damage
    this.acc = Math.min(this.acc + dt, STEP * MAX_STEPS)
    while (this.acc >= STEP) {
      this.acc -= STEP
      for (const c of CHANS) {
        const s = SPECS[c]
        const w = s.omega * stiff
        this.v[c] += (-w * w * (this.x[c] - this.rest[c]) - 2 * s.zeta * damp * w * this.v[c]) * STEP
        this.x[c] += this.v[c] * STEP
        if (this.x[c] < s.lo || this.x[c] > s.hi) {
          this.x[c] = Math.min(s.hi, Math.max(s.lo, this.x[c]))
          this.v[c] = 0
        }
        if (!Number.isFinite(this.x[c])) this.reset()
      }
    }
  }

  /** adds velocity (per second) to channels */
  kick(k: Kick, scale = 1) {
    for (const c of CHANS) if (k[c]) this.v[c] += k[c]! * scale
  }

  /** temporarily softens every spring, for stumbles */
  loosen(k: number, sec: number) {
    this.loose = { k, left: sec }
  }

  reset() {
    for (const c of CHANS) {
      this.x[c] = 0
      this.v[c] = 0
      this.rest[c] = 0
    }
    this.acc = 0
  }

  /** pose-space offsets; body weight (0..1) fades torso and pelvis channels during falls */
  offsets(body = 1): Offsets {
    const x = this.x
    return {
      headPitch: x.headPitch,
      headYaw: x.headYaw,
      headRoll: x.headRoll,
      pitch: x.pitch * body,
      yaw: x.yaw * body,
      roll: x.roll * body,
      fwd: x.fwd * body,
      side: x.side * body,
      drop: x.drop * body,
      leadX: x.leadX + x.guard,
      rearX: x.rearX + x.guard,
      leadElbow: x.leadElbow,
      rearElbow: x.rearElbow,
    }
  }
}

/** side sign: an attacker's lead (left) hand lands on the defender's right and drives toward the defender's left (+x) */
const sideOf = (hand: Hand) => (hand === 'lead' ? 1 : -1)

/** velocity kick for the fighter that gets hit; jitter in [0,1) varies it */
export function hitKick(kind: HitKind, hand: Hand, rnd: () => number): Kick {
  const s = sideOf(hand)
  const j = () => 0.8 + rnd() * 0.4
  const off = () => (rnd() - 0.5) * 3
  switch (kind) {
    case 'straight':
      return { headPitch: -12 * j(), headYaw: off(), headRoll: off() * 0.5, pitch: -3 * j(), yaw: -1.5 * s, fwd: -1.2 * j(), guard: 3 }
    case 'hook':
      return { headYaw: 14 * s * j(), headRoll: -8 * s * j(), headPitch: -2 + off() * 0.5, yaw: 3 * s, roll: -2 * s, side: 0.9 * s, guard: 2 }
    case 'uppercut':
      return { headPitch: -15 * j(), headYaw: off(), pitch: -5 * j(), drop: -0.8, guard: 4 }
    case 'overhand':
      return { headPitch: 6 * j(), headRoll: -5 * s * j(), headYaw: off(), pitch: 2, drop: 1.5 * j(), guard: 2 }
    case 'body':
      return { headPitch: 5 * j(), pitch: 6 * j(), roll: -1.5 * s, drop: 2.5 * j(), fwd: -0.8, guard: 2.5 }
  }
}

/** attacker's punch smothered by a guard */
export function recoilKick(hand: Hand): Kick {
  const s = sideOf(hand)
  return hand === 'lead' ? { leadElbow: -6, leadX: 3, fwd: -0.6, yaw: 1.5 * s } : { rearElbow: -6, rearX: 3, fwd: -0.6, yaw: 1.5 * s }
}

/** attacker overextends into empty air */
export function whiffKick(kind: HitKind, hand: Hand): Kick {
  const s = sideOf(hand)
  const across = kind === 'straight' ? -1 : 1
  return { fwd: 1.2, pitch: 2.5, yaw: 2 * s * across, headPitch: 2 }
}
