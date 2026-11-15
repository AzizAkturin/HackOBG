import { Link } from 'react-router'
import { FightCard } from '../components/FightCard'
import { Ringside } from '../components/Ringside'
import { TopFighters } from '../components/TopFighters'
import type { Round } from '../game/useRound'

export function StatsPage({ round }: { round: Round }) {
  return (
    <main className="mx-auto max-w-[1400px] px-4 pb-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="steel text-3xl uppercase sm:text-4xl">Stats & rankings</h1>
        <Link to="/" className="label flex min-h-11 items-center text-[11px] text-gold hover:underline">
          ◂ Back to the ring
        </Link>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <FightCard secondsLeft={round.secondsLeft} locked={round.locked} />
        <div className="space-y-5">
          <TopFighters />
          <Ringside feed={round.feed} />
        </div>
      </div>
    </main>
  )
}
