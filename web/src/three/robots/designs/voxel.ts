import type { Chassis } from '../chassis'
import { ball, box, sym } from '../parts'

const R = 0.01

export const voxel: Chassis = {
  label: 'Voxel',
  blurb: 'Stacked pixel blocks with a stepped M crest and a three-bit visor.',
  rig: { scale: 1.04, hip: 1.5, thigh: 0.75, hipX: 0.26, shoulder: [0.72, 0.98, 0], neck: [0, 1.42, 0] },
  finish: { metalness: 0.25, roughness: 0.15, clearcoat: 0.15, grime: true },
  pelvis: [box('mech', [0.6, 0.26, 0.42], undefined, undefined, R), ...sym(box('armor', [0.2, 0.22, 0.46], [0.3, -0.02, 0], undefined, R))],
  torso: [
    box('mech', [0.3, 0.3, 0.3], [0, 0.12, 0], undefined, R),
    box('armor', [0.7, 0.36, 0.46], [0, 0.5, 0], undefined, R),
    box('trim', [0.72, 0.04, 0.48], [0, 0.34, 0], undefined, R),
    box('armor', [1.0, 0.3, 0.52], [0, 0.83, 0], undefined, R),
    ...sym(box('armor', [0.3, 0.3, 0.52], [0.35, 1.13, 0], undefined, R), box('trim', [0.3, 0.04, 0.54], [0.35, 1.0, 0], undefined, R)),
    box('trim', [0.34, 0.18, 0.5], [0, 1.07, 0], undefined, R),
    box('armor', [0.7, 0.5, 0.2], [0, 0.9, -0.3], undefined, R),
    box('chest', [0.2, 0.13, 0.02], [0, 0.83, 0.272], undefined, 0.005),
    box('fw', [0.3, 0.03, 0.02], [0, 0.65, 0.236], undefined, 0.005),
    box('pip1', [0.05, 0.05, 0.02], [-0.12, 0.5, 0.234], undefined, 0.005),
    box('pip2', [0.05, 0.05, 0.02], [0, 0.5, 0.234], undefined, 0.005),
    box('pip3', [0.05, 0.05, 0.02], [0.12, 0.5, 0.234], undefined, 0.005),
    ...sym(ball('rivet', 0.015, [0.5, 0.8, 0.2]), ball('rivet', 0.015, [0.5, 0.9, 0.2])),
    box('mech', [0.2, 0.12, 0.2], [0, 1.3, 0], undefined, R),
  ],
  head: [
    box('mech', [0.14, 0.14, 0.14], [0, 0.04, 0], undefined, R),
    box('armor', [0.4, 0.4, 0.4], [0, 0.32, 0], undefined, R),
    ...sym(box('trim', [0.1, 0.18, 0.12], [0.25, 0.36, 0], undefined, R), box('armor', [0.12, 0.12, 0.14], [0.14, 0.58, 0], undefined, R)),
    box('dark', [0.32, 0.1, 0.02], [0, 0.34, 0.205], undefined, 0.005),
    box('eye', [0.07, 0.05, 0.02], [-0.09, 0.34, 0.216], undefined, 0.003),
    box('eye', [0.07, 0.05, 0.02], [0, 0.34, 0.216], undefined, 0.003),
    box('eye', [0.07, 0.05, 0.02], [0.09, 0.34, 0.216], undefined, 0.003),
  ],
  arm: {
    shoulder: [
      box('armor', [0.28, 0.28, 0.28], [0.06, 0, 0], undefined, R),
      box('trim', [0.3, 0.04, 0.3], [0.06, -0.16, 0], undefined, R),
      box('armor', [0.2, 0.42, 0.22], [0, -0.32, 0], undefined, R),
      box('trim', [0.21, 0.04, 0.23], [0, -0.53, 0], undefined, R),
    ],
    elbow: [
      box('mech', [0.16, 0.16, 0.16], undefined, undefined, R),
      box('armor', [0.18, 0.48, 0.2], [0, -0.3, 0], undefined, R),
      box('mech', [0.12, 0.1, 0.12], [0, -0.6, 0], undefined, R),
      box('trim', [0.3, 0.3, 0.32], [0, -0.82, 0.02], undefined, R),
      box('armor', [0.28, 0.08, 0.1], [0, -0.92, 0.12], undefined, R),
    ],
  },
  leg: {
    thigh: [box('mech', [0.2, 0.2, 0.2], undefined, undefined, R), box('armor', [0.26, 0.6, 0.28], [0, -0.36, 0], undefined, R)],
    knee: [
      box('mech', [0.18, 0.18, 0.18], undefined, undefined, R),
      box('trim', [0.24, 0.04, 0.26], [0, -0.08, 0], undefined, R),
      box('armor', [0.22, 0.56, 0.24], [0, -0.38, 0], undefined, R),
      box('mech', [0.14, 0.1, 0.14], [0, -0.7, 0], undefined, R),
    ],
    foot: [box('trim', [0.26, 0.12, 0.44], [0, 0.06, 0.08], undefined, R), box('armor', [0.22, 0.1, 0.2], [0, 0.17, 0.16], undefined, R)],
  },
}
