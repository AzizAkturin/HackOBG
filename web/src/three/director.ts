// Stages the fight: positions both robots, picks exchanges (attack, combo,
// defender reaction), and emits impacts for sparks, camera shake and the HUD.
// Moves are random for now; later the live event stream drives `perform`.
import * as THREE from 'three'
import type { Phase } from '../game/useRound'
import { GUARD, MOVES, samplePose, SIT, WALK, type MoveName, type Pose } from './moves'

/** Robots are modelled ~4 units tall and scaled down to stand in the cage. */
export const ROBOT_SCALE = 0.82
export const MAT_Y = 1.15
const HEAD_Y = MAT_Y + 3.2 * ROBOT_SCALE
const BODY_Y = MAT_Y + 2.35 * ROBOT_SCALE
const IDLE_DIST = 2.1
const FIGHT_DIST = 1.0
/** Where each robot sits between rounds: red corner front-left, blue back-right. */
export const CORNER_SEATS: [number, number][] = [
  [-2.85, 2.85],
  [2.85, -2.85],
]
const WALK_SPEED = 1.7

export type Reaction = 'block' | 'slip' | 'duck' | 'hit' | 'knockdown'

/** What the crowd can react to. */
export type CrowdKind = Reaction | 'taunt'

export interface FightEvent {
  attacker: number
  move: MoveName
  reaction: Reaction
}

export interface Burst {
  pos: THREE.Vector3
  dir: THREE.Vector3
  strength: number
}

interface Action {
  move: MoveName
  start: number
}

const COMBOS: [MoveName[], number][] = [
  [['jab'], 3],
  [['cross'], 2],
  [['hook'], 1.5],
  [['jab', 'cross'], 2.5],
  [['jab', 'cross', 'hook'], 1.5],
  [['jab', 'body', 'uppercut'], 1],
  [['body', 'hook'], 1],
  [['overhand'], 0.8],
  [['uppercut'], 0.8],
]
const COMBO_WEIGHT = COMBOS.reduce((a, [, w]) => a + w, 0)
const HEAVY: MoveName[] = ['hook', 'uppercut', 'overhand']

export class FightDirector {
  base = [
    { x: -IDLE_DIST, z: 0, rotY: 0 },
    { x: IDLE_DIST, z: 0, rotY: 0 },
  ]
  shake = 0
  /** per robot, 1 right after taking a hit, decaying to 0 */
  hurt = [0, 0]
  bursts: Burst[] = []
  /** Latest thing worth reacting to; `who` is the fighter who acted (attacker or taunter). */
  crowd: { seq: number; kind: CrowdKind; who: number } = { seq: 0, kind: 'hit', who: 0 }
  phase: Phase = 'betting'

  private actions: (Action | null)[] = [null, null]
  private queue: { at: number; fn: () => void }[] = []
  private next = 1.5
  private dist = IDLE_DIST
  private orbit = 0
  private bias = 0.45
  /** Ground speed per robot, for the walk cycle. */
  speed = [0, 0]
  private seated = [false, false]

  private emit: (e: FightEvent) => void = () => {}

  /** Receive hits, blocks and dodges (for the HUD callouts). */
  listen(fn: (e: FightEvent) => void) {
    this.emit = fn
  }

  private play(i: number, move: MoveName, at: number) {
    this.actions[i] = { move, start: at }
    if (move === 'taunt') this.cue(i, 'taunt')
  }

  private cue(who: number, kind: CrowdKind) {
    this.crowd = { seq: this.crowd.seq + 1, kind, who }
  }

  private schedule(at: number, fn: () => void) {
    this.queue.push({ at, fn })
  }

  pose(i: number, t: number): Pose {
    if (this.phase === 'rest') return this.seated[i] ? SIT : WALK
    const a = this.actions[i]
    if (!a) return this.speed[i] > 0.4 ? WALK : GUARD
    const def = MOVES[a.move]
    const u = (t - a.start) / def.dur
    if (u < 0) return GUARD
    if (u >= 1) {
      this.actions[i] = null
      return GUARD
    }
    return samplePose(def, u)
  }

  update(t: number, dt: number, phase: Phase) {
    if (phase !== this.phase) {
      this.phase = phase
      this.actions = [null, null]
      this.queue = []
      this.next = t + (phase === 'fighting' ? 0.9 : 2.5)
    }
    const locked = phase === 'fighting'

    const damp = THREE.MathUtils.damp
    this.dist = damp(this.dist, locked ? FIGHT_DIST : IDLE_DIST, 2.2, dt)
    this.orbit = damp(this.orbit, locked ? Math.sin(t * 0.35) * 0.5 : 0, 1.5, dt)
    this.bias = damp(this.bias, locked ? 0.12 : 0.45, 2, dt)

    // where each robot wants to stand, and which way it wants to face
    const cx = Math.cos(this.orbit) * this.dist
    const cz = Math.sin(this.orbit) * this.dist
    const spots: [number, number][] =
      phase === 'rest'
        ? CORNER_SEATS
        : [
            [-cx, -cz],
            [cx, cz],
          ]

    spots.forEach(([tx, tz], i) => {
      const b = this.base[i]
      const dx = tx - b.x
      const dz = tz - b.z
      const gap = Math.hypot(dx, dz)
      // walk at a capped speed so moves between spots read as steps, not slides
      const step = Math.min(gap, (locked ? 4 : WALK_SPEED) * dt)
      const nx = gap > 1e-4 ? b.x + (dx / gap) * step : b.x
      const nz = gap > 1e-4 ? b.z + (dz / gap) * step : b.z
      this.speed[i] = dt > 0 ? step / dt : 0
      this.seated[i] = phase === 'rest' && gap < 0.05

      let face: number
      if (phase === 'rest' && !this.seated[i] && gap > 0.3) {
        face = Math.atan2(dx, dz) // walking to the corner
      } else if (phase === 'rest') {
        face = Math.atan2(-nx, -nz) // seated, facing the centre of the ring
      } else {
        const [ox, oz] = spots[1 - i]
        const fx = ox - nx
        face = Math.atan2(fx, oz - nz) - Math.sign(fx || 1) * this.bias
      }
      // turn the short way round
      const delta = Math.atan2(Math.sin(face - b.rotY), Math.cos(face - b.rotY))
      this.base[i] = { x: nx, z: nz, rotY: b.rotY + delta * (1 - Math.exp(-6 * dt)) }
    })

    const due = this.queue.filter((e) => e.at <= t)
    this.queue = this.queue.filter((e) => e.at > t)
    due.forEach((e) => e.fn())

    if (t >= this.next && phase !== 'rest') {
      if (locked) this.exchange(t)
      else this.shadowbox(t)
    }

    this.shake *= Math.exp(-5 * dt)
    for (const i of [0, 1]) this.hurt[i] *= Math.exp(-6 * dt)
  }

  private shadowbox(t: number) {
    const i = Math.random() < 0.5 ? 0 : 1
    const move: MoveName = Math.random() < 0.25 ? 'taunt' : Math.random() < 0.5 ? 'jab' : 'cross'
    this.play(i, move, t)
    if (move !== 'taunt' && Math.random() < 0.5) this.schedule(t + MOVES[move].dur * 0.6, () => this.play(i, 'cross', t + MOVES[move].dur * 0.6))
    this.next = t + 2.2 + Math.random() * 2.5
  }

  private exchange(t: number) {
    const attacker = Math.random() < 0.5 ? 0 : 1
    const defender = 1 - attacker
    const r = Math.random()

    if (r < 0.07) {
      this.play(attacker, 'taunt', t)
      this.next = t + 1.8
      return
    }
    if (r < 0.15) {
      this.play(attacker, 'feint', t)
      this.play(defender, Math.random() < 0.5 ? 'block' : 'stepBack', t + 0.05)
      this.next = t + 0.9
      return
    }

    let pick = Math.random() * COMBO_WEIGHT
    const combo = COMBOS.find(([, w]) => (pick -= w) < 0)?.[0] ?? ['jab']

    let at = t
    for (const move of combo) {
      const def = MOVES[move]
      const hitAt = at + def.dur * (def.hit?.at ?? 0.5)
      const start = at
      this.schedule(start, () => this.play(attacker, move, start))

      const reaction = this.react(move)
      const defense: Record<Reaction, MoveName> = {
        block: 'block',
        slip: 'slip',
        duck: 'duck',
        hit: def.hit?.target === 'body' ? 'bodyFold' : 'stagger',
        knockdown: 'knockdown',
      }
      const early = reaction === 'block' || reaction === 'slip' || reaction === 'duck'
      const reactAt = early ? hitAt - 0.18 : hitAt
      this.schedule(reactAt, () => this.play(defender, defense[reaction], reactAt))
      this.schedule(hitAt, () => this.impact(attacker, move, reaction))

      if (reaction === 'knockdown') {
        this.schedule(hitAt + 0.6, () => this.play(attacker, 'taunt', hitAt + 0.6))
        at = hitAt + MOVES.knockdown.dur + 0.2
        break
      }
      at = hitAt + 0.1
    }
    this.next = at + 0.45 + Math.random() * 0.7
  }

  private react(move: MoveName): Reaction {
    const r = Math.random()
    if (r < 0.38) return 'block'
    if (r < 0.58) return HEAVY.includes(move) ? 'duck' : 'slip'
    if (HEAVY.includes(move) && Math.random() < 0.14) return 'knockdown'
    return 'hit'
  }

  private impact(attacker: number, move: MoveName, reaction: Reaction) {
    const a = this.base[attacker]
    const d = this.base[1 - attacker]
    const dir = new THREE.Vector3(d.x - a.x, 0, d.z - a.z).normalize()
    const reach = Math.hypot(d.x - a.x, d.z - a.z) * 0.62
    const y = MOVES[move].hit?.target === 'body' ? BODY_Y : HEAD_Y
    const pos = new THREE.Vector3(a.x + dir.x * reach, y, a.z + dir.z * reach)

    if (reaction === 'block') {
      this.bursts.push({ pos, dir, strength: 0.4 })
      this.shake = Math.min(1, this.shake + 0.15)
    } else if (reaction === 'hit' || reaction === 'knockdown') {
      this.bursts.push({ pos, dir, strength: reaction === 'knockdown' ? 1.6 : 1 })
      this.shake = Math.min(1.2, this.shake + (reaction === 'knockdown' ? 1 : 0.45))
      this.hurt[1 - attacker] = 1
    }
    this.cue(attacker, reaction)
    this.emit({ attacker, move, reaction })
  }
}
