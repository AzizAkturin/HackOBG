import type { Chassis } from '../chassis'
import { ball, box, cyl, sym, torus } from '../parts'

export const halo: Chassis = {
  label: 'Halo',
  blurb: 'Lean satin athlete; the faceless head reads through one light band.',
  rig: { scale: 1.02, hip: 1.5, thigh: 0.75, hipX: 0.25, shoulder: [0.66, 1.0, 0], neck: [0, 1.45, 0] },
  finish: { metalness: 0.6, roughness: 0, clearcoat: 0.8, grime: false },
  pelvis: [box('trim', [0.5, 0.3, 0.36], undefined, undefined, 0.1), ...sym(box('armor', [0.16, 0.24, 0.34], [0.28, -0.02, 0], undefined, 0.06))],
  torso: [
    cyl('trim', 0.16, 0.3, [0, 0.12, 0]),
    box('armor', [0.42, 0.22, 0.3], [0, 0.32, 0], undefined, 0.08),
    box('armor', [0.78, 0.7, 0.42], [0, 0.85, 0], undefined, 0.14),
    box('armor', [0.6, 0.12, 0.36], [0, 1.24, 0], undefined, 0.05),
    box('trim', [0.6, 0.02, 0.02], [0, 0.7, 0.215], undefined, 0.005),
    box('chest', [0.24, 0.12, 0.02], [0, 1.02, 0.212], undefined, 0.005),
    ...sym(box('dark', [0.02, 0.28, 0.16], [0.39, 0.85, 0.06], undefined, 0.005)),
    ball('pip1', 0.022, [0.402, 0.95, 0.06]),
    ball('pip2', 0.022, [0.402, 0.85, 0.06]),
    ball('pip3', 0.022, [0.402, 0.75, 0.06]),
    cyl('trim', 0.07, 0.24, [0, 1.36, 0], undefined, { seg: 12 }),
  ],
  head: [
    ball('trim', 0.2, [0, 0.24, 0.02], [0.85, 1.2, 0.75]),
    ball('armor', 0.24, [0, 0.34, -0.06], [1, 0.72, 1.05]),
    torus('armor', 0.21, 0.03, [0, 0.35, 0], [Math.PI / 2 - 0.15, 0, 0]),
    box('fw', [0.26, 0.035, 0.03], [0, 0.33, 0.215], [-0.15, 0, 0], 0.012),
  ],
  arm: {
    shoulder: [
      ball('trim', 0.13),
      box('armor', [0.2, 0.2, 0.22], [0.05, -0.02, 0], undefined, 0.08),
      box('armor', [0.15, 0.4, 0.16], [0, -0.32, 0], undefined, 0.06),
      box('trim', [0.16, 0.05, 0.17], [0, -0.5, 0], undefined, 0.02),
    ],
    elbow: [
      ball('trim', 0.08),
      box('armor', [0.14, 0.42, 0.15], [0, -0.28, 0], undefined, 0.06),
      box('trim', [0.02, 0.3, 0.06], [0.075, -0.28, 0], undefined, 0.005),
      cyl('trim', 0.06, 0.1, [0, -0.56, 0], undefined, { seg: 12 }),
      box('trim', [0.26, 0.3, 0.28], [0, -0.78, 0.02], undefined, 0.1),
      box('mech', [0.24, 0.07, 0.08], [0, -0.88, 0.12], undefined, 0.03),
    ],
  },
  leg: {
    thigh: [ball('trim', 0.11), box('armor', [0.2, 0.6, 0.22], [0, -0.34, 0], undefined, 0.09)],
    knee: [
      ball('trim', 0.1),
      box('armor', [0.17, 0.55, 0.19], [0, -0.36, 0], undefined, 0.08),
      box('armor', [0.15, 0.3, 0.1], [0, -0.28, -0.1], undefined, 0.05),
    ],
    foot: [box('trim', [0.2, 0.32, 0.22], [0, 0.17, 0], undefined, 0.07), box('trim', [0.2, 0.1, 0.38], [0, 0.05, 0.06], undefined, 0.04)],
  },
}
