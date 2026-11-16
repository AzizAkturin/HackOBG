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

export const initialStream = (): StreamState => ({
  t: 0,
  nextKey: 1,
  fighters: [0, 1].map(() => ({ tokens: 0, budget: TOKEN_BUDGET, finished: false, pace: 0.5, feed: [] })),
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
  if (action.to <= state.t) {
    // events that land between clock ticks still count, but pace needs elapsed time
    return action.events.length ? action.events.reduce((s, e) => apply(s, e, state.t), state) : state
  }
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
