import type { Chassis } from '../chassis'
import { AX_X, ball, box, cyl, hose, sym } from '../parts'

export const crash: Chassis = {
  label: 'Crash',
  blurb: 'Boxy industrial test rig with a screen face and a work lamp.',
  rig: { scale: 1, hip: 1.45, thigh: 0.72, hipX: 0.36, shoulder: [0.9, 0.95, 0], neck: [0, 1.48, 0.04] },
  finish: { metalness: 0.35, roughness: 0.05, clearcoat: 0.4, grime: true },
  pelvis: [
    box('mech', [0.82, 0.3, 0.5], undefined, undefined, 0.06),
    box('armor', [0.7, 0.18, 0.12], [0, 0.06, 0.28], [0.2, 0, 0], 0.03),
    box('armor', [0.25, 0.22, 0.08], [0, -0.1, 0.3], undefined, 0.03),
    ...sym(box('mech', [0.2, 0.3, 0.3], [0.38, -0.05, 0], undefined, 0.04)),
  ],
  torso: [
    cyl('mech', 0.22, 0.4, [0, 0.18, 0]),
    ...sym(cyl('dark', 0.04, 0.45, [0.18, 0.2, 0.1], undefined, { seg: 8 }), hose('rubber', [0.15, 0.05, 0.18], [0.32, 0.55, 0.22], 0.03, 0.06)),
    box('chest', [0.24, 0.18, 0.04], [0, 0.26, 0.24], undefined, 0.01),
    box('armor', [1.3, 0.66, 0.72], [0, 0.9, 0], undefined, 0.05),
    box('armor', [1.1, 0.12, 0.66], [0, 1.27, 0], undefined, 0.03),
    box('dark', [0.5, 0.2, 0.04], [0.15, 1.0, 0.37], undefined, 0.01),
    ...[0.95, 1.0, 1.05].map((y) => box('mech', [0.46, 0.018, 0.02], [0.15, y, 0.39], undefined, 0.005)),
    box('pip1', [0.07, 0.05, 0.02], [-0.42, 0.75, 0.37], undefined, 0.01),
    box('pip2', [0.07, 0.05, 0.02], [-0.32, 0.75, 0.37], undefined, 0.01),
    box('pip3', [0.07, 0.05, 0.02], [-0.22, 0.75, 0.37], undefined, 0.01),
    box('mech', [0.16, 0.14, 0.14], [0.5, 1.42, 0.22], undefined, 0.02),
    box('fw', [0.12, 0.09, 0.02], [0.5, 1.42, 0.3], undefined, 0.01),
    box('mech', [0.9, 0.5, 0.25], [0, 0.95, -0.45], undefined, 0.04),
    box('hazard', [0.7, 0.18, 0.03], [0, 0.95, -0.585], undefined, 0.01),
    cyl('mech', 0.1, 0.3, [0, 1.36, 0.02], undefined, { seg: 12 }),
  ],
  head: [
    box('armor', [0.36, 0.3, 0.4], [0, 0.16, -0.02], undefined, 0.04),
    box('dark', [0.32, 0.18, 0.06], [0, 0.14, 0.2], undefined, 0.02),
    box('eye', [0.24, 0.05, 0.02], [0, 0.15, 0.235], undefined, 0.01),
    box('mech', [0.42, 0.06, 0.12], [0, 0.27, 0.18], undefined, 0.02),
    ...sym(cyl('armor', 0.1, 0.06, [0.2, 0.14, 0], AX_X)),
    cyl('chrome', 0.015, 0.5, [-0.12, 0.5, -0.12], [-0.15, 0, 0.1], { seg: 6 }),
    ball('fw', 0.03, [-0.145, 0.75, -0.16]),
  ],
  arm: {
    shoulder: [
      ball('mech', 0.17),
      box('armor', [0.5, 0.08, 0.56], [0.12, 0.24, 0], [0, 0, -0.35], 0.02),
      box('mech', [0.2, 0.44, 0.22], [0, -0.3, 0], undefined, 0.04),
      box('armor', [0.24, 0.3, 0.26], [0, -0.28, 0.02], undefined, 0.03),
    ],
    elbow: [
      ball('mech', 0.13),
      box('armor', [0.34, 0.5, 0.34], [0, -0.32, 0], undefined, 0.04),
      box('dark', [0.36, 0.05, 0.36], [0, -0.15, 0], undefined, 0.01),
      box('hazard', [0.02, 0.2, 0.2], [0.175, -0.35, 0], undefined, 0.005),
      box('mech', [0.4, 0.34, 0.4], [0, -0.86, 0.02], undefined, 0.06),
      ...[-0.15, -0.05, 0.05, 0.15].map((x) => box('dark', [0.08, 0.1, 0.12], [x, -0.98, 0.12], undefined, 0.02)),
      box('armor', [0.42, 0.1, 0.14], [0, -0.78, 0.18], undefined, 0.02),
    ],
  },
  leg: {
    thigh: [ball('mech', 0.17), box('mech', [0.3, 0.6, 0.32], [0, -0.36, 0], undefined, 0.04), box('hazard', [0.24, 0.24, 0.03], [0, -0.3, 0.17], undefined, 0.01)],
    knee: [
      ball('mech', 0.15),
      box('armor', [0.4, 0.68, 0.42], [0, -0.37, 0.02], undefined, 0.04),
      ...sym(ball('rivet', 0.02, [0.15, -0.15, 0.235]), ball('rivet', 0.02, [0.15, -0.6, 0.235])),
    ],
    foot: [box('mech', [0.42, 0.16, 0.62], [0, 0.08, 0.08], undefined, 0.04), box('rubber', [0.44, 0.04, 0.64], [0, 0.02, 0.08], undefined, 0.01)],
  },
}
