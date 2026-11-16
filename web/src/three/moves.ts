// Keyframed move library. See docs/moves.md for the catalog and how moves
// map to the live event protocol.
//
// Conventions (robot faces local +z, orthodox stance: lead = left arm):
// - shoulder [x, y, z]: x < 0 raises the arm forward, y < 0 swings it inward
//   across the body, z > 0 lifts it out to the side. The rear arm is mirrored
//   by the rig, so both arms use the same signs.
// - elbow: negative bends the forearm forward/up.
// - torso yaw > 0 turns the rear shoulder forward; pitch > 0 leans forward;
//   roll > 0 leans toward the rear side.
// - fwd/side shift the pelvis in its own frame (feet stay planted); drop lowers
//   the hips; fall tips the whole robot backward around its feet.
// - a key's ease shapes the segment that arrives at that key.

export interface Pose {
  fwd: number
  side: number
  drop: number
  fall: number
  yaw: number
  pitch: number
  roll: number
  headPitch: number
  headYaw: number
  lead: [number, number, number]
  leadElbow: number
  rear: [number, number, number]
  rearElbow: number
}

export const GUARD: Pose = {
  fwd: 0,
  side: 0,
  drop: 0.1,
  fall: 0,
  yaw: -0.15,
  pitch: 0.08,
  roll: 0,
  headPitch: 0.12,
  headYaw: 0.15,
  lead: [-1.05, -0.15, 0.15],
  leadElbow: -1.8,
  rear: [-0.95, -0.25, 0.1],
  rearElbow: -1.95,
}

export type MoveName =
  | 'jab'
  | 'cross'
  | 'hook'
  | 'uppercut'
  | 'body'
  | 'overhand'
  | 'feint'
  | 'block'
  | 'coverUp'
  | 'slip'
  | 'duck'
  | 'stepIn'
  | 'stepBack'
  | 'stagger'
  | 'bodyFold'
  | 'wobble'
  | 'kneel'
  | 'knockdown'
  | 'down'
  | 'clinch'
  | 'taunt'
  | 'victory'

export type Ease = 'linear' | 'smooth' | 'in' | 'out' | 'snap' | 'back' | 'anticipate'

const BACK = 1.3
export const EASES: Record<Ease, (x: number) => number> = {
  linear: (x) => x,
  smooth: (x) => x * x * (3 - 2 * x),
  in: (x) => x * x * x,
  out: (x) => 1 - (1 - x) ** 3,
  snap: (x) => 1 - (1 - x) ** 5,
  back: (x) => 1 + (BACK + 1) * (x - 1) ** 3 + BACK * (x - 1) ** 2,
  anticipate: (x) => (BACK + 1) * x ** 3 - BACK * x ** 2,
}

export type HitKind = 'straight' | 'hook' | 'uppercut' | 'overhand' | 'body'
export type Hand = 'lead' | 'rear'
export type RangeBand = 'clinch' | 'inside' | 'punching' | 'outside' | 'far'

export type Key = [u: number, pose: Partial<Pose>, ease?: Ease]

export interface MoveDef {
  label: string
  /** seconds */
  dur: number
  keys: Key[]
  /** when the strike lands, as a fraction of dur; always matches a key's u */
  hit?: { at: number; target: 'head' | 'body'; kind: HitKind; hand: Hand; power: number }
  /** ease of the final segment back to guard */
  end?: Ease
  /** 0..1 how much per-throw variation applies */
  vary?: number
  /** may be thrown off the other hand */
  mirror?: boolean
  /** kinetic chain: body leads the arms by this much u, the head trails by half */
  chain?: number
  /** u where the defender can first read the move */
  tell?: number
  /** u after which the fighter is free to act again */
  recover?: number
  /** fighter displacement in model units, eased over [from, to] of u */
  root?: { fwd?: number; side?: number; from?: number; to?: number }
  /** range bands the move makes sense at */
  range?: RangeBand[]
  /** stamina cost */
  cost?: number
  /** hold the last key instead of returning to guard (stays down, clinch) */
  hold?: boolean
}

const highGuard: Partial<Pose> = {
  lead: [-1.3, -0.3, 0.05],
  leadElbow: -2.35,
  rear: [-1.3, -0.3, 0.05],
  rearElbow: -2.35,
  headPitch: 0.35,
  pitch: 0.2,
  drop: 0.14,
}

const flared: Partial<Pose> = { lead: [-0.6, 0, 0.5], leadElbow: -0.8, rear: [-0.5, 0, 0.45], rearElbow: -0.7 }

const LONG: RangeBand[] = ['punching', 'outside']
const SHORT: RangeBand[] = ['inside', 'punching']

export const MOVES: Record<MoveName, MoveDef> = {
  jab: {
    label: 'Jab',
    dur: 0.42,
    hit: { at: 0.38, target: 'head', kind: 'straight', hand: 'lead', power: 0.35 },
    vary: 1,
    chain: 0.03,
    tell: 0.05,
    recover: 0.6,
    range: LONG,
    cost: 0.02,
    keys: [
      [0.15, { lead: [-1.2, -0.1, 0.15], leadElbow: -1.2, yaw: -0.2 }, 'out'],
      [0.38, { lead: [-1.58, -0.12, 0.05], leadElbow: -0.05, yaw: -0.35, fwd: 0.12, headYaw: 0.25 }, 'in'],
      [0.48, { lead: [-1.56, -0.12, 0.05], leadElbow: -0.12, yaw: -0.33, fwd: 0.12 }, 'linear'],
      [0.7, { lead: [-1.3, -0.1, 0.1], leadElbow: -0.9, fwd: 0.06 }, 'out'],
    ],
  },
  cross: {
    label: 'Cross',
    dur: 0.5,
    hit: { at: 0.42, target: 'head', kind: 'straight', hand: 'rear', power: 0.6 },
    vary: 1,
    chain: 0.05,
    tell: 0.08,
    recover: 0.62,
    range: LONG,
    cost: 0.035,
    keys: [
      [0.15, { yaw: -0.3, rear: [-1.0, -0.2, 0.1], rearElbow: -1.6, drop: 0.14 }, 'out'],
      [0.42, { yaw: 0.55, rear: [-1.6, -0.3, 0], rearElbow: -0.05, fwd: 0.12, pitch: 0.15, headYaw: -0.3 }, 'in'],
      [0.5, { yaw: 0.6, rear: [-1.58, -0.3, 0], rearElbow: -0.1, fwd: 0.12, pitch: 0.15, headYaw: -0.3 }, 'linear'],
      [0.72, { yaw: 0.25, rear: [-1.3, -0.2, 0.1], rearElbow: -1.0, fwd: 0.06 }, 'back'],
    ],
  },
  hook: {
    label: 'Hook',
    dur: 0.58,
    hit: { at: 0.47, target: 'head', kind: 'hook', hand: 'lead', power: 0.8 },
    vary: 1,
    mirror: true,
    chain: 0.05,
    tell: 0.1,
    recover: 0.68,
    range: SHORT,
    cost: 0.045,
    keys: [
      [0.22, { yaw: -0.55, lead: [-0.3, 0.35, 1.3], leadElbow: -1.5, drop: 0.16 }, 'anticipate'],
      [0.47, { yaw: 0.45, lead: [-0.25, -0.85, 1.35], leadElbow: -1.45, fwd: 0.06, roll: 0.1 }, 'in'],
      [0.58, { yaw: 0.62, lead: [-0.3, -1.05, 1.2], leadElbow: -1.5, roll: 0.12 }, 'out'],
      [0.78, { yaw: 0.25, lead: [-0.3, -0.6, 1.0], leadElbow: -1.6 }, 'back'],
    ],
  },
  uppercut: {
    label: 'Uppercut',
    dur: 0.6,
    hit: { at: 0.5, target: 'head', kind: 'uppercut', hand: 'rear', power: 0.85 },
    vary: 1,
    mirror: true,
    chain: 0.05,
    tell: 0.12,
    recover: 0.7,
    range: SHORT,
    cost: 0.045,
    keys: [
      [0.25, { drop: 0.38, pitch: 0.3, yaw: 0.2, rear: [-0.45, -0.2, 0.15], rearElbow: -1.9 }, 'smooth'],
      [0.5, { drop: 0, pitch: -0.15, yaw: 0.45, rear: [-1.55, -0.35, 0.05], rearElbow: -1.75, fwd: 0.1, headPitch: -0.1 }, 'in'],
      [0.75, { rear: [-1.6, -0.2, 0.1], rearElbow: -1.6, pitch: -0.1 }, 'out'],
    ],
  },
  body: {
    label: 'Body shot',
    dur: 0.55,
    hit: { at: 0.47, target: 'body', kind: 'body', hand: 'lead', power: 0.6 },
    vary: 1,
    mirror: true,
    chain: 0.04,
    tell: 0.1,
    recover: 0.68,
    range: SHORT,
    cost: 0.04,
    keys: [
      [0.2, { drop: 0.28, pitch: 0.2, yaw: -0.4, lead: [-0.2, 0.2, 1.0], leadElbow: -1.5, side: 0.06 }, 'smooth'],
      [0.47, { drop: 0.32, pitch: 0.3, yaw: 0.4, lead: [0.15, -0.8, 1.05], leadElbow: -1.4, fwd: 0.08 }, 'in'],
      [0.72, { drop: 0.2, pitch: 0.15 }, 'out'],
    ],
  },
  overhand: {
    label: 'Overhand',
    dur: 0.7,
    hit: { at: 0.56, target: 'head', kind: 'overhand', hand: 'rear', power: 1 },
    vary: 1,
    chain: 0.06,
    tell: 0.12,
    recover: 0.78,
    range: LONG,
    cost: 0.06,
    keys: [
      [0.25, { yaw: -0.2, rear: [-2.6, -0.1, 0.5], rearElbow: -1.2, drop: 0.05 }, 'out'],
      [0.56, { yaw: 0.6, pitch: 0.3, rear: [-1.35, -0.45, 0.4], rearElbow: -0.4, fwd: 0.12, drop: 0.22 }, 'in'],
      [0.8, { yaw: 0.35, pitch: 0.15, rear: [-1.2, -0.3, 0.2], rearElbow: -1.0 }, 'out'],
    ],
  },
  feint: {
    label: 'Feint',
    dur: 0.35,
    vary: 1,
    mirror: true,
    tell: 0.05,
    recover: 0.5,
    cost: 0.005,
    keys: [[0.4, { lead: [-1.3, -0.1, 0.1], leadElbow: -0.9, fwd: 0.05, drop: 0.14 }, 'snap']],
  },
  block: {
    label: 'Block',
    dur: 0.6,
    vary: 0.5,
    recover: 0.6,
    keys: [
      [0.2, { ...highGuard, fwd: -0.03 }, 'snap'],
      [0.55, { ...highGuard, fwd: -0.06 }, 'linear'],
    ],
  },
  coverUp: {
    label: 'Cover up',
    dur: 1.2,
    vary: 0.5,
    recover: 0.8,
    keys: [
      [0.1, { ...highGuard, drop: 0.24, pitch: 0.3, headPitch: 0.45 }, 'snap'],
      [0.85, { ...highGuard, drop: 0.26, pitch: 0.32, headPitch: 0.45, side: 0.04 }, 'smooth'],
    ],
  },
  slip: {
    label: 'Slip',
    dur: 0.5,
    vary: 1,
    mirror: true,
    recover: 0.55,
    keys: [
      [0.3, { roll: 0.35, side: -0.2, drop: 0.16, headYaw: 0.2 }, 'snap'],
      [0.6, { roll: 0.3, side: -0.17, drop: 0.14 }, 'linear'],
    ],
  },
  duck: {
    label: 'Duck',
    dur: 0.6,
    vary: 1,
    recover: 0.6,
    keys: [
      [0.3, { drop: 0.5, pitch: 0.45, headPitch: 0.25, lead: [-1.2, -0.25, 0.1], leadElbow: -2.2, rear: [-1.2, -0.25, 0.1], rearElbow: -2.2 }, 'snap'],
      [0.6, { drop: 0.45, pitch: 0.4, side: 0.1 }, 'smooth'],
    ],
  },
  stepIn: {
    label: 'Step in',
    dur: 0.45,
    vary: 1,
    recover: 0.6,
    root: { fwd: 0.45, from: 0.05, to: 0.6 },
    keys: [[0.5, { fwd: 0.08, pitch: 0.14, drop: 0.14 }, 'out']],
  },
  stepBack: {
    label: 'Step back',
    dur: 0.5,
    vary: 1,
    recover: 0.6,
    root: { fwd: -0.5, from: 0.05, to: 0.6 },
    keys: [[0.5, { fwd: -0.08, pitch: -0.05 }, 'out']],
  },
  stagger: {
    label: 'Stagger',
    dur: 0.8,
    vary: 1,
    recover: 0.7,
    root: { fwd: -0.35, from: 0, to: 0.45 },
    keys: [
      [0.15, { ...flared, drop: 0.16 }, 'snap'],
      [0.45, { drop: 0.18 }, 'out'],
    ],
  },
  bodyFold: {
    label: 'Body fold',
    dur: 0.85,
    vary: 1,
    recover: 0.7,
    root: { fwd: -0.2, from: 0, to: 0.4 },
    keys: [
      [0.15, { drop: 0.28, lead: [-0.7, -0.3, 0.1], leadElbow: -2.0, rear: [-0.7, -0.3, 0.1], rearElbow: -2.0 }, 'snap'],
      [0.5, { drop: 0.22 }, 'out'],
    ],
  },
  wobble: {
    label: 'Wobble',
    dur: 1.4,
    vary: 1,
    mirror: true,
    recover: 0.3,
    keys: [
      [0.25, { drop: 0.3, roll: 0.18, side: 0.06, headPitch: -0.05, headYaw: 0.35, lead: [-0.75, -0.1, 0.3], leadElbow: -1.5, rear: [-0.7, -0.1, 0.3], rearElbow: -1.5 }, 'smooth'],
      [0.6, { drop: 0.24, roll: -0.12, side: -0.05, headPitch: 0.25, headYaw: -0.1, lead: [-0.8, -0.1, 0.3], leadElbow: -1.6, rear: [-0.75, -0.1, 0.3], rearElbow: -1.6 }, 'smooth'],
    ],
  },
  kneel: {
    label: 'Knee touch',
    dur: 2.2,
    keys: [
      [0.12, { drop: 0.85, pitch: 0.55, headPitch: 0.5, lead: [-0.2, 0, 0.35], leadElbow: -0.5, rear: [0.1, 0, 0.3], rearElbow: -0.3 }, 'in'],
      [0.6, { drop: 0.85, pitch: 0.5, headPitch: 0.3, lead: [-0.2, 0, 0.35], leadElbow: -0.5, rear: [0.1, 0, 0.3], rearElbow: -0.3 }, 'linear'],
      [0.85, { drop: 0.3, pitch: 0.2, ...flared }, 'smooth'],
    ],
  },
  knockdown: {
    label: 'Knockdown',
    dur: 3.6,
    root: { fwd: -0.4, from: 0, to: 0.18 },
    keys: [
      [0.05, { pitch: -0.5, headPitch: -0.7, lead: [-0.5, 0, 0.6], leadElbow: -0.4, rear: [-0.4, 0, 0.6], rearElbow: -0.3 }, 'snap'],
      [0.17, { fall: -1.5, drop: 0, pitch: 0, headPitch: -0.3, lead: [-2.4, 0, 0.9], leadElbow: -0.2, rear: [-2.6, 0, 0.9], rearElbow: -0.2 }, 'in'],
      [0.2, { fall: -1.42, drop: 0, pitch: 0.05, headPitch: -0.2, lead: [-2.5, 0, 0.9], leadElbow: -0.3, rear: [-2.6, 0, 0.9], rearElbow: -0.3 }, 'out'],
      [0.23, { fall: -1.5, drop: 0, pitch: 0, headPitch: -0.3, lead: [-2.5, 0, 0.9], leadElbow: -0.3, rear: [-2.6, 0, 0.9], rearElbow: -0.3 }, 'in'],
      [0.55, { fall: -1.5, drop: 0, pitch: 0, headPitch: -0.1, lead: [-2.5, 0, 0.9], leadElbow: -0.3, rear: [-2.6, 0, 0.9], rearElbow: -0.3 }, 'linear'],
      [0.75, { fall: -0.5, drop: 0.6, pitch: 0.5, lead: [-0.4, 0, 0.4], leadElbow: -0.6, rear: [-0.4, 0, 0.4], rearElbow: -0.6 }, 'smooth'],
      [0.9, { drop: 0.22 }, 'out'],
    ],
  },
  down: {
    label: 'Down',
    dur: 1.0,
    hold: true,
    root: { fwd: -0.4, from: 0, to: 0.5 },
    keys: [
      [0.15, { pitch: -0.5, headPitch: -0.7, lead: [-0.5, 0, 0.6], leadElbow: -0.4, rear: [-0.4, 0, 0.6], rearElbow: -0.3 }, 'snap'],
      [0.5, { fall: -1.5, drop: 0, pitch: 0, headPitch: -0.3, lead: [-2.4, 0, 0.9], leadElbow: -0.2, rear: [-2.6, 0, 0.9], rearElbow: -0.2 }, 'in'],
      [0.6, { fall: -1.42, drop: 0, pitch: 0.05, headPitch: -0.2, lead: [-2.5, 0, 0.9], leadElbow: -0.3, rear: [-2.6, 0, 0.9], rearElbow: -0.3 }, 'out'],
      [0.75, { fall: -1.5, drop: 0, pitch: 0, headPitch: 0.1, headYaw: 0.4, lead: [-2.5, 0, 1.1], leadElbow: -0.3, rear: [-2.7, 0, 1.0], rearElbow: -0.4 }, 'in'],
    ],
  },
  clinch: {
    label: 'Clinch',
    dur: 1.0,
    hold: true,
    range: ['clinch'],
    keys: [
      [0.4, { pitch: 0.35, drop: 0.2, headPitch: 0.4, headYaw: 0.5, lead: [-1.35, -0.85, 0.5], leadElbow: -1.1, rear: [-1.25, -0.9, 0.4], rearElbow: -1.2 }, 'out'],
    ],
  },
  taunt: {
    label: 'Taunt',
    dur: 1.6,
    keys: [
      [0.2, { yaw: 0, pitch: -0.25, headPitch: -0.25, lead: [-0.35, 0, 1.2], leadElbow: -0.5, rear: [-0.35, 0, 1.2], rearElbow: -0.5 }, 'back'],
      [0.45, { yaw: 0, pitch: -0.2, headPitch: -0.2, lead: [-0.5, 0, 1.25], leadElbow: -1.6, rear: [-0.5, 0, 1.25], rearElbow: -1.6 }, 'smooth'],
      [0.7, { yaw: 0, pitch: -0.25, headPitch: -0.25, lead: [-0.35, 0, 1.2], leadElbow: -0.5, rear: [-0.35, 0, 1.2], rearElbow: -0.5 }, 'smooth'],
    ],
  },
  victory: {
    label: 'Victory',
    dur: 2.6,
    hold: true,
    keys: [
      [0.2, { yaw: 0, pitch: -0.15, headPitch: -0.35, lead: [-2.9, 0, 0.35], leadElbow: -0.15, rear: [-2.9, 0, 0.35], rearElbow: -0.15 }, 'back'],
      [0.5, { yaw: 0, pitch: -0.1, headPitch: -0.4, lead: [-2.95, 0, 0.45], leadElbow: -0.3, rear: [-2.85, 0, 0.3], rearElbow: -0.1 }, 'smooth'],
      [0.8, { yaw: 0, pitch: -0.15, headPitch: -0.35, lead: [-2.9, 0, 0.35], leadElbow: -0.15, rear: [-2.9, 0, 0.35], rearElbow: -0.15 }, 'smooth'],
    ],
  },
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const lerp3 = (a: number[], b: number[], t: number) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)] as [number, number, number]

export function blendPose(a: Pose, b: Pose, t: number): Pose {
  return {
    fwd: lerp(a.fwd, b.fwd, t),
    side: lerp(a.side, b.side, t),
    drop: lerp(a.drop, b.drop, t),
    fall: lerp(a.fall, b.fall, t),
    yaw: lerp(a.yaw, b.yaw, t),
    pitch: lerp(a.pitch, b.pitch, t),
    roll: lerp(a.roll, b.roll, t),
    headPitch: lerp(a.headPitch, b.headPitch, t),
    headYaw: lerp(a.headYaw, b.headYaw, t),
    lead: lerp3(a.lead, b.lead, t),
    leadElbow: lerp(a.leadElbow, b.leadElbow, t),
    rear: lerp3(a.rear, b.rear, t),
    rearElbow: lerp(a.rearElbow, b.rearElbow, t),
  }
}

/** Swaps lead and rear, working on deltas from guard because guard itself is not symmetric. */
export function mirrorPose(p: Pose): Pose {
  const g = GUARD
  return {
    ...p,
    side: -p.side,
    yaw: 2 * g.yaw - p.yaw,
    roll: 2 * g.roll - p.roll,
    headYaw: 2 * g.headYaw - p.headYaw,
    lead: [g.lead[0] + p.rear[0] - g.rear[0], g.lead[1] + p.rear[1] - g.rear[1], g.lead[2] + p.rear[2] - g.rear[2]],
    rear: [g.rear[0] + p.lead[0] - g.lead[0], g.rear[1] + p.lead[1] - g.lead[1], g.rear[2] + p.lead[2] - g.lead[2]],
    leadElbow: g.leadElbow + p.rearElbow - g.rearElbow,
    rearElbow: g.rearElbow + p.leadElbow - g.leadElbow,
  }
}

export type Offsets = Partial<Record<Exclude<keyof Pose, 'lead' | 'rear'> | 'leadX' | 'rearX' | 'headRoll', number>>

/** Adds additive deltas (springs, sway) on top of a pose. */
export function addPose(p: Pose, d: Offsets, w = 1): Pose {
  return {
    fwd: p.fwd + (d.fwd ?? 0) * w,
    side: p.side + (d.side ?? 0) * w,
    drop: p.drop + (d.drop ?? 0) * w,
    fall: p.fall + (d.fall ?? 0) * w,
    yaw: p.yaw + (d.yaw ?? 0) * w,
    pitch: p.pitch + (d.pitch ?? 0) * w,
    roll: p.roll + (d.roll ?? 0) * w,
    headPitch: p.headPitch + (d.headPitch ?? 0) * w,
    headYaw: p.headYaw + (d.headYaw ?? 0) * w,
    lead: [p.lead[0] + (d.leadX ?? 0) * w, p.lead[1], p.lead[2]],
    leadElbow: p.leadElbow + (d.leadElbow ?? 0) * w,
    rear: [p.rear[0] + (d.rearX ?? 0) * w, p.rear[1], p.rear[2]],
    rearElbow: p.rearElbow + (d.rearElbow ?? 0) * w,
  }
}

export function clampPose(p: Pose): Pose {
  p.leadElbow = Math.min(0, p.leadElbow)
  p.rearElbow = Math.min(0, p.rearElbow)
  p.fall = Math.min(0, Math.max(-1.6, p.fall))
  p.drop = Math.max(0, p.drop)
  return p
}

export interface Variation {
  windup: number
  recover: number
  reach: number
  height: number
  lean: number
  power: number
  jitter: number
}

export const NEUTRAL: Variation = { windup: 1, recover: 1, reach: 1, height: 0, lean: 0, power: 1, jitter: 0 }

/** tempo > 1 is faster, power scales commitment, sloppy (0..1) adds slow recoveries and wild aim */
export function rollVariation(rng: () => number, bias: { tempo?: number; power?: number; sloppy?: number } = {}): Variation {
  const { tempo = 1, power = 1, sloppy = 0 } = bias
  const r = (a: number, b: number) => a + (b - a) * rng()
  return {
    windup: r(0.85, 1.15) / tempo,
    recover: r(0.85, 1.25 + sloppy * 0.3) / tempo,
    reach: r(0.92, 1.08),
    height: r(-0.08, 0.08) * (1 + sloppy),
    lean: r(-0.05, 0.05) * (1 + sloppy),
    power: r(0.85, 1.2) * power,
    jitter: rng(),
  }
}

function effective(def: MoveDef, v: Variation, reduced: boolean): Variation {
  const k = def.vary ?? 0
  const a = reduced ? k * 0.5 : k
  return {
    windup: lerp(1, v.windup, k),
    recover: lerp(1, v.recover, k),
    reach: lerp(1, v.reach, a),
    height: v.height * a,
    lean: v.lean * a,
    power: lerp(1, v.power, a),
    jitter: v.jitter,
  }
}

const pivotOf = (def: MoveDef) => def.hit?.at ?? 0.5

/** Wall-clock length and impact time (seconds from start) for a thrown move. */
export function moveTiming(name: MoveName, v: Variation = NEUTRAL): { dur: number; hitAt?: number; recoverAt: number } {
  const def = MOVES[name]
  const e = effective(def, v, false)
  return timing(def, e)
}

function timing(def: MoveDef, e: Variation) {
  const p = pivotOf(def)
  const pre = def.dur * p * e.windup
  const post = def.dur * (1 - p) * e.recover
  const recU = def.recover ?? 1
  const recoverAt = recU <= p ? def.dur * recU * e.windup : pre + def.dur * (recU - p) * e.recover
  return { dur: pre + post, hitAt: def.hit ? pre : undefined, recoverAt }
}

export interface MoveInstance {
  name: MoveName
  def: MoveDef
  start: number
  dur: number
  hitAt?: number
  recoverAt: number
  from: Pose
  keys: [u: number, pose: Pose, ease: Ease][]
  mirrored: boolean
  hand?: Hand
  windup: number
  recover: number
  chain: number
  reduced: boolean
  /** fraction of root motion already committed */
  rootDone: number
}

const hash = (a: number, b: number) => {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return x - Math.floor(x)
}

const SPARE_EASE: Partial<Record<Ease, Ease>> = { back: 'out', anticipate: 'out' }

function vary(p: Pose, arm: Hand | 'both', e: Variation, beforeHit: boolean): Pose {
  const g = GUARD
  const out = { ...p, lead: [...p.lead] as Pose['lead'], rear: [...p.rear] as Pose['rear'] }
  const scaleArm = (s: 'lead' | 'rear') => {
    const el = s === 'lead' ? 'leadElbow' : 'rearElbow'
    out[s][0] = g[s][0] + (p[s][0] - g[s][0]) * e.reach + (beforeHit ? e.height : 0)
    out[el] = g[el] + (p[el] - g[el]) * e.reach
  }
  if (arm === 'lead' || arm === 'both') scaleArm('lead')
  if (arm === 'rear' || arm === 'both') scaleArm('rear')
  out.yaw = g.yaw + (p.yaw - g.yaw) * e.power
  out.drop = g.drop + (p.drop - g.drop) * e.power
  out.pitch = p.pitch + e.lean
  out.roll = p.roll + e.lean * 0.5
  return out
}

/**
 * Resolves one throw of a move: starts from the current pose, applies variation and mirroring.
 * Channels a key omits drift from the starting pose back to guard over the first half.
 */
export function instantiate(
  name: MoveName,
  start: number,
  from: Pose,
  v: Variation = NEUTRAL,
  opts: { mirror?: boolean; reduced?: boolean } = {},
): MoveInstance {
  const def = MOVES[name]
  const reduced = !!opts.reduced
  const mirrored = !!opts.mirror && !!def.mirror
  const e = effective(def, v, reduced)
  const p = pivotOf(def)
  const hand = def.hit ? (mirrored ? (def.hit.hand === 'lead' ? 'rear' : 'lead') : def.hit.hand) : undefined
  const keys: MoveInstance['keys'] = [[0, from, 'linear']]
  def.keys.forEach(([u0, partial, ease = 'smooth'], k) => {
    const isHit = def.hit && Math.abs(u0 - p) < 1e-6
    const prev = def.keys[k - 1]?.[0] ?? 0
    const next = def.keys[k + 1]?.[0] ?? 1
    const u = isHit ? u0 : Math.min(next - 0.02, Math.max(prev + 0.02, u0 + (hash(e.jitter, k) - 0.5) * 0.06 * (def.vary ?? 0)))
    const carry = blendPose(from, GUARD, EASES.smooth(Math.min(1, u / 0.5)))
    const filled = mirrored ? mirrorPose({ ...mirrorPose(carry), ...partial }) : { ...carry, ...partial }
    const varied = vary(filled, hand ?? 'both', e, u <= p + 1e-6)
    keys.push([u, varied, reduced ? (SPARE_EASE[ease] ?? ease) : ease])
  })
  if (!def.hold) keys.push([1, GUARD, def.end ?? 'out'])
  const t = timing(def, e)
  return {
    name,
    def,
    start,
    dur: t.dur,
    hitAt: t.hitAt,
    recoverAt: t.recoverAt,
    from,
    keys,
    mirrored,
    hand,
    windup: e.windup,
    recover: e.recover,
    chain: reduced ? 0 : (def.chain ?? 0),
    reduced,
    rootDone: 0,
  }
}

/** Maps seconds since start to u, warped so the hit key lands exactly at hitAt. */
export function progress(inst: MoveInstance, s: number): number {
  const { def } = inst
  const p = pivotOf(def)
  const pre = def.dur * p * inst.windup
  return s < pre ? s / (def.dur * inst.windup) : p + (s - pre) / (def.dur * inst.recover)
}

function at(inst: MoveInstance, u: number): Pose {
  const { keys } = inst
  if (u <= 0) return keys[0][1]
  for (let i = 1; i < keys.length; i++) {
    const [u1, p1, ease] = keys[i]
    if (u <= u1) {
      const [u0, p0] = keys[i - 1]
      return blendPose(p0, p1, EASES[ease]((u - u0) / (u1 - u0 || 1)))
    }
  }
  return keys[keys.length - 1][1]
}

/** Pose and follow stiffness for a move at fight time t. Infinity means apply directly. */
export function sampleInstance(inst: MoveInstance, t: number): { pose: Pose; follow: number } {
  const u = progress(inst, t - inst.start)
  const arms = at(inst, u)
  let pose = arms
  if (inst.chain > 0 && u > 0 && u < 1) {
    const body = at(inst, Math.min(1, u + inst.chain))
    const head = at(inst, Math.max(0, u - inst.chain * 0.5))
    pose = { ...body, headPitch: head.headPitch, headYaw: head.headYaw, lead: arms.lead, leadElbow: arms.leadElbow, rear: arms.rear, rearElbow: arms.rearElbow }
  }
  const hit = inst.def.hit
  const striking = hit && u > hit.at - 0.15 && u < hit.at + 0.1
  const snapping = !hit && u < 0.35 && inst.def.keys[0]?.[2] === 'snap'
  const follow = inst.reduced ? 10 : striking || snapping ? Infinity : 30
  return { pose, follow }
}

/** Fraction of a move's root displacement covered by progress u. */
export function rootAt(def: MoveDef, u: number): number {
  const r = def.root
  if (!r) return 0
  const a = r.from ?? 0
  const b = r.to ?? 1
  return EASES.out(Math.min(1, Math.max(0, (u - a) / (b - a || 1))))
}

/** Hands down, loose: used while walking between corners. */
export const WALK: Pose = {
  ...GUARD,
  drop: 0.05,
  yaw: 0,
  pitch: 0.04,
  headPitch: 0.05,
  headYaw: 0,
  lead: [-0.35, 0, 0.18],
  leadElbow: -0.9,
  rear: [-0.35, 0, 0.18],
  rearElbow: -0.9,
}

/** Seated on the corner stool, arms draped along the ropes. */
export const SIT: Pose = {
  ...GUARD,
  drop: 0.78,
  yaw: 0,
  pitch: -0.08,
  roll: 0,
  headPitch: 0.05,
  headYaw: 0,
  lead: [0.25, 0, 1.2],
  leadElbow: -0.35,
  rear: [0.25, 0, 1.2],
  rearElbow: -0.35,
}
