import type { Chassis } from '../chassis'
import { AX_X, AX_Z, ball, box, cone, cyl, hose, sym, torus, type MatKey, type Part } from '../parts'

const R = 0.72

const teeth: Part[] = Array.from({ length: 18 }, (_, n) => {
  const a = (n / 18) * Math.PI * 2
  return box('dark', [0.06, 0.12, 0.05], [Math.sin(a) * 0.67, 0.08, Math.cos(a) * 0.67], [0, a, 0], 0.01)
})

const studs: Part[] = (['pip1', 'pip2', 'pip3', 'dark', 'dark', 'dark'] as MatKey[]).map((m, n) =>
  ball(m, 0.035, [n % 2 ? 0.07 : -0.07, 0.08 - Math.floor(n / 2) * 0.12, 0.16]),
)

export const gyro: Chassis = {
  label: 'Gyro',
  blurb: 'Drum-bodied unicycle that rolls on a single ball.',
  rig: { scale: 1, hip: 1.5, thigh: 0, hipX: 0, shoulder: [0.95, 0.9, 0], neck: [0, 1.3, 0], wheel: R },
  finish: { metalness: 0.3, roughness: 0.1, clearcoat: 0.3, grime: true },
  wheel: [
    ball('rubber', R),
    torus('dark', R + 0.005, 0.02, undefined, [0, Math.PI / 2, 0]),
    ...sym(torus('dark', 0.655, 0.015, [0.3, 0, 0], [0, Math.PI / 2, 0]), cyl('mech', 0.2, 0.06, [0.71, 0, 0], AX_X)),
  ],
  pelvis: [
    cyl('mech', 0.62, 0.1, [0, -0.02, 0], undefined, { seg: 28 }),
    cyl('armor', 0.66, 0.14, [0, 0.08, 0], undefined, { seg: 28 }),
    ...teeth,
    ...sym(box('mech', [0.08, 0.7, 0.2], [0.78, -0.42, 0], undefined, 0.03)),
  ],
  torso: [
    cyl('armor', 0.4, 0.5, [0, 0.25, 0]),
    ...[0.04, 0.12, 0.2, 0.28, 0.36, 0.44].map((y) => torus('armor', 0.41, 0.025, [0, y, 0], AX_Z)),
    ...sym(hose('rubber', [0.3, 0.0, 0.3], [0.32, 0.52, 0.32], 0.015, 0.04)),
    hose('fw', [-0.1, 0.0, 0.42], [-0.14, 0.52, 0.43], 0.016, 0.04),
    hose('fw', [0.12, 0.0, 0.42], [0.08, 0.52, 0.43], 0.016, 0.04),
    cyl('mech', 0.64, 0.06, [0, 0.52, 0], undefined, { seg: 28 }),
    cyl('armor', 0.62, 0.42, [0, 0.74, 0], undefined, { seg: 28 }),
    cyl('hazard', 0.625, 0.12, [0, 0.86, 0], undefined, { seg: 28 }),
    cyl('mech', 0.58, 0.04, [0, 0.96, 0], undefined, { seg: 28 }),
    cyl('dark', 0.09, 0.06, [0, 0.7, 0.62], AX_Z),
    torus('chrome', 0.1, 0.02, [0, 0.7, 0.635]),
    box('chest', [0.24, 0.14, 0.04], [-0.32, 0.68, 0.53], [0, -0.55, 0], 0.01),
  ],
  head: [
    cyl('armor', 0.17, 0.55, [0, -0.02, 0]),
    ...studs,
    cyl('eye', 0.045, 0.03, [0, 0.19, 0.17], AX_Z, { seg: 14 }),
    cyl('mech', 0.18, 0.04, [0, 0.27, 0]),
    cone('chrome', 0.03, 0.15, [0, 0.36, 0]),
  ],
  arm: {
    shoulder: [
      cyl('armor', 0.3, 0.24, [0.05, 0.12, 0]),
      cyl('hazard', 0.305, 0.1, [0.05, 0.12, 0]),
      box('mech', [0.18, 0.16, 0.2], [0.02, -0.08, 0], undefined, 0.03),
      cyl('rubber', 0.09, 0.42, [0, -0.36, 0], undefined, { seg: 12 }),
      hose('fw', [0.1, -0.08, 0.05], [0.07, -0.55, 0.08], 0.014, 0.03),
    ],
    elbow: [
      ball('mech', 0.1),
      box('armor', [0.26, 0.4, 0.28], [0, -0.3, 0]),
      ball('dark', 0.12, [0.12, -0.32, 0.08], [0.6, 1.2, 0.8]),
      box('armor', [0.3, 0.2, 0.3], [0, -0.66, 0]),
      ...[-0.1, -0.033, 0.033, 0.1].map((x) => cyl('mech', 0.045, 0.22, [x, -0.85, 0.06], undefined, { seg: 10 })),
      cyl('mech', 0.045, 0.16, [-0.17, -0.74, 0.1], [0, 0, -0.6], { seg: 10 }),
      box('dark', [0.3, 0.08, 0.16], [0, -0.96, 0.08], undefined, 0.03),
    ],
  },
}
