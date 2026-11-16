// ring geometry for footwork: rope distances, corners, and who is trapped
// AGENTS: RING_HALF must match Ring.tsx.

export type XZ = [x: number, z: number]

export const RING_HALF = 3.6
export const ROPE_PAD = 0.08
const CORNER_T = 0.9
const ROPE_T = 0.35

/** where each robot sits between rounds: red corner front-left, blue back-right. */
export const CORNER_SEATS: XZ[] = [
  [-2.85, 2.85],
  [2.85, -2.85],
]

/** neutral corners, where the standing fighter waits during a knockdown. */
export const NEUTRAL_CORNERS: XZ[] = [
  [2.6, 2.6],
  [-2.6, -2.6],
]

export interface RingInfo {
  /** distance from the body edge to the nearest rope */
  ropeDist: number
  /** points inward from that rope */
  ropeNormal: XZ
  cornerDist: number
  cornered: boolean
  onRopes: boolean
}

export const ringLimit = (radius: number) => RING_HALF - radius - ROPE_PAD

export function clampToRing(x: number, z: number, radius: number): XZ {
  const l = ringLimit(radius)
  return [Math.min(l, Math.max(-l, x)), Math.min(l, Math.max(-l, z))]
}

export function ringInfo(x: number, z: number, radius: number): RingInfo {
  const l = ringLimit(radius)
  const dx = l - Math.abs(x)
  const dz = l - Math.abs(z)
  const alongX = dx < dz
  const ropeDist = Math.max(0, Math.min(dx, dz))
  const ropeNormal: XZ = alongX ? [-Math.sign(x) || 1, 0] : [0, -Math.sign(z) || 1]
  return {
    ropeDist,
    ropeNormal,
    cornerDist: Math.hypot(Math.max(0, dx), Math.max(0, dz)),
    cornered: dx < CORNER_T && dz < CORNER_T,
    onRopes: ropeDist < ROPE_T,
  }
}

/** on the ropes with the opponent between self and the ring centre. */
export function trapped(self: XZ, opp: XZ, radius: number): boolean {
  const info = ringInfo(self[0], self[1], radius)
  if (!info.onRopes && !info.cornered) return false
  const tx = opp[0] - self[0]
  const tz = opp[1] - self[1]
  const len = Math.hypot(tx, tz) || 1
  const cx = -self[0]
  const cz = -self[1]
  const clen = Math.hypot(cx, cz) || 1
  return (tx * cx + tz * cz) / (len * clen) > 0.5
}

/** which way along the nearest rope is open: +1 is the rope tangent rotated left of the inward normal. */
export function escapeDir(self: XZ, opp: XZ, radius: number): -1 | 1 {
  const { ropeNormal: n } = ringInfo(self[0], self[1], radius)
  const tx = -n[1]
  const tz = n[0]
  const l = ringLimit(radius)
  // room along the tangent in each direction, minus a penalty for running into the opponent
  const room = (s: number) => {
    const along = (self[0] * tx + self[1] * tz) * s
    const toOpp = ((opp[0] - self[0]) * tx + (opp[1] - self[1]) * tz) * s
    return l - along - (toOpp > 0 ? 1.5 / (toOpp + 0.5) : 0)
  }
  return room(1) >= room(-1) ? 1 : -1
}

/** free distance behind a fighter along its facing, before the ropes. */
export function backroom(x: number, z: number, rotY: number, radius: number): number {
  const bx = -Math.sin(rotY)
  const bz = -Math.cos(rotY)
  const l = ringLimit(radius)
  const hit = (p: number, d: number) => (Math.abs(d) < 1e-6 ? Infinity : d > 0 ? (l - p) / d : (-l - p) / d)
  return Math.max(0, Math.min(hit(x, bx), hit(z, bz)))
}
