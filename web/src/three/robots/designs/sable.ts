import type { Chassis } from '../chassis'
import { AX_X, AX_Z, ball, box, cyl, sym, torus, type MatKey } from '../parts'

// six dots on the shoulder cap, three of them status pips
const capDots = (['pip1', 'rivet', 'pip2', 'rivet', 'pip3', 'rivet'] as MatKey[]).map((m, n) => {
  const a = (n * Math.PI) / 3 + Math.PI / 2
  return ball(m, 0.022, [0.222, Math.sin(a) * 0.08, Math.cos(a) * 0.08])
})

export const sable: Chassis = {
  label: 'Sable',
  blurb: 'Matte lab humanoid with a blank capsule head and plated joints.',
  rig: { scale: 1.04, hip: 1.5, thigh: 0.75, hipX: 0.26, shoulder: [0.72, 0.98, 0], neck: [0, 1.42, 0] },
  finish: { metalness: 0.15, roughness: 0.25, clearcoat: 0.1, grime: false },
  pelvis: [
    box('mech', [0.62, 0.26, 0.42], undefined, undefined, 0.1),
    box('armor', [0.66, 0.22, 0.46], [0, -0.04, 0], undefined, 0.1),
    box('trim', [0.68, 0.05, 0.48], [0, 0.13, 0], undefined, 0.02),
  ],
  torso: [
    cyl('mech', 0.22, 0.3, [0, 0.12, 0]),
    cyl('trim', 0.3, 0.05, [0, 0.3, 0], undefined, { seg: 28 }),
    torus('fw', 0.305, 0.014, [0, 0.335, 0], AX_Z),
    box('armor', [0.62, 0.36, 0.42], [0, 0.5, 0], undefined, 0.16),
    box('armor', [1.0, 0.62, 0.52], [0, 0.98, 0], undefined, 0.24),
    box('dark', [0.02, 0.46, 0.02], [0, 0.92, 0.262], undefined, 0.005),
    box('chest', [0.2, 0.13, 0.02], [0.22, 1.08, 0.262], undefined, 0.005),
    box('armor', [0.8, 0.5, 0.25], [0, 1.0, -0.24], undefined, 0.12),
    cyl('armor', 0.14, 0.16, [0, 1.32, 0], undefined, { r2: 0.17 }),
    cyl('trim', 0.12, 0.04, [0, 1.41, 0]),
    ...sym(ball('rivet', 0.015, [0.46, 0.8, 0.2]), ball('rivet', 0.015, [0.46, 1.1, 0.2])),
  ],
  head: [
    cyl('mech', 0.07, 0.14, [0, 0.04, 0], undefined, { seg: 12 }),
    box('armor', [0.34, 0.46, 0.4], [0, 0.32, 0], undefined, 0.16),
    box('armor', [0.3, 0.32, 0.06], [0, 0.3, 0.19], undefined, 0.05),
    box('eye', [0.22, 0.022, 0.02], [0, 0.36, 0.222], undefined, 0.008),
    box('trim', [0.06, 0.18, 0.14], [0.19, 0.34, 0.02], undefined, 0.03),
    box('dark', [0.03, 0.1, 0.07], [0.225, 0.34, 0.04], undefined, 0.01),
    cyl('dark', 0.03, 0.02, [-0.175, 0.3, 0.05], AX_X, { seg: 12 }),
  ],
  arm: {
    shoulder: [
      cyl('armor', 0.2, 0.26, [0.06, 0, 0], AX_X),
      cyl('trim', 0.19, 0.04, [0.2, 0, 0], AX_X),
      ...capDots,
      box('armor', [0.2, 0.42, 0.22], [0, -0.32, 0], undefined, 0.09),
      box('trim', [0.21, 0.03, 0.23], [0, -0.53, 0], undefined, 0.01),
    ],
    elbow: [
      ball('mech', 0.09),
      box('armor', [0.18, 0.48, 0.2], [0, -0.3, 0], undefined, 0.08),
      ...sym(box('trim', [0.05, 0.38, 0.2], [0.11, -0.32, 0.02], undefined, 0.02)),
      cyl('mech', 0.07, 0.1, [0, -0.6, 0], undefined, { seg: 12 }),
      box('dark', [0.3, 0.3, 0.32], [0, -0.82, 0.02], undefined, 0.1),
      box('mech', [0.28, 0.08, 0.1], [0, -0.92, 0.12], undefined, 0.03),
      box('dark', [0.08, 0.18, 0.08], [-0.15, -0.78, 0.12], undefined, 0.03),
    ],
  },
  leg: {
    thigh: [ball('mech', 0.12), box('armor', [0.26, 0.6, 0.28], [0, -0.36, 0], undefined, 0.12)],
    knee: [
      ball('mech', 0.1),
      cyl('trim', 0.11, 0.03, [0, -0.06, 0]),
      box('armor', [0.22, 0.56, 0.24], [0, -0.38, 0], undefined, 0.1),
      cyl('mech', 0.07, 0.1, [0, -0.7, 0], undefined, { seg: 12 }),
    ],
    foot: [box('dark', [0.24, 0.1, 0.42], [0, 0.06, 0.07], undefined, 0.04), box('armor', [0.22, 0.06, 0.2], [0, 0.13, 0.16], undefined, 0.03)],
  },
}
