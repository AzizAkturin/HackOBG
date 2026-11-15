// round pacing: a tension curve plus a mode machine, so fights breathe and build toward the bell
import type { Rng } from './rng.ts'

export type Mode = 'feel' | 'work' | 'flurry' | 'lull' | 'swarm' | 'recover'

export interface Rhythm {
  mode: Mode
  /** fight time the mode ends */
  until: number
  /** 0..1 how hot the fight is right now */
  intensity: number
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** base tension at round progress p (0..1): low feel-out, plateau, late ramp. */
export const tension = (p: number) => 0.3 + 0.35 * smooth(0.08, 0.3, p) + 0.35 * smooth(0.7, 1, p)

const OFFSET: Record<Mode, number> = { feel: -0.15, work: 0, flurry: 0.3, lull: -0.3, swarm: 0.4, recover: -0.2 }

export const startRhythm = (t: number): Rhythm => ({ mode: 'feel', until: t + 2.5, intensity: 0.2 })

export interface RhythmInput {
  t: number
  /** round progress 0..1 */
  p: number
  /** mean stamina of both fighters */
  stamina: number
  /** someone is rocked */
  rocked: boolean
  /** live effort of both models, 0..1.5 (0.5 when unknown) */
  work: number
}

export function stepRhythm(r: Rhythm, x: RhythmInput, rng: Rng): Rhythm {
  let { mode, until } = r
  if (x.rocked && mode !== 'swarm') {
    mode = 'swarm'
    until = x.t + 3
  } else if (x.t >= until) {
    const heat = tension(x.p) * (0.6 + 0.4 * x.stamina) * (0.7 + 0.3 * x.work)
    mode =
      mode === 'swarm'
        ? 'recover'
        : rng.pick<Mode>([
            ['work', 3],
            ['flurry', 0.6 + heat * 2.2],
            ['lull', 0.4 + (1 - heat) * 1.8 + (1 - x.stamina) * 1.5],
          ])
    until = x.t + (mode === 'flurry' ? rng.range(1.8, 3.2) : mode === 'lull' ? rng.range(1.5, 3) : mode === 'recover' ? 2 : rng.range(3, 6))
  }
  const intensity = Math.min(1, Math.max(0, tension(x.p) + OFFSET[mode]))
  return { mode, until, intensity }
}

/** gap before the next exchange: log-normal, so pacing is uneven rather than uniform. */
export function gap(r: Rhythm, stamina: number, rng: Rng): number {
  const median = 1.6 - 1.25 * r.intensity + (1 - stamina) * 0.5
  return Math.max(0.12, rng.logNormal(Math.max(0.2, median), 0.45))
}
