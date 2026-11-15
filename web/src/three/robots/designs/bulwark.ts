import type { Chassis } from '../chassis'
import { AX_Z, ball, box, cyl, sym, torus } from '../parts'

const studs = [-0.12, 0, 0.12]

export const bulwark: Chassis = {
  label: 'Bulwark',
  blurb: 'Egg-hulled heavy with gauntlet forearms on a coiled waist.',
  rig: { scale: 1, hip: 1.3, thigh: 0.65, hipX: 0.32, shoulder: [1.0, 1.0, 0], neck: [0, 1.5, 0.05] },
  finish: { metalness: 0.35, roughness: 0, clearcoat: 0.7, grime: true },
  pelvis: [
    box('mech', [0.6, 0.3, 0.45]),
    ...sym(box('armor', [0.36, 0.22, 0.5], [0.26, -0.08, 0], [0, 0, -0.25], 0.08)),
    box('armor', [0.3, 0.3, 0.12], [0, -0.05, 0.25], undefined, 0.04),
  ],
  torso: [
    cyl('mech', 0.16, 0.4, [0, 0.17, 0]),
    ...[0.05, 0.13, 0.21, 0.29].map((y) => torus('mech', 0.2, 0.045, [0, y, 0], AX_Z)),
    ball('armor', 0.62, [0, 0.9, 0], [1.2, 1.05, 0.85]),
    box('trim', [0.5, 0.8, 0.12], [0, 0.85, 0.5]),
    ...sym(box('dark', [0.07, 0.36, 0.04], [0.09, 0.75, 0.565], undefined, 0.02)),
    box('fw', [0.025, 0.45, 0.03], [0, 0.72, 0.57], undefined, 0.01),
    box('chest', [0.3, 0.18, 0.03], [0, 1.1, 0.575], undefined, 0.01),
    cyl('mech', 0.22, 0.15, [0, 1.42, 0.03]),
    ...sym(box('trim', [0.38, 0.14, 0.5], [0.45, 1.42, 0], [0, 0, -0.2])),
    ...sym(cyl('chrome', 0.03, 0.55, [0.55, 1.7, -0.3], [-0.15, 0, -0.15], { seg: 8 })),
    ...sym(ball('fw', 0.05, [0.59, 1.97, -0.34])),
    box('mech', [0.7, 0.6, 0.25], [0, 0.95, -0.52], undefined, 0.08),
  ],
  head: [
    ball('armor', 0.27, [0, 0.18, 0], [1, 1.05, 1]),
    box('dark', [0.4, 0.14, 0.2], [0, 0.16, 0.17]),
    box('eye', [0.3, 0.04, 0.02], [0, 0.17, 0.275], undefined, 0.01),
    box('trim', [0.46, 0.06, 0.3], [0, 0.27, 0.1], undefined, 0.02),
    box('armor', [0.3, 0.12, 0.2], [0, 0.02, 0.14], undefined, 0.04),
    cyl('trim', 0.06, 0.05, [0, 0.46, 0], undefined, { seg: 12 }),
  ],
  arm: {
    shoulder: [
      ball('armor', 0.3, [0.08, 0.02, 0]),
      box('dark', [0.04, 0.24, 0.05], [0.375, 0.04, 0], [0.785, 0, 0], 0.015),
      box('dark', [0.04, 0.24, 0.05], [0.375, 0.04, 0], [-0.785, 0, 0], 0.015),
      cyl('trim', 0.14, 0.1, [0.02, -0.26, 0]),
      cyl('mech', 0.08, 0.38, [0, -0.45, 0], undefined, { seg: 12 }),
    ],
    elbow: [
      ball('mech', 0.1),
      cyl('trim', 0.27, 0.1, [0, -0.1, 0]),
      cyl('armor', 0.3, 0.5, [0, -0.36, 0], undefined, { r2: 0.26 }),
      ball('pip1', 0.055, [studs[0], -0.36, 0.26]),
      ball('pip2', 0.055, [studs[1], -0.36, 0.28]),
      ball('pip3', 0.055, [studs[2], -0.36, 0.26]),
      cyl('trim', 0.31, 0.08, [0, -0.6, 0]),
      box('trim', [0.42, 0.36, 0.44], [0, -0.86, 0.02], undefined, 0.1),
      ...[-0.15, -0.05, 0.05, 0.15].map((x) => box('mech', [0.09, 0.1, 0.12], [x, -0.98, 0.12], undefined, 0.03)),
      box('armor', [0.12, 0.24, 0.1], [-0.2, -0.82, 0.18], undefined, 0.04),
    ],
  },
  leg: {
    thigh: [
      ball('mech', 0.14),
      box('armor', [0.24, 0.14, 0.28], [0, -0.12, 0], undefined, 0.05),
      cyl('mech', 0.07, 0.5, [0, -0.36, 0], undefined, { seg: 12 }),
    ],
    knee: [
      ball('mech', 0.11),
      box('armor', [0.2, 0.36, 0.22], [0, -0.15, 0.03], undefined, 0.06),
      cyl('mech', 0.06, 0.4, [0, -0.42, 0], undefined, { seg: 12 }),
      cyl('armor', 0.12, 0.14, [0, -0.58, 0], undefined, { r2: 0.09 }),
    ],
    foot: [
      box('mech', [0.3, 0.12, 0.42], [0, 0.07, 0.08]),
      box('armor', [0.26, 0.1, 0.18], [0, 0.15, 0.2]),
      box('armor', [0.22, 0.14, 0.12], [0, 0.08, -0.14]),
    ],
  },
}
