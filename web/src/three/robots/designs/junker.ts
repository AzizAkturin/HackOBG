import type { Chassis } from '../chassis'
import { AX_X, AX_Z, ball, box, cyl, hose, torus } from '../parts'

const fingers = [-0.11, -0.037, 0.037, 0.11].map((x) => box('dark', [0.06, 0.13, 0.1], [x, -0.98, 0.1], undefined, 0.02))

export const junker: Chassis = {
  label: 'Junker',
  blurb: 'Lopsided scrap build: crate shoulder, truss arm, off-centre face.',
  rig: { scale: 1, hip: 1.5, thigh: 0.75, hipX: 0.3, shoulder: [0.8, 1.0, 0], neck: [0.18, 1.2, 0.22] },
  finish: { metalness: 0.4, roughness: 0.1, clearcoat: 0.2, grime: true },
  pelvis: [
    box('mech', [0.6, 0.28, 0.4]),
    box('armor', [0.5, 0.2, 0.1], [0, -0.02, 0.22], undefined, 0.03),
    cyl('dark', 0.16, 0.08, [-0.32, -0.02, 0.1], AX_X),
    torus('mech', 0.16, 0.025, [-0.37, -0.02, 0.1], [0, Math.PI / 2, 0]),
  ],
  torso: [
    ball('dark', 0.14, [0, 0.15, 0], [1.2, 0.9, 1]),
    ball('dark', 0.14, [0.05, 0.38, 0.03], [1.2, 0.9, 1]),
    ball('dark', 0.14, [-0.02, 0.62, 0.05], [1.2, 0.9, 1]),
    ball('pip1', 0.035, [0, 0.15, 0.135]),
    ball('pip2', 0.035, [0.06, 0.38, 0.165]),
    ball('pip3', 0.035, [-0.02, 0.62, 0.185]),
    ball('dark', 0.26, [0.05, 0.95, 0.02], [1.4, 1.1, 0.9]),
    ball('mech', 0.1, [-0.15, 1.0, 0.2]),
    ball('mech', 0.09, [0.3, 0.82, 0.18]),
    ball('eye', 0.03, [0.33, 0.84, 0.265]),
    ball('eye', 0.03, [-0.15, 1.02, 0.295]),
    box('mech', [0.9, 0.12, 0.4], [0, 1.28, 0], undefined, 0.03),
    box('chest', [0.22, 0.14, 0.03], [-0.2, 0.72, 0.2], [0, -0.3, 0], 0.01),
    hose('trim', [0.12, 1.12, 0.32], [-0.12, 0.1, 0.25], 0.04, 0.25),
    hose('trim', [0.32, 0.9, 0.12], [0.24, 0.05, 0.18], 0.03, 0.15),
  ],
  head: [
    ball('dark', 0.14, [0, 0, -0.06]),
    cyl('trim', 0.15, 0.08, [0, 0, 0.02], AX_Z, { seg: 24 }),
    torus('mech', 0.065, 0.015, [0.04, 0.03, 0.065]),
    cyl('eye', 0.045, 0.03, [0.04, 0.03, 0.065], AX_Z, { seg: 14 }),
    cyl('mech', 0.04, 0.12, [-0.06, -0.08, 0.1], AX_Z, { seg: 10 }),
  ],
  arm: {
    shoulder: [
      ball('mech', 0.14),
      box('armor', [0.24, 0.14, 0.26], [0.04, 0.12, 0], undefined, 0.03),
      cyl('mech', 0.05, 0.55, [0, -0.3, 0], undefined, { seg: 10 }),
      cyl('chrome', 0.025, 0.4, [0.08, -0.3, -0.06], undefined, { seg: 8 }),
    ],
    elbow: [
      ball('mech', 0.09),
      ...[-0.12, 0.12].flatMap((x) => [-0.1, 0.1].map((z) => cyl('armor', 0.025, 0.5, [x, -0.32, z], undefined, { seg: 6 }))),
      box('armor', [0.3, 0.04, 0.26], [0, -0.08, 0], undefined, 0.01),
      box('armor', [0.3, 0.04, 0.26], [0, -0.56, 0], undefined, 0.01),
      box('armor', [0.02, 0.55, 0.02], [0, -0.32, 0.1], [0, 0, 0.45], 0.005),
      box('armor', [0.02, 0.55, 0.02], [0, -0.32, -0.1], [0, 0, -0.45], 0.005),
      box('mech', [0.3, 0.28, 0.3], [0, -0.8, 0]),
      ...fingers,
      box('mech', [0.06, 0.16, 0.08], [-0.17, -0.8, 0.12], undefined, 0.02),
    ],
  },
  rearArm: {
    shoulder: [
      box('armor', [0.62, 0.6, 0.62], [0.2, 0.15, 0], undefined, 0.03),
      box('trim', [0.64, 0.06, 0.64], [0.2, 0.43, 0], undefined, 0.01),
      box('mech', [0.06, 0.14, 0.04], [0.2, 0.25, 0.32], undefined, 0.01),
      box('fw', [0.4, 0.03, 0.02], [0.2, 0.36, 0.315], undefined, 0.008),
      box('mech', [0.16, 0.4, 0.18], [0, -0.38, 0], undefined, 0.03),
    ],
    elbow: [
      ball('mech', 0.1),
      box('armor', [0.3, 0.62, 0.3], [0, -0.38, 0], undefined, 0.03),
      box('dark', [0.32, 0.04, 0.32], [0, -0.12, 0], undefined, 0.01),
      box('dark', [0.32, 0.04, 0.32], [0, -0.64, 0], undefined, 0.01),
      box('mech', [0.02, 0.55, 0.02], [0, -0.38, 0.155], [0, 0, 0.45], 0.005),
      box('mech', [0.02, 0.55, 0.02], [0, -0.38, 0.155], [0, 0, -0.45], 0.005),
      box('mech', [0.32, 0.26, 0.32], [0, -0.84, 0.02]),
      ...fingers,
    ],
  },
  leg: {
    thigh: [ball('mech', 0.15), box('armor', [0.32, 0.62, 0.36], [0, -0.36, 0.02], undefined, 0.1), box('mech', [0.2, 0.2, 0.04], [0, -0.3, 0.2], undefined, 0.01)],
    knee: [
      cyl('dark', 0.12, 0.3, undefined, AX_X),
      torus('mech', 0.12, 0.02, [0.16, 0, 0], [0, Math.PI / 2, 0]),
      box('armor', [0.3, 0.62, 0.34], [0, -0.36, 0.02], undefined, 0.08),
      ...[-0.5, -0.55, -0.6].map((y) => box('dark', [0.18, 0.02, 0.02], [0, y, 0.195], undefined, 0.005)),
    ],
    foot: [box('armor', [0.32, 0.14, 0.5], [0, 0.07, 0.08], undefined, 0.04), box('mech', [0.3, 0.08, 0.12], [0, 0.04, 0.36], undefined, 0.02)],
  },
}
