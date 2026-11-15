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
// - fwd/side move the body in its own frame; drop lowers the hips; fall tips
//   the whole robot backward around its feet.

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
  | 'slip'
  | 'duck'
  | 'stepIn'
  | 'stepBack'
  | 'stagger'
  | 'bodyFold'
  | 'knockdown'
  | 'taunt'
  | 'victory'

export interface MoveDef {
  label: string
  /** seconds */
  dur: number
  keys: [u: number, pose: Partial<Pose>][]
  /** when the strike lands, as a fraction of dur */
  hit?: { at: number; target: 'head' | 'body' }
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

export const MOVES: Record<MoveName, MoveDef> = {
  jab: {
    label: 'Jab',
    dur: 0.42,
    hit: { at: 0.38, target: 'head' },
    keys: [
      [0.15, { lead: [-1.2, -0.1, 0.15], leadElbow: -1.2, yaw: -0.2 }],
      [0.38, { lead: [-1.58, -0.12, 0.05], leadElbow: -0.05, yaw: -0.35, fwd: 0.22, headYaw: 0.25 }],
      [0.65, { lead: [-1.3, -0.1, 0.1], leadElbow: -0.9, fwd: 0.12 }],
    ],
  },
  cross: {
    label: 'Cross',
    dur: 0.5,
    hit: { at: 0.42, target: 'head' },
    keys: [
      [0.15, { yaw: -0.3, rear: [-1.0, -0.2, 0.1], rearElbow: -1.6, drop: 0.14 }],
      [0.42, { yaw: 0.55, rear: [-1.6, -0.3, 0], rearElbow: -0.05, fwd: 0.3, pitch: 0.15, headYaw: -0.3 }],
      [0.68, { yaw: 0.3, rear: [-1.3, -0.2, 0.1], rearElbow: -1.0, fwd: 0.18 }],
    ],
  },
  hook: {
    label: 'Hook',
    dur: 0.55,
    hit: { at: 0.47, target: 'head' },
    keys: [
      [0.2, { yaw: -0.5, lead: [-0.3, 0.3, 1.3], leadElbow: -1.5, drop: 0.14 }],
      [0.47, { yaw: 0.45, lead: [-0.25, -0.85, 1.35], leadElbow: -1.45, fwd: 0.15, roll: 0.1 }],
      [0.72, { yaw: 0.3, lead: [-0.3, -0.6, 1.1], leadElbow: -1.5 }],
    ],
  },
  uppercut: {
    label: 'Uppercut',
    dur: 0.6,
    hit: { at: 0.5, target: 'head' },
    keys: [
      [0.25, { drop: 0.38, pitch: 0.3, yaw: 0.2, rear: [-0.45, -0.2, 0.15], rearElbow: -1.9 }],
      [0.5, { drop: 0, pitch: -0.15, yaw: 0.45, rear: [-1.55, -0.35, 0.05], rearElbow: -1.75, fwd: 0.25, headPitch: -0.1 }],
      [0.75, { rear: [-1.6, -0.2, 0.1], rearElbow: -1.6, pitch: -0.1 }],
    ],
  },
  body: {
    label: 'Body shot',
    dur: 0.55,
    hit: { at: 0.47, target: 'body' },
    keys: [
      [0.2, { drop: 0.28, pitch: 0.2, yaw: -0.4, lead: [-0.2, 0.2, 1.0], leadElbow: -1.5, side: 0.1 }],
      [0.47, { drop: 0.32, pitch: 0.3, yaw: 0.4, lead: [0.15, -0.8, 1.05], leadElbow: -1.4, fwd: 0.2 }],
      [0.72, { drop: 0.2, pitch: 0.15 }],
    ],
  },
  overhand: {
    label: 'Overhand',
    dur: 0.7,
    hit: { at: 0.56, target: 'head' },
    keys: [
      [0.25, { yaw: -0.2, rear: [-2.6, -0.1, 0.5], rearElbow: -1.2, drop: 0.05 }],
      [0.56, { yaw: 0.6, pitch: 0.3, rear: [-1.35, -0.45, 0.4], rearElbow: -0.4, fwd: 0.3, drop: 0.22 }],
      [0.8, { yaw: 0.35, pitch: 0.15, rear: [-1.2, -0.3, 0.2], rearElbow: -1.0 }],
    ],
  },
  feint: {
    label: 'Feint',
    dur: 0.35,
    keys: [[0.4, { lead: [-1.3, -0.1, 0.1], leadElbow: -0.9, fwd: 0.1, drop: 0.14 }]],
  },
  block: {
    label: 'Block',
    dur: 0.6,
    keys: [
      [0.2, { ...highGuard, fwd: -0.06 }],
      [0.55, { ...highGuard, fwd: -0.16 }],
    ],
  },
  slip: {
    label: 'Slip',
    dur: 0.5,
    keys: [
      [0.3, { roll: 0.35, side: -0.3, drop: 0.16, headYaw: 0.2 }],
      [0.6, { roll: 0.3, side: -0.25, drop: 0.14 }],
    ],
  },
  duck: {
    label: 'Duck',
    dur: 0.6,
    keys: [
      [0.3, { drop: 0.5, pitch: 0.45, headPitch: 0.25, lead: [-1.2, -0.25, 0.1], leadElbow: -2.2, rear: [-1.2, -0.25, 0.1], rearElbow: -2.2 }],
      [0.6, { drop: 0.45, pitch: 0.4, side: 0.15 }],
    ],
  },
  stepIn: {
    label: 'Step in',
    dur: 0.45,
    keys: [[0.5, { fwd: 0.35, drop: 0.14 }]],
  },
  stepBack: {
    label: 'Step back',
    dur: 0.5,
    keys: [[0.5, { fwd: -0.4, pitch: -0.05 }]],
  },
  stagger: {
    label: 'Stagger',
    dur: 0.8,
    keys: [
      [0.15, { pitch: -0.4, headPitch: -0.6, headYaw: 0.4, fwd: -0.35, roll: -0.15, lead: [-0.6, 0, 0.5], leadElbow: -0.8, rear: [-0.5, 0, 0.45], rearElbow: -0.7 }],
      [0.45, { pitch: -0.15, fwd: -0.45, headPitch: -0.2, drop: 0.18 }],
    ],
  },
  bodyFold: {
    label: 'Body fold',
    dur: 0.85,
    keys: [
      [0.15, { pitch: 0.5, drop: 0.28, fwd: -0.2, headPitch: 0.3, lead: [-0.7, -0.3, 0.1], leadElbow: -2.0, rear: [-0.7, -0.3, 0.1], rearElbow: -2.0 }],
      [0.5, { pitch: 0.35, drop: 0.22, fwd: -0.3 }],
    ],
  },
  knockdown: {
    label: 'Knockdown',
    dur: 3.6,
    keys: [
      [0.05, { pitch: -0.5, headPitch: -0.7, fwd: -0.3, lead: [-0.5, 0, 0.6], leadElbow: -0.4, rear: [-0.4, 0, 0.6], rearElbow: -0.3 }],
      [0.18, { fall: -1.5, fwd: -0.5, drop: 0, pitch: 0, headPitch: -0.3, lead: [-2.4, 0, 0.9], leadElbow: -0.2, rear: [-2.6, 0, 0.9], rearElbow: -0.2 }],
      [0.55, { fall: -1.5, fwd: -0.5, drop: 0, pitch: 0, headPitch: -0.1, lead: [-2.5, 0, 0.9], leadElbow: -0.3, rear: [-2.6, 0, 0.9], rearElbow: -0.3 }],
      [0.75, { fall: -0.5, drop: 0.6, pitch: 0.5, fwd: -0.4, lead: [-0.4, 0, 0.4], leadElbow: -0.6, rear: [-0.4, 0, 0.4], rearElbow: -0.6 }],
      [0.9, { drop: 0.22, fwd: -0.3 }],
    ],
  },
  taunt: {
    label: 'Taunt',
    dur: 1.6,
    keys: [
      [0.2, { yaw: 0, pitch: -0.25, headPitch: -0.25, lead: [-0.35, 0, 1.2], leadElbow: -0.5, rear: [-0.35, 0, 1.2], rearElbow: -0.5 }],
      [0.45, { yaw: 0, pitch: -0.2, headPitch: -0.2, lead: [-0.5, 0, 1.25], leadElbow: -1.6, rear: [-0.5, 0, 1.25], rearElbow: -1.6 }],
      [0.7, { yaw: 0, pitch: -0.25, headPitch: -0.25, lead: [-0.35, 0, 1.2], leadElbow: -0.5, rear: [-0.35, 0, 1.2], rearElbow: -0.5 }],
    ],
  },
  victory: {
    label: 'Victory',
    dur: 2.6,
    keys: [
      [0.2, { yaw: 0, pitch: -0.15, headPitch: -0.35, lead: [-2.9, 0, 0.35], leadElbow: -0.15, rear: [-2.9, 0, 0.35], rearElbow: -0.15 }],
      [0.85, { yaw: 0, pitch: -0.15, headPitch: -0.35, lead: [-2.9, 0, 0.35], leadElbow: -0.15, rear: [-2.9, 0, 0.35], rearElbow: -0.15 }],
    ],
  },
}

const ease = (x: number) => x * x * (3 - 2 * x)

function full(p: Partial<Pose>): Pose {
  return { ...GUARD, ...p }
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

/** Pose at progress u (0..1) through a move; starts and ends in guard. */
export function samplePose(move: MoveDef, u: number): Pose {
  const keys: [number, Pose][] = [[0, GUARD], ...move.keys.map(([k, p]) => [k, full(p)] as [number, Pose]), [1, GUARD]]
  for (let i = 0; i < keys.length - 1; i++) {
    const [u0, p0] = keys[i]
    const [u1, p1] = keys[i + 1]
    if (u <= u1) return blendPose(p0, p1, ease((u - u0) / (u1 - u0 || 1)))
  }
  return GUARD
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
