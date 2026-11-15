import { useEffect, useMemo, useReducer, useRef } from 'react'
import { initialStream, mockEvents, neutralSignals, streamReducer, type FightSignals } from './fightStream'

/** Per-fighter progress and status feed for the current fight, plus the signals the 3D ring reads, advanced by fight seconds. */
export function useFightStream(elapsed: number, live: boolean) {
  const [state, dispatch] = useReducer(streamReducer, undefined, initialStream)
  const signals = useMemo<FightSignals>(() => neutralSignals(), [])
  const at = useRef(0)

  useEffect(() => {
    if (!live) {
      at.current = 0
      signals.pace.fill(0.5)
      signals.cues.length = 0
      dispatch({ type: 'reset' })
      return
    }
    if (elapsed <= at.current) return
    const events = mockEvents(at.current, elapsed)
    at.current = elapsed
    for (const e of events) if (e.kind === 'action') signals.cues.push({ fighter: e.fighter, move: e.move, intensity: e.intensity })
    dispatch({ type: 'advance', to: elapsed, events })
  }, [elapsed, live, signals])

  useEffect(() => {
    state.fighters.forEach((f, i) => {
      signals.pace[i] = f.pace
    })
  }, [state, signals])

  return { fighters: state.fighters, signals }
}
