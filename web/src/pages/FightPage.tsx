import { useCallback, useState } from 'react'
import { BetSlip } from '../components/BetSlip'
import { FighterCard } from '../components/FighterCard'
import { Octagon } from '../components/Octagon'
import { VotingBooth } from '../components/VotingBooth'
import type { Round } from '../game/useRound'

export function FightPage({ round, onPlaced }: { round: Round; onPlaced: (msg: string) => void }) {
  const [selected, setSelected] = useState<number | null>(null)

  const select = useCallback((i: number) => {
    setSelected(i)
    // On stacked layouts the slip sits below the fighter cards; bring it into view.
    if (window.matchMedia('(max-width: 1023px)').matches) {
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      document.getElementById('slip-title')?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center' })
    }
  }, [])

  if (round.phase === 'voting' || round.phase === 'reveal') {
    return (
      <main className="mx-auto max-w-[1400px] px-4 pb-12 pt-6">
        <VotingBooth round={round} />
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-[1400px] px-4 pb-12 pt-6">
      <Octagon round={round} selected={selected} onSelect={select} />
      <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_360px_minmax(0,1fr)]">
        <FighterCard index={0} round={round} selected={selected === 0} onSelect={() => select(0)} />
        <BetSlip
          round={round}
          selected={selected}
          onPlaced={onPlaced}
          className="md:col-span-2 md:row-start-2 lg:col-span-1 lg:col-start-2 lg:row-start-1"
        />
        <FighterCard index={1} round={round} selected={selected === 1} onSelect={() => select(1)} />
      </div>
    </main>
  )
}
