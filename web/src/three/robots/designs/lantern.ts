import type { Chassis } from '../chassis'
import { AX_Z, ball, box, cyl, sym, torus, type MatKey, type Part } from '../parts'

const RING_SIDE: [number, number, number] = [0, Math.PI / 2, 0]

const bars: Part[] = Array.from({ length: 6 }, (_, n) => {
  const a = (n / 6) * Math.PI * 2 + Math.PI / 6
  return cyl('armor', 0.015, 0.4, [Math.sin(a) * 0.2, 0.28, Math.cos(a) * 0.2], undefined, { seg: 6 })
})

const ribs: Part[] = (
  [
    [0.55, 0.42],
    [0.75, 0.5],
    [0.95, 0.52],
    [1.15, 0.46],
  ] as const
).map(([y, r]) => ({ ...torus('armor', r, 0.035, [0, y, 0], AX_Z), s: [1, 0.75, 1] }))

const pips: Part[] = (['pip1', 'pip2', 'pip3'] as MatKey[]).map((m, n) => box(m, [0.06, 0.06, 0.02], [-0.4 + n * 0.1, 1.3, 0.285], undefined, 0.01))

export const lantern: Chassis = {
  label: 'Lantern',
  blurb: 'Tall caged frame; a core glows inside nested rings, the head is a lamp.',
  rig: { scale: 1.03, hip: 1.55, thigh: 0.78, hipX: 0.27, shoulder: [0.78, 1.0, 0], neck: [0, 1.45, 0] },
  finish: { metalness: 0.55, roughness: 0, clearcoat: 0.6, grime: false },
  pelvis: [box('mech', [0.5, 0.26, 0.36]), ...sym(box('armor', [0.2, 0.3, 0.36], [0.27, -0.04, 0], undefined, 0.06))],
  torso: [
    cyl('mech', 0.16, 0.4, [0, 0.2, 0]),
    cyl('mech', 0.07, 1.2, [0, 0.6, -0.22], undefined, { seg: 10 }),
    ball('fw', 0.18, [0, 0.85, 0]),
    torus('trim', 0.28, 0.02, [0, 0.85, 0]),
    torus('trim', 0.34, 0.02, [0, 0.85, 0], RING_SIDE),
    torus('chrome', 0.24, 0.015, [0, 0.85, 0], AX_Z),
    ...ribs,
    box('armor', [0.08, 0.66, 0.06], [0, 0.85, 0.37], undefined, 0.02),
    box('armor', [1.0, 0.18, 0.55], [0, 1.3, 0], undefined, 0.06),
    box('chest', [0.24, 0.12, 0.02], [0.25, 1.3, 0.282], undefined, 0.005),
    ...pips,
  ],
  head: [
    cyl('armor', 0.2, 0.1, [0, 0.05, 0]),
    ball('eye', 0.1, [0, 0.28, 0]),
    torus('trim', 0.14, 0.012, [0, 0.28, 0], [0.6, 0, 0]),
    ...bars,
    cyl('armor', 0.21, 0.06, [0, 0.5, 0]),
    torus('trim', 0.06, 0.015, [0, 0.58, 0]),
  ],
  arm: {
    shoulder: [
      ball('armor', 0.18),
      torus('trim', 0.19, 0.02, [0.05, 0, 0], RING_SIDE),
      cyl('mech', 0.06, 0.5, [0, -0.3, 0], undefined, { seg: 10 }),
      box('armor', [0.16, 0.3, 0.18], [0, -0.3, 0], undefined, 0.06),
    ],
    elbow: [
      ball('mech', 0.09),
      torus('trim', 0.13, 0.018, [0, -0.12, 0], AX_Z),
      box('armor', [0.2, 0.46, 0.22], [0, -0.34, 0], undefined, 0.08),
      box('armor', [0.3, 0.3, 0.32], [0, -0.82, 0.02], undefined, 0.1),
      box('trim', [0.3, 0.06, 0.08], [0, -0.9, 0.15], undefined, 0.02),
    ],
  },
  leg: {
    thigh: [ball('mech', 0.12), box('armor', [0.2, 0.62, 0.22], [0, -0.36, 0], undefined, 0.08)],
    knee: [ball('trim', 0.1), torus('trim', 0.12, 0.018, undefined, RING_SIDE), box('armor', [0.18, 0.6, 0.2], [0, -0.38, 0], undefined, 0.07)],
    foot: [box('mech', [0.22, 0.1, 0.44], [0, 0.05, 0.08], undefined, 0.04), box('armor', [0.2, 0.06, 0.2], [0, 0.12, 0.16], undefined, 0.03)],
  },
}
