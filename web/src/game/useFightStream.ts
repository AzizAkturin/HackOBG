import { useEffect, useMemo, useReducer, useRef } from 'react'
import { initialStream, neutralSignals, streamReducer, type FightSignals, type StreamEvent } from './fightStream'

/** Per-fighter progress and status feed for the current fight, plus the signals the 3D ring reads, fed by the server's fight events. */
export function useFightStream(events: StreamEvent[], elapsed: number, live: boolean) {
  const [state, dispatch] = useReducer(streamReducer, undefined, initialStream)
  const signals = useMemo<FightSignals>(() => neutralSignals(), [])
  const count = useRef(0)

  useEffect(() => {
    if (!live) {
      count.current = 0
      signals.pace.fill(0.5)
      signals.cues.length = 0
      dispatch({ type: 'reset' })
      return
    }
    const fresh = events.slice(count.current)
    count.current = events.length
    for (const e of fresh) if (e.kind === 'action') signals.cues.push({ fighter: e.fighter, move: e.move, intensity: e.intensity })
    dispatch({ type: 'advance', to: elapsed, events: fresh })
  }, [events, elapsed, live, signals])

  useEffect(() => {
    state.fighters.forEach((f, i) => {
      signals.pace[i] = f.pace
    })
  }, [state, signals])

  return { fighters: state.fighters, signals }
}
