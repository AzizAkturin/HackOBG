import type { Chassis } from '../chassis'
import { AX_Z, ball, box, cyl, hose, sym, torus, type MatKey, type Part } from '../parts'

const gauges: Part[] = (['pip1', 'pip2', 'pip3'] as MatKey[]).flatMap((m, n) => {
  const x = (n - 1) * 0.2
  const z = Math.sqrt(0.58 ** 2 - x ** 2) + 0.005
  return [cyl('dark', 0.07, 0.03, [x, 0.88, z], AX_Z, { seg: 16 }), cyl(m, 0.045, 0.035, [x, 0.88, z + 0.005], AX_Z, { seg: 16 })]
})

const portRivets: Part[] = Array.from({ length: 6 }, (_, n) => {
  const a = (n / 6) * Math.PI * 2
  return ball('rivet', 0.018, [Math.cos(a) * 0.12, 0.02 + Math.sin(a) * 0.12, 0.22])
})

export const kettle: Chassis = {
  label: 'Kettle',
  blurb: 'Squat riveted boiler with a porthole face and a glowing firebox.',
  rig: { scale: 1, hip: 1.2, thigh: 0.6, hipX: 0.4, shoulder: [0.95, 0.85, 0], neck: [0, 1.38, 0.1] },
  finish: { metalness: 0.7, roughness: 0.05, clearcoat: 0.3, grime: true },
  pelvis: [cyl('mech', 0.4, 0.28), ...sym(box('armor', [0.34, 0.26, 0.48], [0.3, -0.06, 0], [0, 0, -0.2], 0.06))],
  torso: [
    cyl('armor', 0.58, 0.95, [0, 0.7, 0], undefined, { seg: 28 }),
    ...[0.3, 0.7, 1.1].map((y) => cyl('trim', 0.6, 0.06, [0, y, 0], undefined, { seg: 28 })),
    ball('armor', 0.58, [0, 1.17, 0], [1, 0.45, 1]),
    ...gauges,
    box('dark', [0.36, 0.26, 0.05], [0, 0.5, 0.57], undefined, 0.02),
    box('fw', [0.28, 0.035, 0.02], [0, 0.46, 0.6], undefined, 0.008),
    box('fw', [0.28, 0.035, 0.02], [0, 0.54, 0.6], undefined, 0.008),
    ...sym(
      cyl('mech', 0.08, 0.6, [0.25, 1.35, -0.35], undefined, { seg: 12 }),
      cyl('dark', 0.1, 0.06, [0.25, 1.66, -0.35], undefined, { seg: 12 }),
      hose('chrome', [0.45, 0.95, 0.3], [0.55, 0.3, 0.25], 0.03, 0.06),
    ),
    box('chest', [0.24, 0.14, 0.03], [-0.32, 1.0, 0.49], [0, -0.58, 0], 0.01),
  ],
  head: [
    ball('armor', 0.22, undefined, [1, 0.9, 1]),
    torus('trim', 0.12, 0.03, [0, 0.02, 0.2]),
    cyl('eye', 0.11, 0.02, [0, 0.02, 0.2], AX_Z, { seg: 20 }),
    ...portRivets,
  ],
  arm: {
    shoulder: [
      ball('trim', 0.24, [0.04, 0, 0]),
      cyl('mech', 0.09, 0.45, [0, -0.32, 0], undefined, { seg: 12 }),
      cyl('trim', 0.12, 0.06, [0, -0.3, 0]),
    ],
    elbow: [
      ball('mech', 0.11),
      cyl('armor', 0.22, 0.45, [0, -0.32, 0], undefined, { r2: 0.2 }),
      cyl('trim', 0.23, 0.05, [0, -0.5, 0]),
      box('trim', [0.44, 0.4, 0.44], [0, -0.86, 0.02], undefined, 0.14),
      ...[-0.15, -0.05, 0.05, 0.15].map((x) => ball('rivet', 0.035, [x, -0.92, 0.24])),
    ],
  },
  leg: {
    thigh: [ball('mech', 0.16), cyl('armor', 0.17, 0.45, [0, -0.3, 0])],
    knee: [ball('mech', 0.14), cyl('armor', 0.2, 0.45, [0, -0.32, 0], undefined, { r2: 0.17 })],
    foot: [box('mech', [0.42, 0.14, 0.55], [0, 0.07, 0.08], undefined, 0.06), ball('armor', 0.18, [0, 0.1, 0.3], [1.1, 0.6, 0.8])],
  },
}
