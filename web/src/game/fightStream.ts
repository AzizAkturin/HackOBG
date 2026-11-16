import type { FightEvent as StreamEvent, Move } from '@wab/shared'

export type { StreamEvent }

export const STATUS_TTL_SEC = 10
export const STATUS_MAX = 3
export const TOKEN_BUDGET = 1500
/** tokens per second that counts as full effort: the whole budget in 20 s */
const PACE_REF = TOKEN_BUDGET / 20

export interface StatusItem {
  key: number
  text: string
  at: number
}

export interface FighterLive {
  tokens: number
  budget: number
  finished: boolean
  /** effort over the last window, 0 to 1.5 where 1 is the whole budget in 20 s */
  pace: number
  feed: StatusItem[]
}

export interface Cue {
  fighter: number
  move: Move
  intensity: number
}

/** What the 3D fight reads each frame: how hard each fighter is working, and moves waiting to be thrown. */
export interface FightSignals {
  pace: number[]
  cues: Cue[]
}

export const neutralSignals = (): FightSignals => ({ pace: [0.5, 0.5], cues: [] })

export const paceOf = (before: number, after: number, dtSec: number) =>
  dtSec > 0 ? Math.min(1.5, Math.max(0, (after - before) / dtSec / PACE_REF)) : 0

export interface StreamState {
  t: number
  nextKey: number
  fighters: FighterLive[]
}

export type StreamAction = { type: 'advance'; to: number; events: StreamEvent[] } | { type: 'reset' }

type Script = {
  finishAt: number
  /** [fight second, tokens so far]; flat stretches are thinking, steep ones are bursts */
  curve: [number, number][]
  steps: [number, string][]
  /** [fight second, move, intensity]: what the server would derive from the stream */
  acts: [number, Move, number][]
}

/** Stand-in for the live socket until the round runner streams real events. */
const MOCK: Script[] = [
  {
    finishAt: 21,
    curve: [[0, 0], [1, 0], [8, 520], [14, 820], [21, 1180]],
    steps: [
      [1, 'Reading the brief'],
      [3, 'Outlining the pitch'],
      [6, 'Drafting: The problem'],
      [10, 'Drafting: The numbers'],
      [14, 'Drafting: Launch plan'],
      [18, 'Writing the PITCH'],
    ],
    acts: [[4, 'jab', 0.5], [6, 'combo', 0.8], [7, 'jab', 0.6], [10, 'combo', 0.8], [14, 'combo', 0.8], [18, 'combo', 1], [21, 'taunt', 1]],
  },
  {
    finishAt: 23,
    curve: [[0, 0], [2, 60], [9, 120], [10, 200], [17, 900], [23, 1450]],
    steps: [
      [2, 'Thinking'],
      [9, 'Still thinking'],
      [10, 'Drafting: The problem'],
      [14, 'Drafting: The numbers'],
      [15, 'Retrying'],
      [19, 'Writing the PITCH'],
    ],
    acts: [[2, 'circle', 0.3], [6, 'circle', 0.6], [9, 'circle', 0.9], [10, 'combo', 0.8], [12, 'jab', 0.7], [13, 'jab', 0.8], [14, 'combo', 0.9], [15, 'stagger', 1], [19, 'combo', 1]],
  },
]

export const mockFighterCount = MOCK.length

export function mockTokens(fighter: number, t: number): number {
  const { curve, finishAt } = MOCK[fighter]
  if (t >= finishAt) return curve[curve.length - 1][1]
  const i = curve.findIndex(([at]) => at > t)
  if (i <= 0) return 0
  const [t0, v0] = curve[i - 1]
  const [t1, v1] = curve[i]
  return Math.round(v0 + ((v1 - v0) * (t - t0)) / (t1 - t0))
}

/** Events a fighter would have streamed in the window (from, to]. */
export function mockEvents(from: number, to: number): StreamEvent[] {
  const events: StreamEvent[] = []
  MOCK.forEach((s, fighter) => {
    for (const [at, text] of s.steps) if (at > from && at <= to) events.push({ kind: 'status', fighter, text })
    for (const [at, move, intensity] of s.acts) if (at > from && at <= to) events.push({ kind: 'action', fighter, move, intensity })
    const tokens = mockTokens(fighter, to)
    if (tokens !== mockTokens(fighter, from)) events.push({ kind: 'progress', fighter, tokens, budget: TOKEN_BUDGET })
    if (s.finishAt > from && s.finishAt <= to) {
      events.push({ kind: 'status', fighter, text: 'Finished' })
      events.push({ kind: 'finished', fighter, atMs: s.finishAt * 1000 })
    }
  })
  return events
}

export const initialStream = (): StreamState => ({
  t: 0,
  nextKey: 1,
  fighters: MOCK.map(() => ({ tokens: 0, budget: TOKEN_BUDGET, finished: false, pace: 0.5, feed: [] })),
})

function apply(state: StreamState, e: StreamEvent, t: number): StreamState {
  if (e.kind !== 'status' && e.kind !== 'progress' && e.kind !== 'finished') return state
  const fighters = state.fighters.map((f, i) => {
    if (i !== e.fighter) return f
    if (e.kind === 'progress') return { ...f, tokens: e.tokens, budget: e.budget }
    if (e.kind === 'finished') return { ...f, finished: true }
    return f
  })
  if (e.kind !== 'status') return { ...state, fighters }
  const item: StatusItem = { key: state.nextKey, text: e.text, at: t }
  return {
    ...state,
    nextKey: state.nextKey + 1,
    fighters: fighters.map((f, i) => (i === e.fighter ? { ...f, feed: [item, ...f.feed].slice(0, STATUS_MAX) } : f)),
  }
}

export function streamReducer(state: StreamState, action: StreamAction): StreamState {
  if (action.type === 'reset') return state.t === 0 && state.nextKey === 1 ? state : initialStream()
  if (action.to <= state.t) return state
  const next = action.events.reduce((s, e) => apply(s, e, action.to), { ...state, t: action.to })
  const dt = action.to - state.t
  return {
    ...next,
    fighters: next.fighters.map((f, i) => ({
      ...f,
      pace: paceOf(state.fighters[i].tokens, f.tokens, dt),
      feed: f.feed.filter((item) => action.to - item.at < STATUS_TTL_SEC),
    })),
  }
}
