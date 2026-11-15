import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { brands } from '../data/brands'
import { mainEvent } from '../data/mock'
import { ROUNDS } from '../data/matchContent'
import type { Match } from '../game/useMatch'
import type { Phase as ArenaPhase } from '../game/useRound'
import type { FightEvent } from '../three/director'
import { MOVES } from '../three/moves'

const Arena = lazy(() => import('../three/Arena'))

interface Props {
  match: Match
  selected: number | null
  onSelect: (i: number) => void
}

/** Arena choreography for each match phase: spar while trading, fight in rounds, sit in corners for the vote. */
const arenaPhase = (m: Match): ArenaPhase =>
  m.phase === 'fighting' ? 'fighting' : m.phase === 'voting' ? 'rest' : m.phase === 'final' ? 'reveal' : 'betting'

/**
 * Mock token progress for the current round. Replace with `progress` events from the live stream
 * (tokens / budget per fighter).
 */
const MOCK_FINISH = [0.85, 0.95]

export function Octagon({ match, selected, onSelect }: Props) {
  const [red, blue] = mainEvent.fighters
  const fighting = match.phase === 'fighting'
  const elapsed = 1 - match.secondsLeft / match.phaseLen
  const progress = MOCK_FINISH.map((d) => Math.min(1, Math.max(0, elapsed / d)))
  const [callout, setCallout] = useState<{ key: number; text: string; color: string } | null>(null)

  const onEvent = useCallback((e: FightEvent) => {
    if (e.reaction !== 'hit' && e.reaction !== 'knockdown') return
    const f = mainEvent.fighters[e.attacker]
    setCallout({ key: Date.now(), text: e.reaction === 'knockdown' ? 'Knockdown!' : `${MOVES[e.move].label}!`, color: f.accent })
  }, [])

  useEffect(() => {
    if (!callout) return
    const t = setTimeout(() => setCallout(null), 900)
    return () => clearTimeout(t)
  }, [callout])

  // A big broadcast banner for the first seconds of each phase, then a small persistent tag.
  const round = ROUNDS[match.roundIndex]!
  const justStarted = match.phaseLen - match.secondsLeft < 4
  const last = match.results[match.results.length - 1]
  const banner =
    match.phase === 'fighting'
      ? { title: `Round ${match.roundIndex + 1}`, sub: round.name, color: '#fff' }
      : match.phase === 'voting'
        ? { title: 'Vote now', sub: 'Pick the better pitch below ↓', color: '#7fb0ff' }
        : match.phase === 'final' && last
          ? { title: `${mainEvent.fighters[last.winner].name} wins`, sub: `${match.wins[0]}–${match.wins[1]}`, color: brands[mainEvent.fighters[last.winner].brand].ui }
          : last
            ? { title: `${mainEvent.fighters[last.winner].name} takes it`, sub: `${ROUNDS[last.index]!.name} · ${match.wins[0]}–${match.wins[1]}`, color: brands[mainEvent.fighters[last.winner].brand].ui }
            : null
  const tag =
    match.phase === 'fighting'
      ? `Round ${match.roundIndex + 1} · ${round.short} · live`
      : match.phase === 'voting'
        ? `Round ${match.roundIndex + 1} · voting`
        : match.phase === 'final'
          ? 'Final'
          : match.results.length === 0
            ? 'Pre-fight · trading open'
            : `Between rounds · trading open`

  return (
    <section aria-label="The ring">
      <div
        className="panel theme-dark relative mx-auto aspect-[2/1] overflow-hidden p-0"
        style={{ width: 'min(100%, calc((100vh - 300px) * 2))' }}
        role="img"
        aria-label={`The ring: ${red.name} in the red corner, ${blue.name} in the blue corner. ${tag}.`}
      >
        <Suspense fallback={<div className="grid h-full place-items-center text-mute">Loading the arena…</div>}>
          <Arena selected={selected} phase={arenaPhase(match)} onSelect={onSelect} onEvent={onEvent} />
        </Suspense>

        {/* broadcast HUD: names, round-win pips, live progress */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 bg-gradient-to-b from-black/70 to-transparent p-3 sm:p-5">
          {mainEvent.fighters.map((f, i) => (
            <div key={f.id} className={`w-[42%] max-w-sm ${i === 1 ? 'text-right' : ''}`}>
              <p className="headline text-xl uppercase leading-none sm:text-3xl" style={{ color: brands[f.brand].ui }}>
                {f.name}
              </p>
              <p className={`mt-1.5 flex gap-1 ${i === 1 ? 'justify-end' : ''}`} aria-label={`${match.wins[i]} rounds won`}>
                {[0, 1].map((k) => (
                  <span key={k} className="h-2 w-5 skew-x-[-20deg]" style={{ background: k < match.wins[i]! ? brands[f.brand].glow : 'rgb(255 255 255 / 0.15)' }} />
                ))}
              </p>
              {fighting && (
                <div
                  className={`mt-2 h-1.5 skew-x-[-20deg] bg-white/10 ${i === 1 ? 'ml-auto' : ''}`}
                  role="progressbar"
                  aria-label={`${f.name} task progress`}
                  aria-valuenow={Math.round(progress[i]! * 100)}
                >
                  <div
                    className={`h-full transition-[width] duration-500 ${i === 1 ? 'ml-auto' : ''}`}
                    style={{ width: `${progress[i]! * 100}%`, background: brands[f.brand].glow, boxShadow: `0 0 10px ${brands[f.brand].glow}` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {callout && fighting && (
          <p
            key={callout.key}
            className="pop headline pointer-events-none absolute left-1/2 top-[38%] whitespace-nowrap text-5xl uppercase sm:text-7xl"
            style={{ color: callout.color, textShadow: '0 4px 24px rgb(0 0 0 / 0.8)' }}
          >
            {callout.text}
          </p>
        )}
        {banner && justStarted && (
          <div key={`${match.phase}-${match.results.length}`} className="pop pointer-events-none absolute left-1/2 top-[34%] w-max max-w-[90%] text-center">
            <p className="headline text-5xl uppercase sm:text-7xl" style={{ color: banner.color, textShadow: '0 4px 24px rgb(0 0 0 / 0.85)' }}>
              {banner.title}
            </p>
            <p className="label mt-2 text-sm text-white/90">{banner.sub}</p>
          </div>
        )}
        <p className="label pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/60 px-3 py-1 text-[11px] text-white">
          {tag}
        </p>
      </div>
    </section>
  )
}
