// parts merge into one geometry per joint and material, so a robot is a few dozen draw calls
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export type V3 = [number, number, number]

/** `eye` is the provider's glow; `fw` and lit pips follow the firmware */
export type MatKey = 'armor' | 'trim' | 'mech' | 'chrome' | 'dark' | 'rubber' | 'hazard' | 'rivet' | 'chest' | 'eye' | 'fw' | 'pip1' | 'pip2' | 'pip3'

interface Placed {
  m: MatKey
  p?: V3
  rot?: V3
  s?: V3
}

export type Part = Placed &
  (
    | { k: 'box'; size: V3; r: number }
    | { k: 'cyl'; r: number; h: number; r2?: number; seg: number }
    | { k: 'ball'; r: number }
    | { k: 'torus'; r: number; tube: number }
    | { k: 'tube'; from: V3; to: V3; radius: number; sag: number }
  )

export const box = (m: MatKey, size: V3, p?: V3, rot?: V3, r = 0.05): Part => ({ k: 'box', m, size, p, rot, r })
export const cyl = (m: MatKey, r: number, h: number, p?: V3, rot?: V3, opt: { r2?: number; seg?: number } = {}): Part => ({ k: 'cyl', m, r, h, p, rot, r2: opt.r2, seg: opt.seg ?? 20 })
export const ball = (m: MatKey, r: number, p?: V3, s?: V3): Part => ({ k: 'ball', m, r, p, s })
export const torus = (m: MatKey, r: number, tube: number, p?: V3, rot?: V3): Part => ({ k: 'torus', m, r, tube, p, rot })
export const cone = (m: MatKey, r: number, h: number, p?: V3, rot?: V3): Part => ({ k: 'cyl', m, r, h, p, rot, r2: 0.001, seg: 12 })
export const hose = (m: MatKey, from: V3, to: V3, radius = 0.025, sag = 0.08): Part => ({ k: 'tube', m, from, to, radius, sag })

export const AX_Z: V3 = [Math.PI / 2, 0, 0]
export const AX_X: V3 = [0, 0, Math.PI / 2]

function mirror(part: Part): Part {
  const flip = (v?: V3): V3 | undefined => v && [-v[0], v[1], v[2]]
  const out = { ...part, p: flip(part.p), rot: part.rot && ([part.rot[0], -part.rot[1], -part.rot[2]] as V3) }
  return out.k === 'tube' ? { ...out, from: flip(out.from)!, to: flip(out.to)! } : out
}

export const sym = (...parts: Part[]): Part[] => parts.flatMap((p) => [p, mirror(p)])

function shape(part: Part): THREE.BufferGeometry {
  switch (part.k) {
    case 'box': {
      const r = Math.min(part.r, Math.min(...part.size) / 2 - 0.002)
      return new RoundedBoxGeometry(...part.size, 3, Math.max(r, 0.001))
    }
    case 'cyl':
      return new THREE.CylinderGeometry(part.r2 ?? part.r, part.r, part.h, part.seg)
    case 'ball':
      return new THREE.SphereGeometry(part.r, 24, 14)
    case 'torus':
      return new THREE.TorusGeometry(part.r, part.tube, 8, 28)
    case 'tube': {
      const a = new THREE.Vector3(...part.from)
      const b = new THREE.Vector3(...part.to)
      const mid = a.clone().add(b).multiplyScalar(0.5)
      mid.y -= part.sag
      return new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 10, part.radius, 6)
    }
  }
}

const tmp = new THREE.Matrix4()
const quat = new THREE.Quaternion()
const euler = new THREE.Euler()

export type Merged = [MatKey, THREE.BufferGeometry][]

export function mergeParts(parts: Part[]): Merged {
  const groups = new Map<MatKey, THREE.BufferGeometry[]>()
  for (const part of parts) {
    const raw = shape(part)
    // RoundedBoxGeometry is non-indexed and mergeGeometries needs all or none indexed
    const g = raw.index ? raw.toNonIndexed() : raw
    if (g !== raw) raw.dispose()
    quat.setFromEuler(euler.set(...(part.rot ?? [0, 0, 0])))
    tmp.compose(new THREE.Vector3(...(part.p ?? [0, 0, 0])), quat, new THREE.Vector3(...(part.s ?? [1, 1, 1])))
    g.applyMatrix4(tmp)
    const list = groups.get(part.m) ?? []
    list.push(g)
    groups.set(part.m, list)
  }
  return [...groups].map(([m, list]) => {
    const merged = mergeGeometries(list)
    for (const g of list) g.dispose()
    return [m, merged]
  })
}
