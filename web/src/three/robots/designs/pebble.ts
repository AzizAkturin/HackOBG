import type { Chassis } from '../chassis'
import { AX_Z, ball, box, cyl, sym, torus, type MatKey, type Part, type V3 } from '../parts'

const ports: Part[] = (
  [
    ['pip1', [-0.2, 0.85, 0.38]],
    ['pip2', [0.2, 0.85, 0.38]],
    ['pip3', [-0.18, 0.45, 0.405]],
    ['dark', [0.18, 0.45, 0.405]],
  ] as [MatKey, V3][]
).flatMap(([m, p]) => [torus('chrome', 0.045, 0.014, p), cyl(m, 0.034, 0.02, p, AX_Z, { seg: 14 })])

export const pebble: Chassis = {
  label: 'Pebble',
  blurb: 'Seamless glossy suit, turtleneck collar, paddle arms.',
  rig: { scale: 1, hip: 1.35, thigh: 0.68, hipX: 0.28, shoulder: [0.62, 1.0, 0], neck: [0, 1.42, 0] },
  finish: { metalness: 0.1, roughness: -0.08, clearcoat: 1, grime: false },
  pelvis: [ball('armor', 0.42, [0, 0.02, 0], [1.1, 0.75, 0.95])],
  torso: [
    ball('armor', 0.5, [0, 0.62, 0], [1.05, 1.25, 0.9]),
    torus('dark', 0.5, 0.008, [0, 0.62, 0], AX_Z),
    ...ports,
    ...sym(ball('mech', 0.12, [0.55, 1.0, 0])),
    box('chest', [0.22, 0.14, 0.02], [0, 0.75, -0.44], [0, Math.PI, 0], 0.005),
    cyl('armor', 0.26, 0.3, [0, 1.3, 0], undefined, { r2: 0.28, seg: 28 }),
    cyl('dark', 0.2, 0.31, [0, 1.31, 0]),
    torus('fw', 0.22, 0.016, [0, 1.455, 0], AX_Z),
  ],
  head: [
    ball('trim', 0.27, [0, 0.2, 0], [1, 0.78, 1.05]),
    cyl('eye', 0.045, 0.02, [0.09, 0.22, 0.272], [Math.PI / 2, 0, Math.PI], { seg: 3 }),
    box('dark', [0.08, 0.015, 0.01], [0, 0.12, 0.265], undefined, 0.004),
    ...sym(ball('dark', 0.014, [0.2, 0.24, 0.18])),
  ],
  arm: {
    shoulder: [
      ball('mech', 0.1),
      box('trim', [0.16, 0.55, 0.26], [0.02, -0.3, 0], undefined, 0.08),
      cyl('rivet', 0.035, 0.01, [0.103, -0.42, 0], [0, 0, Math.PI / 2], { seg: 3 }),
    ],
    elbow: [
      ball('mech', 0.08),
      box('trim', [0.15, 0.55, 0.24], [0, -0.32, 0], undefined, 0.07),
      box('dark', [0.005, 0.1, 0.12], [0.078, -0.3, 0], undefined, 0.002),
      box('trim', [0.26, 0.28, 0.3], [0, -0.8, 0.02], undefined, 0.12),
    ],
  },
  leg: {
    thigh: [cyl('armor', 0.2, 0.7, [0, -0.3, 0], undefined, { r2: 0.26, seg: 24 }), torus('dark', 0.225, 0.008, [0, -0.35, 0], AX_Z)],
    knee: [ball('armor', 0.19), cyl('armor', 0.15, 0.62, [0, -0.34, 0], undefined, { r2: 0.2, seg: 24 }), torus('dark', 0.17, 0.008, [0, -0.4, 0], AX_Z)],
    foot: [ball('armor', 0.2, [0, 0.1, 0.05], [1, 0.6, 1.4])],
  },
}
