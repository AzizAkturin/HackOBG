// runs choreographed exchanges on a fight clock hitstop can freeze, steers footwork, applies springs, emits impacts
import * as THREE from 'three'
import { neutralSignals, type Cue, type FightSignals } from '../game/fightStream'
import type { Phase } from '../game/arenaPhase'
import { choreograph, decide, type Beat, type Ctx, type Intent, type Note, type Reaction, type Weight } from './fight/choreographer'
import { applyImpact, creditAttacker, freshState, profileFor, tickState, type FighterProfile, type FighterState, type Side } from './fight/fighter'
import { gap, startRhythm, stepRhythm, type Rhythm } from './fight/rhythm'
import { seeded } from './fight/rng'
import { Locomotion } from './footwork'
import type { Motion } from './gait'
import { GUARD, instantiate, MOVES, moveTiming, progress, rollVariation, rootAt, sampleInstance, SIT, WALK, type MoveInstance, type MoveName, type Offsets, type Pose, type Variation } from './moves'
import { FighterBody, hitKick, recoilKick, whiffKick } from './physics'
import { CORNER_SEATS } from './ringGeo'

/** Robots are modelled ~4 units tall and scaled down to stand in the cage. */
export const ROBOT_SCALE = 0.82
export const MAT_Y = 1.15
const HEAD_Y = MAT_Y + 3.2 * ROBOT_SCALE
const BODY_Y = MAT_Y + 2.35 * ROBOT_SCALE
const IDLE_X = 2.1
/** mock rounds; live rounds pass their own length */
const ROUND_SEC = 24
export { CORNER_SEATS }
export type { Reaction }

/** What the crowd can react to. */
export type CrowdKind = Reaction | 'taunt'

export interface FightEvent {
  attacker: number
  move: MoveName
  reaction: Reaction
  power?: number
  clean?: boolean
  note?: Note
}

export interface Burst {
  pos: THREE.Vector3
  dir: THREE.Vector3
  strength: number
}

const LOCO_STYLE = {
  pressure: { range: 1.85, accel: 7.5, bounce: 0.08 },
  counter: { range: 2.05, bounce: 0.12 },
  outboxer: { range: 2.25, maxBack: 1.35, maxSide: 1.25, bounce: 0.16 },
}

export class FightDirector {
  /** steering, spacing and ring position for both fighters */
  loco = new Locomotion()
  /** world position and facing per robot */
  get base() {
    return this.loco.f.map(({ x, z, rotY }) => ({ x, z, rotY }))
  }
  /** ground speed per robot, for the walk cycle */
  get speed() {
    return this.loco.f.map((f) => Math.hypot(f.vx, f.vz))
  }
  /** per robot, builds with every landed punch over a fight, 0 to 1 */
  get damage() {
    return this.state.map((s) => s.damage)
  }
  shake = 0
  /** per robot, 1 right after taking a hit, decaying to 0 */
  hurt = [0, 0]
  bursts: Burst[] = []
  /** Latest thing worth reacting to; `who` is the fighter who acted (attacker or taunter). */
  crowd: { seq: number; kind: CrowdKind; who: number } = { seq: 0, kind: 'hit', who: 0 }
  phase: Phase = 'betting'
  /** fight seconds; frozen during hitstop, slowed during slow motion */
  now = 0
  /** scaled fight dt of the current frame */
  dt = 0
  /** real seconds of freeze left */
  hitstop = 0
  /** real seconds since start, for effects that must keep moving during hitstop */
  real = 0
  reduced = false
  /** live stream readout: how hard each model is working and the moves it earned */
  signals: FightSignals = neutralSignals()
  /** per robot, smoothed effort, 0 idle to about 1 flat out */
  work = [0.5, 0.5]
  /** dev-only playback speed */
  timeScale = 1
  rng = seeded(Date.now())
  /** round length in fight seconds, for pacing */
  roundLen = ROUND_SEC
  profiles: [FighterProfile, FighterProfile] = [profileFor({ brand: 'a' }), profileFor({ brand: 'b' })]
  state: [FighterState, FighterState] = [freshState(), freshState()]
  rhythm: Rhythm = startRhythm(0)
  /** spring layer per fighter */
  body = [new FighterBody(), new FighterBody()]
  /** 0..1 camera push toward the latest heavy impact */
  punch = 0
  focus = new THREE.Vector3(0, 3, 0)
  /** direction of the latest impact, for directional camera shake */
  kickDir = new THREE.Vector3(1, 0, 0)

  private slowmo = { scale: 1, left: 0 }
  private jolt = { who: -1, dir: 1 }
  private pending: { cue: Cue; at: number }[] = []
  private actions: (MoveInstance | null)[] = [null, null]
  private timeline: Beat[] = []
  private next = 1.5
  private roundStart = 0
  private seated = [false, false]
  private rigScale = [1, 1]
  private down = [0, 0]
  /** set by the round once the vote is in */
  winner: number | null = null
  private revealed = false
  private emit: (e: FightEvent) => void = () => {}

  constructor() {
    this.loco.onBreak = () => {
      for (const i of [0, 1] as Side[]) if (this.actions[i]?.name === 'clinch') this.play(i, 'stepBack', this.now)
    }
  }

  /** Receive hits, blocks and dodges (for the HUD callouts). */
  listen(fn: (e: FightEvent) => void) {
    this.emit = fn
  }

  /** tell footwork and the AI who is fighting: rig size, wheels, and the fighter's record */
  configure(rigs: { scale: number; wheel: boolean }[], fighters?: { brand: string; weightClass?: string; elo?: number; avgFinish?: number }[]) {
    this.rigScale = rigs.map((r) => r.scale)
    this.loco.configure(rigs)
    if (fighters) this.profiles = [profileFor(fighters[0]), profileFor(fighters[1])]
    this.profiles.forEach((p, i) => this.loco.setStyle(i, LOCO_STYLE[p.style]))
  }

  /** stride and local velocity for the legs */
  motion(i: number): Motion {
    const f = this.loco.f[i]
    return { vf: f.vf, vs: f.vs, turn: f.turn, phase: f.phase }
  }

  play(i: number, move: MoveName, at: number, opts: { v?: Variation; mirror?: boolean } = {}) {
    const v = opts.v ?? rollVariation(this.rng.next)
    this.actions[i] = instantiate(move, at, this.basePose(i, this.now), v, { mirror: opts.mirror, reduced: this.reduced })
    if (move === 'taunt') this.cue(i, 'taunt')
  }

  /** freeze fight time for sec real seconds; overlapping freezes take the longest, never the sum */
  freeze(sec: number, slow = 0) {
    this.hitstop = Math.max(this.hitstop, this.reduced ? sec * 0.5 : sec)
    if (slow > 0 && !this.reduced) this.slowmo = { scale: 0.35, left: slow }
  }

  private cue(who: number, kind: CrowdKind) {
    this.crowd = { seq: this.crowd.seq + 1, kind, who }
  }

  private walking(i: number): boolean {
    return this.phase !== 'fighting' && this.speed[i] > 0.6
  }

  private idle(i: number): Pose {
    if (this.phase === 'rest') return this.seated[i] ? SIT : WALK
    return this.walking(i) ? WALK : GUARD
  }

  /** keyframe pose at fight time t, without side effects */
  basePose(i: number, t: number): Pose {
    return this.frame(i, t).pose
  }

  /** target pose plus how stiffly the robot should follow it (Infinity = exactly) */
  frame(i: number, t = this.now): { pose: Pose; follow: number } {
    const a = this.actions[i]
    if (this.phase !== 'rest' && a && (t < a.start + a.dur || a.def.hold)) return t <= a.start ? { pose: a.from, follow: 30 } : sampleInstance(a, t)
    return { pose: this.idle(i), follow: this.phase === 'rest' || this.walking(i) ? 4 : 8 }
  }

  /** spring offsets added after the keyframe pose, faded out while the robot is on the canvas */
  offsets(i: number): Offsets {
    const a = this.actions[i]
    const fall = a ? Math.abs(this.basePose(i, this.now).fall) : 0
    const o = this.body[i].offsets(1 - Math.min(1, fall / 1.5))
    if (this.hitstop > 0 && this.jolt.who === i && !this.reduced) o.side = (o.side ?? 0) + Math.sin(this.real * 250) * 0.03 * this.jolt.dir
    return o
  }

  /** whether a fighter is mid-move */
  busy(i: number): boolean {
    const a = this.actions[i]
    return !!a && (a.def.hold || this.now < a.start + a.recoverAt)
  }

  /** advance one rendered frame; realDt is the unclamped frame delta */
  tick(realDt: number, phase: Phase) {
    const rd = Math.min(realDt, 0.05)
    this.real += rd
    let scale = this.timeScale
    if (this.hitstop > 0) {
      this.hitstop -= rd
      scale = 0
    } else if (this.slowmo.left > 0) {
      this.slowmo.left -= rd
      scale *= this.slowmo.scale
    }
    this.dt = rd * scale
    this.now += this.dt
    this.update(this.now, this.dt, rd, phase)
  }

  private enter(phase: Phase, t: number) {
    const from = this.phase
    this.phase = phase
    if (phase === 'betting') this.state = [freshState(), freshState()]
    this.state = this.state.map((s) => ({ ...s, rocked: 0, stun: 0, rally: 0, feinted: 0, cool: 0, rallies: phase === 'fighting' ? 0 : s.rallies })) as [FighterState, FighterState]
    this.actions = [null, null]
    this.timeline = []
    this.pending = []
    this.hitstop = 0
    this.slowmo.left = 0
    this.down = [0, 0]
    this.revealed = false
    for (const b of this.body) b.reset()
    if (phase === 'fighting') {
      this.roundStart = t
      this.rhythm = startRhythm(t)
      for (const s of this.state) s.lastActed = t
      if (from === 'rest') for (const i of [0, 1]) this.loco.setIntent(i, { kind: 'center' }, { urgency: 0.6, until: t + 1 })
    }
    this.next = t + (phase === 'fighting' ? 0.9 : 2.5)
  }

  private update(t: number, dt: number, rd: number, phase: Phase) {
    if (phase !== this.phase) this.enter(phase, t)
    const fighting = phase === 'fighting'
    const damp = THREE.MathUtils.damp

    for (const cue of this.signals.cues.splice(0)) if (fighting) this.pending.push({ cue, at: t })
    this.pending = this.pending.slice(-6)
    for (const i of [0, 1]) this.work[i] = damp(this.work[i], this.signals.pace[i], 1.2, dt)
    this.state = this.state.map((s) => tickState(s, dt, !fighting)) as [FighterState, FighterState]

    this.steerFeet(phase)
    this.loco.step(dt)
    this.rootMotion(t)

    while (this.timeline.length && this.timeline[0].at <= t) this.run(this.timeline.shift()!)

    if (phase === 'reveal') this.reveal(t)
    if (fighting && t >= this.next) this.exchange(t)
    else if (!fighting && phase !== 'rest' && !this.revealed && t >= this.next) this.shadowbox(t)
    if (fighting) this.ambient(t)

    for (const i of [0, 1]) {
      const a = this.actions[i]
      if (a && !a.def.hold && t >= a.start + a.dur) this.actions[i] = null
    }

    for (const i of [0, 1]) this.body[i].step(dt, this.state[i].damage, Math.min(1, this.state[i].rocked / 1.5), this.reduced)
    this.shake *= Math.exp(-5 * rd)
    this.punch *= Math.exp(-4 * rd)
    for (const i of [0, 1]) this.hurt[i] *= Math.exp(-6 * rd)
  }

  private ctx(t: number): Ctx {
    const q = [this.loco.query(0), this.loco.query(1)]
    return {
      t,
      p: Math.min(1, (t - this.roundStart) / this.roundLen),
      fighters: this.state,
      profiles: this.profiles,
      rhythm: this.rhythm,
      band: q[0].band,
      trapped: [q[0].trapped, q[1].trapped],
      backroom: [q[0].backroom, q[1].backroom],
      work: [this.work[0], this.work[1]],
      busy: [this.busy(0) || this.down[0] > t, this.busy(1) || this.down[1] > t],
    }
  }

  private takeCue(t: number): Cue | null {
    while (this.pending.length) {
      const { cue, at } = this.pending.shift()!
      if (t - at <= 4) return cue
    }
    return null
  }

  /** what the stream earned, as an intent; null if the move has no ring equivalent */
  private intentFor({ fighter, move, intensity }: Cue): Intent | null {
    if (fighter > 1) return null
    const who = fighter as Side
    if (move === 'jab') return { kind: 'attack', who, weight: 'light' }
    if (move === 'combo') return { kind: 'attack', who, weight: (intensity >= 0.95 ? 'power' : intensity >= 0.6 ? 'combo' : 'light') as Weight }
    if (move === 'circle') return { kind: 'reset', who }
    if (move === 'taunt') return { kind: 'showboat', who }
    // a retry or error: the other fighter catches them clean
    if (move === 'stagger') return { kind: 'attack', who: (1 - who) as Side, weight: 'light', force: 'hit' }
    if (move === 'knockdown') return { kind: 'attack', who: (1 - who) as Side, weight: 'power', force: 'knockdown' }
    return null
  }

  /** two attack cues from opposite fighters close together become a trade */
  private liveIntent(t: number): Intent | null {
    const cue = this.takeCue(t)
    const intent = cue && this.intentFor(cue)
    if (!intent || intent.kind !== 'attack' || intent.force) return intent
    const next = this.pending[0]
    const other = next && this.intentFor(next.cue)
    if (other && other.kind === 'attack' && !other.force && other.who !== intent.who && next.at - t < 0.6) {
      this.pending.shift()
      return { kind: 'trade' }
    }
    return intent
  }

  /** at the reveal, the winner celebrates and the loser stays down */
  private reveal(t: number) {
    if (this.winner === null || this.revealed) return
    this.revealed = true
    const w = this.winner as Side
    const l = (1 - w) as Side
    this.play(l, 'down', t)
    this.play(w, 'victory', t + 0.6)
    this.loco.setIntent(l, { kind: 'locked' })
    this.loco.setIntent(w, { kind: 'center' }, { urgency: 0.4 })
    this.cue(w, 'knockdown')
  }

  private exchange(t: number) {
    const x = this.ctx(t)
    const mean = (x.fighters[0].stamina + x.fighters[1].stamina) / 2
    this.rhythm = stepRhythm(this.rhythm, { t, p: x.p, stamina: mean, rocked: x.fighters.some((s) => s.rocked > 0), work: (this.work[0] + this.work[1]) / 2 }, this.rng)
    x.rhythm = this.rhythm
    // a fighter who has been eating shots can find a second wind, once a round
    for (const i of [0, 1] as Side[]) {
      const s = this.state[i]
      if (s.momentum < -0.45 && s.stamina > 0.35 && x.p > 0.45 && s.rally <= 0 && s.rallies < 1 && s.rocked <= 0 && this.rng.chance(0.3)) {
        this.state[i] = { ...s, rally: 4, rallies: s.rallies + 1, momentum: 0 }
        this.cue(i, 'taunt')
      }
    }
    const live = this.liveIntent(t)
    const blocked = live && ((live.kind === 'attack' && x.busy[live.who]) || (live.kind === 'trade' && (x.busy[0] || x.busy[1])))
    const intent = live && !blocked ? live : decide(x, this.rng)
    if (intent.kind === 'attack') this.state[intent.who].lastActed = t
    const plan = choreograph(x, intent, this.rng)
    this.timeline.push(...plan.beats)
    this.timeline.sort((a, b) => a.at - b.at)
    // both busy means a quick fight, both idle means a slow one
    const tempo = 1.6 - 0.9 * THREE.MathUtils.clamp((this.work[0] + this.work[1]) / 2, 0, 1)
    this.next = plan.end + gap(this.rhythm, mean, this.rng) * tempo * 0.7
  }

  /** dev: throw a combo now with a fixed outcome */
  force(attacker: number, combo: MoveName[], reaction: Reaction) {
    const a = attacker as Side
    const d = (1 - attacker) as Side
    this.timeline = []
    let at = this.now
    for (const move of combo) {
      const v = rollVariation(this.rng.next)
      const hit = MOVES[move].hit!
      const hitAt = at + moveTiming(move, v).hitAt!
      const answer: MoveName =
        reaction === 'block' ? 'block' : reaction === 'slip' ? 'slip' : reaction === 'duck' ? 'duck' : reaction === 'knockdown' ? 'knockdown' : hit.target === 'body' ? 'bodyFold' : 'stagger'
      this.timeline.push({ at, kind: 'move', who: a, move, v, mirror: false })
      this.timeline.push({ at: reaction === 'hit' || reaction === 'knockdown' ? hitAt : hitAt - 0.18, kind: 'move', who: d, move: answer, v: rollVariation(this.rng.next), mirror: false })
      this.timeline.push({ at: hitAt, kind: 'impact', who: a, move, reaction, power: hit.power, clean: true, rocked: false })
      at = hitAt + 0.1
      if (reaction === 'knockdown') break
    }
    this.timeline.sort((x, y) => x.at - y.at)
    this.next = at + 1.5
  }

  private run(b: Beat) {
    switch (b.kind) {
      case 'move':
        if (this.down[b.who] > this.now && b.move !== 'knockdown') return
        this.play(b.who, b.move, b.at, { v: b.v, mirror: b.mirror })
        if (MOVES[b.move].cost) this.state[b.who] = { ...this.state[b.who], stamina: Math.max(0, this.state[b.who].stamina - MOVES[b.move].cost! * (1.6 - this.profiles[b.who].workRate * 0.6)) }
        if (b.move === 'knockdown') this.down[b.who] = b.at + moveTiming('knockdown').dur * 0.9
        return
      case 'impact':
        return this.impact(b)
      case 'range':
        return this.loco.setIntent(b.who, b.intent, { urgency: b.urgency, until: b.at + b.dur })
      case 'feinted':
        this.state[b.who] = { ...this.state[b.who], feinted: 1.5 }
        return
    }
  }

  /** what fighters do between exchanges: a groggy wobble when rocked, arms tied up in a clinch */
  private ambient(t: number) {
    if (this.loco.clinch.active) for (const i of [0, 1] as Side[]) if (this.actions[i]?.name !== 'clinch' && this.down[i] <= t) this.play(i, 'clinch', t)
    for (const i of [0, 1] as Side[]) {
      const s = this.state[i]
      if (s.rocked > 0 && !this.busy(i) && this.down[i] <= t && this.rng.chance(this.dt * 0.8)) this.play(i, 'wobble', t, { mirror: this.rng.chance(0.5) })
    }
  }

  /** default movement outside the fight; inside it the choreographer sends range beats */
  private steerFeet(phase: Phase) {
    const L = this.loco
    for (const i of [0, 1]) {
      const f = L.f[i]
      f.bias = THREE.MathUtils.damp(f.bias, phase === 'fighting' ? 0.12 : 0.45, 2, this.dt)
      if (phase === 'rest') {
        const [x, z] = CORNER_SEATS[i]
        const gap = Math.hypot(x - f.x, z - f.z)
        this.seated[i] = gap < 0.05 || (this.seated[i] && gap < 0.3)
        L.setIntent(i, this.seated[i] ? { kind: 'locked', face: 'center' } : { kind: 'goto', x, z, face: gap > 0.4 ? 'travel' : 'center' }, { urgency: 0.9 })
        if (gap < 0.05) [f.x, f.z] = [x, z]
      } else if (this.revealed) {
        this.seated[i] = false
      } else if (phase !== 'fighting') {
        this.seated[i] = false
        L.setIntent(i, { kind: 'goto', x: i === 0 ? -IDLE_X : IDLE_X, z: 0, face: 'opp' }, { urgency: 0.35 })
      } else if (f.intent.kind === 'locked' && this.down[i] <= this.now) {
        L.setIntent(i, { kind: 'hold' })
      }
    }
  }

  /** moves with root motion carry the fighter instead of snapping back */
  private rootMotion(t: number) {
    for (const i of [0, 1]) {
      const a = this.actions[i]
      const r = a?.def.root
      if (!a || !r) continue
      const u = Math.min(1, progress(a, t - a.start))
      const k = rootAt(a.def, u)
      const step = k - a.rootDone
      if (step <= 0) continue
      a.rootDone = k
      const s = ROBOT_SCALE * this.rigScale[i]
      this.loco.commit(i, (r.fwd ?? 0) * step * s, (r.side ?? 0) * step * s * (a.mirrored ? -1 : 1))
    }
  }

  private shadowbox(t: number) {
    const i = (this.rng.chance(0.5) ? 0 : 1) as Side
    const move: MoveName = this.rng.chance(0.25) ? 'taunt' : this.rng.chance(0.5) ? 'jab' : 'cross'
    const v = rollVariation(this.rng.next)
    this.play(i, move, t, { v })
    const after = t + moveTiming(move, v).recoverAt
    if (move !== 'taunt' && this.rng.chance(0.5)) this.timeline.push({ at: after, kind: 'move', who: i, move: 'cross', v: rollVariation(this.rng.next), mirror: false })
    this.next = t + 2.2 + this.rng.next() * 2.5
  }

  private impact(b: Extract<Beat, { kind: 'impact' }>) {
    const { who: attacker, move, reaction, power } = b
    const defender = (1 - attacker) as Side
    const hit = MOVES[move].hit
    const a = this.loco.f[attacker]
    const d = this.loco.f[defender]
    const dir = new THREE.Vector3(d.x - a.x, 0, d.z - a.z).normalize()
    const reach = Math.max(0.66, Math.hypot(d.x - a.x, d.z - a.z) * 0.62)
    const y = hit?.target === 'body' ? BODY_Y : HEAD_Y
    const pos = new THREE.Vector3(a.x + dir.x * reach, y, a.z + dir.z * reach)
    const inst = this.actions[attacker]
    const hand = (inst?.name === move ? inst.hand : undefined) ?? hit?.hand ?? 'lead'
    const kind = hit?.kind ?? 'straight'
    const rnd = this.rng.next
    const blocked = reaction === 'block'
    const landed = reaction === 'hit' || reaction === 'knockdown'

    if (blocked || landed) {
      const r = applyImpact(this.state[defender], this.profiles[defender], { power, clean: b.clean, target: hit?.target ?? 'head', blocked, knockdown: reaction === 'knockdown' }, this.profiles[attacker].power)
      // the plan decided who gets rocked; keep the show consistent with it
      if (b.rocked && r.state.rocked <= 0) r.state.rocked = 2.5 + (1 - this.profiles[defender].chin) * 1.5
      this.state[defender] = r.state
      this.state[attacker] = creditAttacker(this.state[attacker], power, b.clean, blocked)
    }

    if (blocked) {
      this.bursts.push({ pos, dir, strength: 0.4 })
      this.shake = Math.min(1, this.shake + 0.15)
      this.body[defender].kick(hitKick(kind, hand, rnd), 0.25)
      this.body[attacker].kick(recoilKick(hand), 0.6 + power * 0.4)
      this.loco.push(defender, -0.3 * power, 0)
      this.freeze(0.025)
    } else if (!landed) {
      this.body[attacker].kick(whiffKick(kind, hand), 0.6 + power * 0.6)
      this.body[attacker].loosen(0.55, 0.4)
    } else {
      const ko = reaction === 'knockdown'
      const k = b.clean ? 1 : 0.45
      this.bursts.push({ pos, dir, strength: ko ? 1.6 : 0.5 + 0.5 * k })
      this.shake = Math.min(1.2, this.shake + (ko ? 1 : 0.45 * k))
      this.hurt[defender] = k
      this.body[defender].kick(hitKick(kind, hand, rnd), ko ? 1.6 : (0.6 + power * 0.6) * k)
      this.loco.push(defender, -(0.5 + power * 0.9) * k, kind === 'hook' ? (hand === 'lead' ? 0.4 : -0.4) * k : 0)
      this.freeze(ko ? 0.14 : (0.03 + 0.06 * power) * k + (b.note === 'counter' ? 0.03 : 0), ko ? 0.45 : 0)
      this.jolt = { who: defender, dir: hand === 'lead' ? 1 : -1 }
      if ((power >= 0.6 && b.clean) || ko || b.note === 'counter') {
        this.punch = Math.min(1, this.punch + (ko ? 1 : power * 0.7))
        this.focus.copy(pos)
      }
    }
    this.kickDir.copy(dir)
    this.cue(attacker, reaction)
    this.emit({ attacker, move, reaction, power, clean: b.clean, note: b.note })
  }
}
