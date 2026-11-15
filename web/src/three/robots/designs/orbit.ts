import type { Chassis } from '../chassis'
import { ball, sym, type Part } from '../parts'

// three eye dots sitting on the face ellipsoid
const eyes: Part[] = [-0.1, 0, 0.1].map((x) => ball('eye', 0.032, [x, 0.34, 0.06 + 0.225 * Math.sqrt(1 - (x / 0.2125) ** 2) + 0.005]))

export const orbit: Chassis = {
  label: 'Orbit',
  blurb: 'A string of glossy beads for limbs, with three dots for a face.',
  rig: { scale: 1.04, hip: 1.5, thigh: 0.75, hipX: 0.26, shoulder: [0.72, 0.98, 0], neck: [0, 1.42, 0] },
  finish: { metalness: 0.15, roughness: 0.2, clearcoat: 0.35, grime: false },
  pelvis: [ball('mech', 0.2, undefined, [1.5, 0.8, 1.1]), ...sym(ball('armor', 0.17, [0.3, -0.02, 0]))],
  torso: [
    ball('mech', 0.16, [0, 0.12, 0]),
    ball('armor', 0.3, [0, 0.5, 0], [1.15, 0.9, 0.9]),
    ball('armor', 0.46, [0, 1.0, 0], [1.15, 0.9, 0.85]),
    ball('armor', 0.3, [0, 1.0, -0.25], [1.2, 0.9, 0.8]),
    ball('chest', 0.07, [0, 1.0, 0.375], [1.4, 0.9, 0.3]),
    ball('pip1', 0.035, [-0.1, 0.52, 0.262]),
    ball('pip2', 0.035, [0, 0.52, 0.27]),
    ball('pip3', 0.035, [0.1, 0.52, 0.262]),
    ball('trim', 0.05, [0, 0.74, 0.255]),
    ball('mech', 0.1, [0, 1.4, 0]),
  ],
  head: [ball('mech', 0.08, [0, 0.04, 0]), ball('armor', 0.26, [0, 0.34, 0]), ball('dark', 0.2, [0, 0.34, 0.06], [1.06, 0.62, 1.12]), ...eyes],
  arm: {
    shoulder: [ball('armor', 0.17, [0.04, 0, 0]), ball('trim', 0.1, [0, -0.2, 0]), ball('armor', 0.1, [0, -0.34, 0]), ball('trim', 0.1, [0, -0.48, 0])],
    elbow: [
      ball('mech', 0.09),
      ball('armor', 0.1, [0, -0.2, 0]),
      ball('trim', 0.1, [0, -0.34, 0]),
      ball('armor', 0.1, [0, -0.48, 0]),
      ball('mech', 0.07, [0, -0.6, 0]),
      ball('trim', 0.2, [0, -0.8, 0.02], [1, 1.05, 1.05]),
      ball('dark', 0.07, [0, -0.88, 0.16]),
    ],
  },
  leg: {
    thigh: [ball('mech', 0.12), ball('armor', 0.16, [0, -0.22, 0]), ball('trim', 0.13, [0, -0.46, 0]), ball('armor', 0.12, [0, -0.62, 0])],
    knee: [ball('mech', 0.1), ball('armor', 0.14, [0, -0.2, 0]), ball('trim', 0.12, [0, -0.42, 0]), ball('armor', 0.11, [0, -0.6, 0]), ball('mech', 0.08, [0, -0.7, 0])],
    foot: [ball('trim', 0.16, [0, 0.11, 0.07], [1, 0.7, 1.7])],
  },
}
