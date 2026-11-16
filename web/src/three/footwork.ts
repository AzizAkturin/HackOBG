// steers both fighters from movement intents, keeps them apart and inside the ropes, reports range for the AI
import type { RangeBand } from './moves.ts'
import { backroom, clampToRing, escapeDir, ringInfo, trapped, type RingInfo, type XZ } from './ringGeo.ts'

export type MoveIntent =
  | { kind: 'hold'; range?: number }
  | { kind: 'press'; range?: number }
  | { kind: 'cutOff' }
  | { kind: 'retreat' }
  | { kind: 'circle'; dir: -1 | 1; range?: number }
  | { kind: 'pivot'; dir: -1 | 1 }
  | { kind: 'clinch' }
  | { kind: 'center' }
  | { kind: 'goto'; x: number; z: number; face?: number | 'travel' | 'center' | 'opp' }
  | { kind: 'locked'; face?: number | 'center' | 'opp' }

export interface LocoStyle {
  maxFwd: number
  maxBack: number
  maxSide: number
  accel: number
  turnRate: number
  /** in-and-out rhythm amplitude while holding range */
  bounce: number
  /** preferred centre-to-centre distance */
  range: number
}

export const DEFAULT_STYLE: LocoStyle = { maxFwd: 1.6, maxBack: 1.1, maxSide: 1.0, accel: 6, turnRate: 7, bounce: 0.12, range: 2.0 }

export interface Fighter {
  x: number
  z: number
  rotY: number
  vx: number
  vz: number
  /** local-frame velocity and turn rate, for the gait */
  vf: number
  vs: number
  turn: number
  /** stride phase in radians */
  phase: number
  radius: number
  scale: number
  wheel: boolean
  /** fixed facing offset sign, so stance never flips when fighters cross */
  stance: -1 | 1
  bias: number
  intent: MoveIntent
  urgency: number
  until: number
  style: LocoStyle
  /** knockback velocity, decays on its own */
  px: number
  pz: number
  /** 0..1 rope contact, for visuals */
  rope: number
  /** which way to slide along the ropes, re-decided at most every escapeAt */
  escape: -1 | 1
  escapeAt: number
}

export interface LocoQuery {
  band: RangeBand
  sep: number
  ring: RingInfo
  trapped: boolean
  oppTrapped: boolean
  inClinch: boolean
  /** > 0 when this fighter is nearer the centre than the opponent */
  centerControl: number
  moving: boolean
  backroom: number
}

const BODY_R = 0.62 * 0.82

export function bandFor(sep: number, scaleA = 1, scaleB = 1): RangeBand {
  const k = (scaleA + scaleB) / 2
  if (sep < 1.3 * k) return 'clinch'
  if (sep < 1.75 * k) return 'inside'
  if (sep < 2.4 * k) return 'punching'
  if (sep < 3.4 * k) return 'outside'
  return 'far'
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

function fighter(x: number, stance: -1 | 1): Fighter {
  return {
    x,
    z: 0,
    rotY: x < 0 ? Math.PI / 2 : -Math.PI / 2,
    vx: 0,
    vz: 0,
    vf: 0,
    vs: 0,
    turn: 0,
    phase: 0,
    radius: BODY_R,
    scale: 1,
    wheel: false,
    stance,
    bias: 0.45,
    intent: { kind: 'hold' },
    urgency: 0.5,
    until: Infinity,
    style: { ...DEFAULT_STYLE },
    px: 0,
    pz: 0,
    rope: 0,
    escape: 1,
    escapeAt: 0,
  }
}

export class Locomotion {
  f: [Fighter, Fighter] = [fighter(-2.1, -1), fighter(2.1, 1)]
  t = 0
  clinch = { active: false, left: 0, cool: 0 }
  /** fires when the referee breaks a clinch */
  onBreak: () => void = () => {}

  configure(rigs: { scale: number; wheel: boolean }[]) {
    rigs.forEach((r, i) => {
      const f = this.f[i]
      f.scale = r.scale
      f.radius = BODY_R * r.scale
      f.wheel = r.wheel
      if (r.wheel) f.style = { ...f.style, accel: f.style.accel * 1.4, maxSide: f.style.maxSide * 1.3 }
    })
  }

  setIntent(i: number, intent: MoveIntent, opts: { urgency?: number; until?: number } = {}) {
    const f = this.f[i]
    f.intent = intent
    f.urgency = opts.urgency ?? 0.5
    f.until = opts.until ?? Infinity
  }

  setStyle(i: number, style: Partial<LocoStyle>) {
    this.f[i].style = { ...this.f[i].style, ...style }
  }

  /** knockback impulse in the fighter's local frame (forward, left) */
  push(i: number, fwd: number, side: number) {
    const f = this.f[i]
    const [wx, wz] = this.toWorld(f, fwd, side)
    f.px += wx
    f.pz += wz
  }

  /** root-motion displacement in the fighter's local frame */
  commit(i: number, fwd: number, side: number) {
    const f = this.f[i]
    const [wx, wz] = this.toWorld(f, fwd, side)
    f.x += wx
    f.z += wz
    this.resolve(i === 0 ? 1 : 0)
  }

  sep(): number {
    const [a, b] = this.f
    return Math.hypot(b.x - a.x, b.z - a.z)
  }

  query(i: number): LocoQuery {
    const f = this.f[i]
    const o = this.f[1 - i]
    const sep = this.sep()
    return {
      band: bandFor(sep, f.scale, o.scale),
      sep,
      ring: ringInfo(f.x, f.z, f.radius),
      trapped: trapped([f.x, f.z], [o.x, o.z], f.radius),
      oppTrapped: trapped([o.x, o.z], [f.x, f.z], o.radius),
      inClinch: this.clinch.active,
      centerControl: Math.hypot(o.x, o.z) - Math.hypot(f.x, f.z),
      moving: Math.hypot(f.vx, f.vz) > 0.3,
      backroom: backroom(f.x, f.z, f.rotY, f.radius),
    }
  }

  step(dt: number) {
    if (dt <= 0) return
    this.t += dt
    for (const i of [0, 1]) {
      const f = this.f[i]
      if (this.t > f.until) this.setIntent(i, { kind: 'hold' })
    }
    this.stepClinch(dt)
    for (const i of [0, 1]) this.steer(i, dt)
    for (let k = 0; k < 3; k++) this.resolve(-1)
  }

  private toWorld(f: Fighter, fwd: number, side: number): XZ {
    const s = Math.sin(f.rotY)
    const c = Math.cos(f.rotY)
    return [s * fwd + c * side, c * fwd - s * side]
  }

  private desired(i: number): XZ {
    const f = this.f[i]
    const o = this.f[1 - i]
    const dx = o.x - f.x
    const dz = o.z - f.z
    const sep = Math.hypot(dx, dz) || 1e-3
    const ux = dx / sep
    const uz = dz / sep
    const k = (f.scale + o.scale) / 2
    const radial = (range: number, gain = 2.5) => {
      const e = sep - range * k
      return [ux * e * gain, uz * e * gain] as XZ
    }
    const toward = (tx: number, tz: number, gain = 2.5): XZ => [(tx - f.x) * gain, (tz - f.z) * gain]
    const it = f.intent
    switch (it.kind) {
      case 'hold': {
        const bounce = Math.sin(this.t * 4.2 + i * 2) * f.style.bounce * 4
        const [rx, rz] = radial(it.range ?? f.style.range)
        return [rx + ux * bounce, rz + uz * bounce]
      }
      case 'press': {
        const [rx, rz] = radial(it.range ?? f.style.range * 0.9, 3)
        // mirror the opponent's lateral drift so they cannot just walk away round the side
        const lat = -o.vx * uz + o.vz * ux
        return [rx - uz * lat * 0.8, rz + ux * lat * 0.8]
      }
      case 'cutOff': {
        // stand between the opponent and the open ring, leading their lateral motion
        const cx = -o.vx * 0.4
        const cz = -o.vz * 0.4
        const nx = cx - o.x
        const nz = cz - o.z
        const n = Math.hypot(nx, nz) || 1
        const r = f.style.range * 0.9 * k
        return toward(o.x + (nx / n) * r, o.z + (nz / n) * r, 3)
      }
      case 'retreat': {
        let vx = -ux * f.style.maxBack * 2
        let vz = -uz * f.style.maxBack * 2
        const info = ringInfo(f.x, f.z, f.radius)
        // backs onto the ropes, then slides along them toward the open side
        if (info.ropeDist < 0.6) {
          const [nx, nz] = info.ropeNormal
          const into = vx * nx + vz * nz
          if (into < 0 && info.ropeDist < 0.3) {
            vx -= into * nx
            vz -= into * nz
          }
          if (f.escapeAt < this.t) {
            f.escape = escapeDir([f.x, f.z], [o.x, o.z], f.radius)
            f.escapeAt = this.t + 1.2
          }
          vx += -nz * f.escape * f.style.maxSide * 2
          vz += nx * f.escape * f.style.maxSide * 2
        }
        return [vx, vz]
      }
      case 'circle': {
        const [rx, rz] = radial(it.range ?? f.style.range)
        return [rx - uz * it.dir * f.style.maxSide * 2, rz + ux * it.dir * f.style.maxSide * 2]
      }
      case 'pivot': {
        const a = it.dir * 1.4
        const rx = f.x - o.x
        const rz = f.z - o.z
        const tx = o.x + rx * Math.cos(a) - rz * Math.sin(a)
        const tz = o.z + rx * Math.sin(a) + rz * Math.cos(a)
        return toward(tx, tz, 4)
      }
      case 'clinch':
        return radial(1.1, 3)
      case 'center':
        return toward(0, 0, 1.5)
      case 'goto':
        return toward(it.x, it.z, 3)
      case 'locked':
        return [0, 0]
    }
  }

  private faceTarget(i: number): number {
    const f = this.f[i]
    const o = this.f[1 - i]
    const opp = Math.atan2(o.x - f.x, o.z - f.z) + f.stance * f.bias
    const it = f.intent
    const face = it.kind === 'goto' || it.kind === 'locked' ? it.face : 'opp'
    if (typeof face === 'number') return face
    if (face === 'center') return Math.atan2(-f.x, -f.z)
    if (face === 'travel' && Math.hypot(f.vx, f.vz) > 0.3) return Math.atan2(f.vx, f.vz)
    if (face === 'travel') return f.rotY
    return opp
  }

  private steer(i: number, dt: number) {
    const f = this.f[i]
    const st = f.style
    const urge = 0.55 + 0.45 * f.urgency
    let [dx, dz] = this.desired(i)

    // clamp in the local frame: forward, back and lateral speeds differ
    const s = Math.sin(f.rotY)
    const c = Math.cos(f.rotY)
    let df = dx * s + dz * c
    let ds = dx * c - dz * s
    const travel = f.intent.kind === 'goto' && f.intent.face === 'travel'
    df = Math.min(st.maxFwd * urge * f.scale * (travel ? 1.2 : 1), Math.max(-st.maxBack * urge * f.scale, df))
    ds = Math.min(st.maxSide * urge * f.scale, Math.max(-st.maxSide * urge * f.scale, ds))
    dx = s * df + c * ds
    dz = c * df - s * ds

    const ax = dx - f.vx
    const az = dz - f.vz
    const a = Math.hypot(ax, az)
    const lim = st.accel * urge * dt
    const k = a > lim ? lim / a : 1
    f.vx += ax * k
    f.vz += az * k

    const speed = Math.hypot(f.vx, f.vz)
    const prevRot = f.rotY
    const turnTo = wrap(this.faceTarget(i) - f.rotY)
    const maxTurn = st.turnRate * (f.intent.kind === 'pivot' ? 1.6 : 1) * dt
    f.rotY = f.rotY + Math.max(-maxTurn, Math.min(maxTurn, turnTo * (1 - Math.exp(-8 * dt))))
    f.turn = wrap(f.rotY - prevRot) / dt
    f.phase += (speed * 3.2 + Math.abs(f.turn) * 0.8) * dt

    // legged fighters travel in pulses that line up with foot plants
    const pulse = f.wheel ? 1 : 0.55 + 0.9 * Math.abs(Math.sin(f.phase))
    f.x += (f.vx * pulse + f.px) * dt
    f.z += (f.vz * pulse + f.pz) * dt
    const decay = Math.exp(-6 * dt)
    f.px *= decay
    f.pz *= decay

    const sr = Math.sin(f.rotY)
    const cr = Math.cos(f.rotY)
    f.vf = f.vx * sr + f.vz * cr
    f.vs = f.vx * cr - f.vz * sr
    f.rope = Math.max(0, f.rope - dt * 3)
  }

  private stepClinch(dt: number) {
    const [a, b] = this.f
    const sep = this.sep()
    const wants = a.intent.kind === 'clinch' || b.intent.kind === 'clinch'
    this.clinch.cool -= dt
    if (!this.clinch.active && wants && this.clinch.cool <= 0 && sep < 1.75 * ((a.scale + b.scale) / 2)) this.clinch = { active: true, left: 1.2 + ((this.t * 7.31) % 1) * 1.3, cool: 0 }
    if (!this.clinch.active) return
    this.clinch.left -= dt
    for (const f of this.f) f.bias = 0
    if (this.clinch.left > 0) {
      // drift together, locked chest to chest
      for (const [i, f] of this.f.entries()) if (f.intent.kind !== 'clinch') this.setIntent(i, { kind: 'clinch' })
      return
    }
    this.clinch.active = false
    this.clinch.cool = 6
    const dx = (b.x - a.x) / (sep || 1)
    const dz = (b.z - a.z) / (sep || 1)
    a.px -= dx * 2.2
    a.pz -= dz * 2.2
    b.px += dx * 2.2
    b.pz += dz * 2.2
    this.setIntent(0, { kind: 'hold' })
    this.setIntent(1, { kind: 'hold' })
    this.onBreak()
  }

  /** separate the bodies and keep both inside the ropes; `moved` (or -1) is who moved last */
  private resolve(moved: number) {
    const [a, b] = this.f
    const min = (a.radius + b.radius) * (this.clinch.active ? 0.95 : 1)
    const dx = b.x - a.x
    const dz = b.z - a.z
    const d = Math.hypot(dx, dz) || 1e-4
    if (d < min) {
      // the presser bullies the other backwards
      const wa = moved === 0 || a.intent.kind === 'press' || a.intent.kind === 'cutOff' ? 2 : 1
      const wb = moved === 1 || b.intent.kind === 'press' || b.intent.kind === 'cutOff' ? 2 : 1
      const over = min - d
      const ka = wb / (wa + wb)
      const kb = wa / (wa + wb)
      a.x -= (dx / d) * over * ka
      a.z -= (dz / d) * over * ka
      b.x += (dx / d) * over * kb
      b.z += (dz / d) * over * kb
    }
    for (const f of this.f) {
      const [cx, cz] = clampToRing(f.x, f.z, f.radius)
      if (cx !== f.x || cz !== f.z) {
        const nx = Math.sign(cx - f.x)
        const nz = Math.sign(cz - f.z)
        const into = -(f.vx * nx + f.vz * nz)
        // bounce off the ropes when driven into them hard
        if (into > 1.2) {
          f.px += nx * into * 0.35
          f.pz += nz * into * 0.35
          f.rope = 1
        }
        if (nx) f.vx = 0
        if (nz) f.vz = 0
        f.x = cx
        f.z = cz
      }
    }
  }
}
