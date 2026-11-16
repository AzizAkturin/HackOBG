import type { Chassis } from '../chassis'
import { AX_X, ball, box, cone, cyl, hose, sym } from '../parts'

export const stilt: Chassis = {
  label: 'Stilt',
  blurb: 'Lanky long-legged frame with an open spine and blade feet.',
  rig: { scale: 0.95, hip: 1.8, thigh: 0.9, hipX: 0.3, shoulder: [0.72, 1.0, 0], neck: [0, 1.5, 0.02] },
  finish: { metalness: 0.3, roughness: 0.1, clearcoat: 0.3, grime: true },
  pelvis: [
    box('mech', [0.5, 0.3, 0.36]),
    ...sym(cyl('dark', 0.14, 0.14, [0.3, 0, 0], AX_X), cyl('chrome', 0.07, 0.16, [0.31, 0, 0], AX_X, { seg: 12 })),
    box('armor', [0.3, 0.24, 0.06], [0, -0.04, 0.2], undefined, 0.03),
  ],
  torso: [
    cyl('mech', 0.06, 0.72, [0, 0.36, -0.05], undefined, { seg: 10 }),
    ...[0.12, 0.28, 0.44, 0.6].map((y) => box('mech', [0.16, 0.05, 0.14], [0, y, -0.05], undefined, 0.02)),
    hose('eye', [0.07, 0.02, 0.08], [0.16, 0.74, 0.12], 0.022, 0.06),
    hose('fw', [-0.07, 0.02, 0.08], [-0.16, 0.74, 0.12], 0.022, 0.06),
    box('mech', [0.6, 0.1, 0.4], [0, 0.72, 0], undefined, 0.03),
    box('armor', [0.82, 0.5, 0.5], [0, 0.98, 0.02], [0.1, 0, 0]),
    box('armor', [0.9, 0.2, 0.46], [0, 1.25, 0], undefined, 0.04),
    box('chest', [0.24, 0.14, 0.02], [-0.2, 1.0, 0.28], [0.1, 0, 0], 0.005),
    box('pip1', [0.035, 0.18, 0.02], [0.3, 1.0, 0.28], [0.1, 0, 0], 0.008),
    box('pip2', [0.035, 0.18, 0.02], [0.23, 1.0, 0.28], [0.1, 0, 0], 0.008),
    box('pip3', [0.035, 0.18, 0.02], [0.16, 1.0, 0.28], [0.1, 0, 0], 0.008),
    cyl('mech', 0.05, 0.32, [0, 1.38, 0], undefined, { seg: 10 }),
  ],
  head: [
    box('armor', [0.32, 0.22, 0.3], [0, 0.12, 0], undefined, 0.03),
    box('dark', [0.26, 0.07, 0.04], [0, 0.13, 0.15], undefined, 0.01),
    box('eye', [0.2, 0.025, 0.02], [0, 0.13, 0.172], undefined, 0.008),
    box('trim', [0.18, 0.08, 0.2], [0, 0.26, -0.02], undefined, 0.02),
    box('mech', [0.2, 0.06, 0.18], [0, 0, 0.04], undefined, 0.02),
    ...sym(cyl('dark', 0.06, 0.04, [0.17, 0.12, -0.02], AX_X, { seg: 14 })),
  ],
  arm: {
    shoulder: [
      cyl('dark', 0.16, 0.16, [0.08, 0, 0], AX_X),
      cyl('chrome', 0.07, 0.18, [0.1, 0, 0], AX_X, { seg: 12 }),
      cyl('mech', 0.05, 0.5, [0, -0.3, 0], undefined, { seg: 10 }),
      box('armor', [0.14, 0.22, 0.16], [0, -0.22, 0], undefined, 0.03),
      box('trim', [0.15, 0.025, 0.17], [0, -0.3, 0], undefined, 0.008),
      box('trim', [0.15, 0.025, 0.17], [0, -0.26, 0], undefined, 0.008),
    ],
    elbow: [
      box('armor', [0.2, 0.18, 0.2], undefined, undefined, 0.04),
      cyl('dark', 0.09, 0.24, undefined, AX_X, { seg: 14 }),
      cyl('mech', 0.045, 0.5, [0, -0.36, 0], undefined, { seg: 10 }),
      box('armor', [0.13, 0.3, 0.15], [0, -0.4, 0.04], undefined, 0.03),
      box('armor', [0.26, 0.26, 0.28], [0, -0.82, 0.02]),
      box('mech', [0.26, 0.07, 0.1], [0, -0.92, 0.12], undefined, 0.02),
    ],
  },
  leg: {
    thigh: [box('trim', [0.3, 0.7, 0.32], [0, -0.4, 0.02], undefined, 0.04), box('armor', [0.04, 0.2, 0.02], [0.06, -0.25, 0.18], undefined, 0.008)],
    knee: [
      cyl('dark', 0.13, 0.26, undefined, AX_X),
      box('mech', [0.12, 0.75, 0.14], [0, -0.42, -0.04], [-0.08, 0, 0], 0.03),
      box('armor', [0.16, 0.45, 0.1], [0, -0.35, 0.06], undefined, 0.03),
    ],
    foot: [box('trim', [0.18, 0.08, 0.5], [0, 0.04, 0.1], undefined, 0.03), cone('trim', 0.09, 0.2, [0, 0.04, 0.44], [Math.PI / 2, 0, 0]), ball('mech', 0.07, [0, 0.1, -0.02])],
  },
}
