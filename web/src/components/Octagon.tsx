import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { brands } from '../data/brands'
import { matchLabel } from '../data/fighters'
import { createBroadcast, updateBroadcast } from '../three/broadcast'
import { ROUNDS } from '../data/matchContent'
import type { Match } from '../game/useMatch'
import type { Phase as ArenaPhase } from '../game/arenaPhase'
import { useFightStream } from '../game/useFightStream'
import type { StreamEvent } from '../game/fightStream'
import type { FightEvent } from '../three/director'
import { FighterHud } from './FighterHud'
import { MOVES } from '../three/moves'

const Arena = lazy(() => import('../three/Arena'))
const NO_EVENTS: StreamEvent[] = []

interface Props {
  match: Match
  selected: number | null
  onSelect: (i: number) => void
}

/** Arena choreography for each match phase: spar while trading, fight in rounds, sit in corners for the vote. */
const arenaPhase = (m: Match): ArenaPhase =>
  m.phase === 'fighting' ? 'fighting' : m.phase === 'voting' ? 'rest' : m.phase === 'final' ? 'reveal' : 'betting'

export function Octagon({ match, selected, onSelect }: Props) {
  const [red, blue] = match.fighters
  const fighting = match.phase === 'fighting'
  const fightEvents = match.fight?.events ?? NO_EVENTS
  const elapsed = fighting && match.fight ? (match.now - match.fight.startedAt) / 1000 : 0
  const { fighters, signals } = useFightStream(fightEvents, elapsed, fighting)
  const [broadcast] = useState(() => createBroadcast(match.fighters))
  const round = ROUNDS[match.roundIndex]!
  useEffect(() => {
    updateBroadcast(broadcast, {
      fighters: match.fighters,
      task: match.setup.task,
      matchLabel: matchLabel(match.matchNo),
      weightClass: match.weightClass,
      round: `Round ${match.roundIndex + 1} · ${round.name}`,
      texts: match.fight?.texts ?? ['', ''],
      tokens: [fighters[0]!.tokens, fighters[1]!.tokens],
      budget: match.config?.limits.maxTokens ?? 0,
      finished: [fighters[0]!.finished, fighters[1]!.finished],
      wins: match.wins,
      priceA: match.priceA,
      fightSeconds: match.config?.limits.fightSeconds ?? 0,
    })
  })
  const [callout, setCallout] = useState<{ key: number; text: string; color: string } | null>(null)

  const onEvent = useCallback((e: FightEvent) => {
    if (e.reaction !== 'hit' && e.reaction !== 'knockdown') return
    const f = match.fighters[e.attacker]!
    setCallout({ key: Date.now(), text: e.reaction === 'knockdown' ? 'Knockdown!' : `${MOVES[e.move].label}!`, color: brands[f.brand].ui })
  }, [match.fighters])

  useEffect(() => {
    if (!callout) return
    const t = setTimeout(() => setCallout(null), 900)
    return () => clearTimeout(t)
  }, [callout])

  // A big broadcast banner for the first seconds of each phase, then a small persistent tag.
  const justStarted = match.phaseLen - match.secondsLeft < 4
  const last = match.results[match.results.length - 1]
  const banner =
    match.phase === 'fighting'
      ? { title: `Round ${match.roundIndex + 1}`, sub: round.name, color: '#fff' }
      : match.phase === 'voting'
        ? { title: 'Vote now', sub: 'Pick the better pitch below ↓', color: '#7fb0ff' }
        : match.phase === 'final' && last
          ? { title: `${match.fighters[last.winner].name} wins`, sub: `${match.wins[0]}–${match.wins[1]}`, color: brands[match.fighters[last.winner].brand].ui }
          : last
            ? { title: `${match.fighters[last.winner].name} takes it`, sub: `${ROUNDS[last.index]!.name} · ${match.wins[0]}–${match.wins[1]}`, color: brands[match.fighters[last.winner].brand].ui }
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
          <Arena fighters={match.fighters} broadcast={broadcast} selected={selected} phase={arenaPhase(match)} onSelect={onSelect} onEvent={onEvent} signals={signals} winner={match.winner} />
        </Suspense>

        {/* broadcast HUD: names, round-win pips, live progress */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 bg-gradient-to-b from-black/70 to-transparent p-3 sm:p-5">
          {match.fighters.map((f, i) => (
            <FighterHud key={i} name={f.name} nameColor={brands[f.brand].ui} glow={brands[f.brand].glow} right={i === 1} live={fighting ? fighters[i] : null} wins={match.wins[i]!} record={f.weightClass} model={f.label} />
          ))}
        </div>

        {callout && fighting && (
          <p
            key={callout.key}
            className="pop headline pointer-events-none absolute left-1/2 top-[38%] whitespace-nowrap text-5xl uppercase sm:text-7xl"
          >
            <span
              aria-hidden
              className="absolute inset-0 text-white"
              style={{ WebkitTextStroke: '0.22em #fff', filter: 'drop-shadow(0 0 18px rgb(255 255 255 / 0.55)) drop-shadow(0 6px 20px rgb(0 0 0 / 0.9))' }}
            >
              {callout.text}
            </span>
            <span className="relative" style={{ color: callout.color }}>
              {callout.text}
            </span>
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
      </div>
    </section>
  )
}
