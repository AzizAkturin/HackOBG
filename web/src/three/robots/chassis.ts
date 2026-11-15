import type { Part, V3 } from './parts'
import { bulwark } from './designs/bulwark'
import { crash } from './designs/crash'
import { gyro } from './designs/gyro'
import { halo } from './designs/halo'
import { junker } from './designs/junker'
import { kettle } from './designs/kettle'
import { lantern } from './designs/lantern'
import { orbit } from './designs/orbit'
import { pebble } from './designs/pebble'
import { sable } from './designs/sable'
import { silverback } from './designs/silverback'
import { stilt } from './designs/stilt'
import { voxel } from './designs/voxel'

export const TORSO_Y = 0.3
/** equal across chassis so punches land at the same reach */
export const ARM_UPPER = 0.6

export interface Rig {
  scale: number
  /** pelvis height; for legged chassis this is thigh + shin */
  hip: number
  thigh: number
  hipX: number
  /** lead shoulder pivot relative to the torso; the rear one is mirrored */
  shoulder: V3
  neck: V3
  /** wheel radius for chassis that roll instead of walk */
  wheel?: number
}

export interface Finish {
  metalness: number
  /** added to the brand's roughness */
  roughness: number
  clearcoat: number
  grime: boolean
}

/** lead side, outward = +x; keep the fist near y = -0.9 on the elbow or reach breaks */
export interface ArmParts {
  shoulder: Part[]
  elbow: Part[]
}

export interface Chassis {
  label: string
  blurb: string
  rig: Rig
  finish: Finish
  pelvis: Part[]
  torso: Part[]
  head: Part[]
  arm: ArmParts
  /** set when the rear arm isn't a mirror of the lead */
  rearArm?: ArmParts
  /** lead leg, outward = +x, foot sole at y = 0 */
  leg?: { thigh: Part[]; knee: Part[]; foot: Part[] }
  wheel?: Part[]
}

export const chassis = { bulwark, sable, halo, stilt, crash, gyro, junker, silverback, pebble, kettle, lantern, voxel, orbit } satisfies Record<string, Chassis>

export type ChassisKey = keyof typeof chassis
