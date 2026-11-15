import { Link } from 'react-router'
import { FightCard } from '../components/FightCard'
import { LiveTrades } from '../components/LiveTrades'
import { Panel } from '../components/Panel'
import { TopFighters } from '../components/TopFighters'
import { roundLabel, mainEvent } from '../data/mock'
import type { Match } from '../game/useMatch'

export function StatsPage({ match }: { match: Match }) {
  return (
    <main className="mx-auto max-w-[1400px] px-4 pb-12 pt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="headline text-3xl uppercase sm:text-4xl">Rankings</h1>
        <Link to="/" className="label flex min-h-11 items-center text-[11px] text-blue hover:underline">
          ◂ Back to the ring
        </Link>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <FightCard match={match} />
        <div className="min-w-0 space-y-5">
          <TopFighters />
          <Panel title={`Live trades · ${roundLabel(mainEvent.roundId)}`} titleId="stats-trades-title">
            <LiveTrades match={match} limit={8} plain />
          </Panel>
        </div>
      </div>
    </main>
  )
}
