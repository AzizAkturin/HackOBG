import { useCallback, useState } from 'react'
import { FighterCard } from '../components/FighterCard'
import { MarketChart } from '../components/MarketChart'
import { Octagon } from '../components/Octagon'
import { RoundDesk } from '../components/RoundDesk'
import { StageTracker } from '../components/StageTracker'
import { TradeTicket } from '../components/TradeTicket'
import { mainEvent, roundLabel } from '../data/mock'
import { useMatch, type Side } from '../game/useMatch'

/**
 * One page for the whole match: stage tracker on top, the ring with the round desk (fight status,
 * inline voting, round results) on the left, the live market and trade ticket on the right.
 */
export function FightPage({ onPlaced }: { onPlaced: (msg: string) => void }) {
  const match = useMatch()
  const [side, setSide] = useState<Side>(0)
  const [red, blue] = mainEvent.fighters

  const pick = useCallback((i: number) => {
    setSide(i as Side)
    // On stacked layouts the ticket sits below the ring; bring it into view.
    if (window.matchMedia('(max-width: 1023px)').matches) {
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      document.getElementById('ticket-title')?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center' })
    }
  }, [])

  return (
    <main className="mx-auto max-w-[1400px] px-4 pb-12 pt-5">
      <header className="min-w-0">
        <p className="label flex flex-wrap items-center gap-x-3 text-mute">
          <span className="text-blue">{mainEvent.weightClass}</span>
          <span>{roundLabel(mainEvent.roundId)}</span>
          <span>Best of 3</span>
        </p>
        <h1 className="mt-1 text-xl leading-tight sm:text-2xl">{mainEvent.task}</h1>
      </header>

      {/* stays pinned while scrolling to vote or trade, so the current round is always visible */}
      <div className="sticky top-0 z-30 -mx-4 mt-3 bg-night/90 px-4 py-2 backdrop-blur">
        <StageTracker match={match} />
      </div>

      <div className="mt-4 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 space-y-4">
          <Octagon match={match} selected={side} onSelect={pick} />
          <RoundDesk match={match} />
        </div>
        <MarketChart fighters={[{ name: red.name }, { name: blue.name }]} history={match.history} sample compact className="lg:sticky lg:top-[96px]">
          <TradeTicket match={match} side={side} onSide={setSide} onDone={onPlaced} />
        </MarketChart>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <FighterCard index={0} match={match} selected={side === 0} onSelect={() => pick(0)} />
        <FighterCard index={1} match={match} selected={side === 1} onSelect={() => pick(1)} />
      </div>
    </main>
  )
}
