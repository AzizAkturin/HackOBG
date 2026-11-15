import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { brands } from '../data/brands'
import { formatClock, mainEvent, roundLabel } from '../data/mock'
import type { Round } from '../game/useRound'
import type { FightEvent } from '../three/director'
import { MOVES } from '../three/moves'

const Arena = lazy(() => import('../three/Arena'))

interface Props {
  round: Round
  selected: number | null
  onSelect: (i: number) => void
}

/**
 * Mock token progress, derived from time since the bell. Replace with
 * `progress` events from the live stream (tokens / budget per fighter).
 */
const MOCK_FINISH_SEC = [24, 27]
const mockProgress = (elapsed: number) => MOCK_FINISH_SEC.map((d) => Math.min(1, Math.max(0, elapsed / d)))

export function Octagon({ round, selected, onSelect }: Props) {
  const { locked, phase, secondsLeft, total } = round
  const remaining = Math.max(0, secondsLeft) / mainEvent.locksInSec
  const urgent = !locked && secondsLeft <= 15
  const [red, blue] = mainEvent.fighters
  const progress = mockProgress(locked ? -secondsLeft : 0)
  const live = phase !== 'betting'
  const [callout, setCallout] = useState<{ key: number; text: string; color: string } | null>(null)

  const onEvent = useCallback((e: FightEvent) => {
    if (e.reaction !== 'hit' && e.reaction !== 'knockdown') return
    const f = mainEvent.fighters[e.attacker]
    setCallout({
      key: Date.now(),
      text: e.reaction === 'knockdown' ? 'Knockdown!' : `${MOVES[e.move].label}!`,
      color: f.accent,
    })
  }, [])

  useEffect(() => {
    if (!callout) return
    const t = setTimeout(() => setCallout(null), 900)
    return () => clearTimeout(t)
  }, [callout])

  return (
    <section aria-labelledby="octagon-title">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <p className="label flex flex-wrap items-center gap-x-3 text-mute">
            <span className="text-blue">{mainEvent.weightClass}</span>
            <span>{roundLabel(mainEvent.roundId)}</span>
          </p>
          <h1 id="octagon-title" className="mt-1.5 text-xl leading-tight sm:text-2xl">
            {mainEvent.task}
          </h1>
        </div>
        <dl className="flex shrink-0 gap-6 font-display">
          <div>
            <dt className="label text-mute">{locked ? 'Round' : 'Bell in'}</dt>
            <dd className={`text-3xl font-bold tabular-nums ${locked || urgent ? 'text-red' : 'text-ink'}`}>
              {phase === 'rest' ? 'BREAK' : locked ? 'LIVE' : formatClock(secondsLeft)}
            </dd>
          </div>
          <div>
            <dt className="label text-mute">Pool</dt>
            <dd className="text-3xl font-bold tabular-nums text-gold">{total.toFixed(2)}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-3 h-1 bg-well" aria-hidden>
        <div
          className={`h-full transition-[width] duration-1000 ease-linear ${urgent ? 'bg-red shadow-[0_0_12px_rgb(255_77_77/0.8)]' : 'bg-gold shadow-[0_0_12px_rgb(255_201_74/0.6)]'}`}
          style={{ width: `${remaining * 100}%` }}
        />
      </div>

      <div
        className="panel theme-dark relative mx-auto mt-3 aspect-[2/1] overflow-hidden p-0"
        style={{ width: 'min(100%, calc((100vh - 230px) * 2))' }}
        role="img"
        aria-label={`The ring: ${red.name} in the red corner, ${blue.name} in the blue corner. Click a robot to back it.`}
      >
        <Suspense fallback={<div className="grid h-full place-items-center text-mute">Loading the arena…</div>}>
          <Arena selected={selected} phase={phase} onSelect={onSelect} onEvent={onEvent} />
        </Suspense>

        {/* broadcast HUD */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 bg-gradient-to-b from-black/70 to-transparent p-3 sm:p-5">
          {mainEvent.fighters.map((f, i) => (
            <div key={f.id} className={`w-[42%] max-w-sm ${i === 1 ? 'text-right' : ''}`}>
              <p className="headline text-xl uppercase leading-none sm:text-3xl" style={{ color: brands[f.brand].ui }}>
                {f.name}
              </p>
              {live && (
                <div
                  className={`mt-2 h-1.5 skew-x-[-20deg] bg-white/10 ${i === 1 ? 'ml-auto' : ''}`}
                  role="progressbar"
                  aria-label={`${f.name} task progress`}
                  aria-valuenow={Math.round(progress[i] * 100)}
                >
                  <div
                    className={`h-full transition-[width] duration-500 ${i === 1 ? 'ml-auto' : ''}`}
                    style={{ width: `${progress[i] * 100}%`, background: brands[f.brand].glow, boxShadow: `0 0 10px ${brands[f.brand].glow}` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {callout && (
          <p
            key={callout.key}
            className="pop headline pointer-events-none absolute left-1/2 top-[38%] whitespace-nowrap text-5xl uppercase sm:text-7xl"
            style={{ color: callout.color, textShadow: '0 4px 24px rgb(0 0 0 / 0.8)' }}
          >
            {callout.text}
          </p>
        )}
        {phase === 'rest' && (
          <div className="pop pointer-events-none absolute left-1/2 top-[40%] text-center">
            <p className="headline text-4xl uppercase sm:text-6xl">End of round</p>
            <p className="label mt-2 text-cyan-300">Fighters to their corners · voting opens</p>
          </div>
        )}
        {!locked && <p className="label pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 text-ink/70">Click a robot to back it</p>}
      </div>
    </section>
  )
}
