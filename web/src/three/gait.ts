// planted two-bone legs under a turning, shifting pelvis, plus strides, a lateral shuffle and pivot steps

export interface Motion {
  /** local forward and leftward speed, world units per second */
  vf: number
  vs: number
  /** turn rate, radians per second */
  turn: number
  /** stride phase, radians */
  phase: number
}

export interface LegRig {
  hip: number
  thigh: number
  hipX: number
}

export interface Pelvis {
  drop: number
  /** pelvis shift in model units; feet stay planted while still */
  fwd: number
  side: number
  /** hips turn into punches; the legs follow, the feet stay put */
  hipYaw: number
  /** -1 on the back leg to +1 on the front leg */
  weight: number
}

export interface LegAngles {
  /** thigh mount in the body frame; rotation order YZX */
  x: number
  y: number
  z: number
  thighX: number
  thighY: number
  thighZ: number
  knee: number
  foot: number
  /** in the leg's own (unmirrored) frame; the rig flips these for the mirrored leg */
  footY: number
  footZ: number
}

export const LEG_Z = 0.14
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

/** thigh and knee angles that put the sole at (dx, -h, dz) from the hip, knee bending forward. */
export function solveLeg(h: number, dx: number, dz: number, l1: number, l2: number): { thighX: number; thighZ: number; knee: number } {
  const thighZ = Math.atan2(dx, h)
  const hv = Math.hypot(h, dx)
  const d = clamp(Math.hypot(hv, dz), Math.abs(l1 - l2) + 1e-3, (l1 + l2) * 0.995)
  const lean = Math.atan2(dz, hv)
  const hipBend = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1))
  const knee = Math.PI - Math.acos(clamp((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2), -1, 1))
  return { thighX: -lean - hipBend, thighZ, knee }
}

export function legAngles(m: Motion, rig: LegRig, pelvis: Pelvis): [LegAngles, LegAngles] {
  const speed = Math.hypot(m.vf, m.vs)
  const moving = clamp(speed / 0.5, 0, 1)
  const ampF = clamp(m.vf / 1.5, -1, 1) * 0.45
  const ampS = clamp(m.vs / 1.2, -1, 1) * 0.22
  const pivot = clamp(Math.abs(m.turn) / 4, 0, 1) * (1 - moving)
  const leader = m.vs >= 0 ? 0 : 1
  const { hipYaw } = pelvis
  const cy = Math.cos(hipYaw)
  const sy = Math.sin(hipYaw)
  const l1 = rig.thigh
  const l2 = rig.hip - rig.thigh
  return [0, 1].map((leg) => {
    const bx = leg === 0 ? rig.hipX : -rig.hipX
    const bz = leg === 0 ? LEG_Z : -LEG_Z
    // the hips turn and shift; the feet only follow while travelling
    const mx = bx * cy + bz * sy + pelvis.side
    const mz = -bx * sy + bz * cy + pelvis.fwd
    const fx = bx + (mx - bx) * moving
    const fz = bz + (mz - bz) * moving
    const drop = Math.max(0, pelvis.drop + 0.12 * pelvis.weight * (leg === 0 ? 1 : -1))
    const h = rig.hip - drop
    const wx = fx - mx
    const wz = fz - mz
    const lx = wx * cy - wz * sy
    const lz = wx * sy + wz * cy
    const base = solveLeg(h, lx, lz, l1, l2)

    const ph = m.phase + leg * Math.PI
    const sw = Math.sin(ph)
    const lead = leg === leader
    const swing = sw * ampF
    const lateral = ampS * (lead ? Math.max(0, sw) : Math.max(0, Math.sin(ph - 0.9)) * 0.7)
    const lift = Math.max(0, -sw) * Math.abs(ampF) * 1.4 + (lead ? Math.max(0, sw) * Math.abs(ampS) * 1.6 : 0) + Math.max(0, sw) * pivot * 0.5
    const thighX = base.thighX + swing - lift * 0.35
    const knee = base.knee + lift
    const thighZ = base.thighZ + lateral
    // the rear heel turns out as the hips open
    const plant = leg === 0 ? -hipYaw : -hipYaw + 0.8 * Math.max(0, hipYaw)
    return {
      x: mx,
      y: h,
      z: mz,
      thighX,
      thighY: hipYaw + sw * pivot * 0.15 * Math.sign(m.turn),
      thighZ,
      knee,
      foot: -(thighX + knee),
      footY: plant * (1 - moving),
      footZ: -thighZ,
    }
  }) as [LegAngles, LegAngles]
}

/** how far the hips turn for a torso yaw, measured from the guard's yaw. */
export const hipYawFor = (yaw: number, guardYaw: number) => clamp(0.45 * (yaw - guardYaw), -0.3, 0.3)

/** wheel heading relative to the body, folded so the wheel never turns more than 90 degrees; dir is roll sign. */
export function wheelHeading(m: Motion): { yaw: number; dir: 1 | -1 } {
  if (Math.hypot(m.vf, m.vs) < 0.05) return { yaw: 0, dir: 1 }
  const a = Math.atan2(m.vs, m.vf)
  if (a > Math.PI / 2) return { yaw: a - Math.PI, dir: -1 }
  if (a < -Math.PI / 2) return { yaw: a + Math.PI, dir: -1 }
  return { yaw: a, dir: 1 }
}
