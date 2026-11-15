import type { Chassis } from '../chassis'
import { AX_X, AX_Z, ball, box, cyl, hose, sym, torus } from '../parts'

export const silverback: Chassis = {
  label: 'Silverback',
  blurb: 'Hunched bruiser hung between two barrel shoulders, belly box up front.',
  rig: { scale: 1, hip: 1.15, thigh: 0.55, hipX: 0.42, shoulder: [1.05, 1.0, 0.1], neck: [0, 0.95, 0.42] },
  finish: { metalness: 0.3, roughness: 0.1, clearcoat: 0.3, grime: true },
  pelvis: [
    box('mech', [0.8, 0.3, 0.5], undefined, undefined, 0.06),
    box('armor', [0.9, 0.55, 0.3], [0, -0.12, 0.38], undefined, 0.1),
    box('mech', [0.5, 0.04, 0.04], [0, -0.05, 0.57], undefined, 0.015),
    ...sym(box('mech', [0.04, 0.04, 0.08], [0.25, -0.05, 0.54], undefined, 0.015), ball('rivet', 0.03, [0.33, -0.28, 0.53]), box('armor', [0.3, 0.4, 0.5], [0.48, -0.12, 0], undefined, 0.08)),
  ],
  torso: [
    cyl('mech', 0.2, 0.4, [0, 0.2, 0]),
    ...sym(hose('rubber', [0.15, 0.05, 0.2], [0.3, 0.42, 0.36], 0.035, 0.05)),
    box('armor', [1.0, 0.6, 0.7], [0, 0.75, 0.15], [0.45, 0, 0], 0.2),
    ball('armor', 0.5, [0, 0.95, -0.12], [1.3, 0.8, 1]),
    ...sym(
      cyl('armor', 0.42, 0.95, [0.72, 1.0, 0.05], AX_Z, { seg: 28 }),
      ball('armor', 0.42, [0.72, 1.0, 0.52], [1, 1, 0.45]),
      ball('armor', 0.42, [0.72, 1.0, -0.42], [1, 1, 0.45]),
      torus('trim', 0.41, 0.03, [0.72, 1.0, 0.36]),
      box('dark', [0.25, 0.04, 0.04], [0.22, 0.6, 0.47], [0.45, 0, 0], 0.01),
    ),
    ball('pip1', 0.05, [0.72, 1.41, 0.35]),
    ball('pip2', 0.05, [0.72, 1.42, 0.05]),
    ball('pip3', 0.05, [0.72, 1.41, -0.25]),
    ...[0.35, 0.05, -0.25].map((z) => ball('rivet', 0.05, [-0.72, 1.41, z])),
    box('chest', [0.3, 0.16, 0.03], [-1.145, 1.0, 0.05], [0, -Math.PI / 2, 0], 0.01),
    cyl('fw', 0.12, 0.04, [0, 0.5, 0.5], AX_Z),
    torus('mech', 0.14, 0.025, [0, 0.5, 0.52]),
  ],
  head: [
    ball('armor', 0.2, [0, 0.05, 0], [1, 0.85, 1.1]),
    cyl('dark', 0.09, 0.06, [0, 0.05, 0.2], AX_Z),
    cyl('eye', 0.05, 0.03, [0, 0.05, 0.235], AX_Z, { seg: 16 }),
    box('armor', [0.3, 0.06, 0.2], [0, 0.17, 0.08], undefined, 0.03),
    ...sym(cyl('mech', 0.08, 0.05, [0.19, 0.03, 0], AX_X, { seg: 14 })),
  ],
  arm: {
    shoulder: [
      cyl('mech', 0.12, 0.2, [0, -0.08, 0]),
      cyl('mech', 0.08, 0.4, [0, -0.36, 0], undefined, { seg: 12 }),
      cyl('armor', 0.12, 0.08, [0, -0.24, 0]),
      cyl('armor', 0.12, 0.08, [0, -0.4, 0]),
    ],
    elbow: [
      ball('mech', 0.12),
      cyl('armor', 0.17, 0.18, [0, -0.18, 0]),
      cyl('trim', 0.18, 0.04, [0, -0.3, 0]),
      cyl('armor', 0.19, 0.2, [0, -0.42, 0]),
      cyl('trim', 0.18, 0.04, [0, -0.54, 0]),
      cyl('mech', 0.1, 0.1, [0, -0.62, 0], undefined, { seg: 12 }),
      box('dark', [0.36, 0.34, 0.36], [0, -0.86, 0.02], undefined, 0.12),
      box('trim', [0.03, 0.2, 0.02], [0, -0.84, 0.2], [0, 0, 0.785], 0.008),
      box('trim', [0.03, 0.2, 0.02], [0, -0.84, 0.2], [0, 0, -0.785], 0.008),
      box('mech', [0.34, 0.08, 0.1], [0, -0.99, 0.12], undefined, 0.03),
    ],
  },
  leg: {
    thigh: [ball('mech', 0.17), box('armor', [0.4, 0.5, 0.42], [0, -0.28, 0.02], undefined, 0.12), box('trim', [0.42, 0.06, 0.44], [0, -0.06, 0.02], undefined, 0.02)],
    knee: [
      ball('mech', 0.15),
      cyl('armor', 0.22, 0.45, [0, -0.28, 0], undefined, { r2: 0.2 }),
      box('dark', [0.025, 0.16, 0.02], [0, -0.3, 0.22], [0, 0, 0.785], 0.008),
      box('dark', [0.025, 0.16, 0.02], [0, -0.3, 0.22], [0, 0, -0.785], 0.008),
      cyl('mech', 0.13, 0.1, [0, -0.52, 0]),
    ],
    foot: [
      box('armor', [0.5, 0.14, 0.62], [0, 0.07, 0.1], undefined, 0.05),
      ...sym(box('mech', [0.14, 0.1, 0.18], [0.17, 0.05, 0.44], undefined, 0.03)),
      box('mech', [0.2, 0.1, 0.2], [0, 0.05, -0.24], undefined, 0.03),
    ],
  },
}
