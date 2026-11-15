import { brands } from '../data/brands'
import { mainEvent } from '../data/mock'
import type { Round } from '../game/useRound'
import { firmware } from '../three/robots/firmware'
import { RobotBadge } from './RobotBadge'

interface Props {
  index: number
  round: Round
  selected: boolean
  onSelect: () => void
  className?: string
}

export function FighterCard({ index, round, selected, onSelect, className = '' }: Props) {
  const f = mainEvent.fighters[index]
  const corner = index === 0 ? 'Red corner' : 'Blue corner'
  const share = round.pools[index] / round.total
  const myStake = round.myBets.filter((b) => b.fighter === index).reduce((a, b) => a + b.amount, 0)

  const stats: [string, string][] = [
    ['Record', `${f.record[0]}-${f.record[1]}`],
    ['ELO', String(f.elo)],
  ]

  return (
    <article
      aria-label={`${corner}: ${f.name}`}
      className={`panel flex flex-col p-5 ${className}`}
      style={selected ? { borderColor: f.accent } : undefined}
    >
      <header className="flex items-center justify-between">
        <span className="label text-[11px]" style={{ color: f.accent }}>
          {corner}
        </span>
        <span className="font-display text-3xl tabular-nums text-gold">{round.odds(index).toFixed(2)}x</span>
      </header>

      <div className="mt-3 flex items-center gap-4">
        <div className="grid h-24 w-24 shrink-0 place-items-center border border-line bg-well">
          <RobotBadge brand={brands[f.brand]} firmware={firmware[f.weightClass]} size={80} />
        </div>
        <div className="min-w-0">
          <h2 className="headline text-3xl uppercase leading-none">{f.name}</h2>
          <p className="text-xl italic" style={{ color: f.accent }}>
            {f.model}
          </p>
        </div>
      </div>

      <dl className="mt-4 divide-y divide-line border-y border-line">
        {stats.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 py-1.5 text-lg">
            <dt className="text-mute">{k}</dt>
            <dd className="truncate tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4">
        <p className="text-lg text-mute">{round.backers[index]} backers</p>
        <div className="mt-1 h-2 bg-well" aria-hidden>
          <div className="h-full transition-[width] duration-500" style={{ width: `${share * 100}%`, background: f.accent }} />
        </div>
        {myStake > 0 && <p className="mt-1 text-lg text-gold">You: {myStake.toFixed(2)} MON</p>}
      </div>

      <button
        type="button"
        onClick={onSelect}
        disabled={round.locked}
        aria-pressed={selected}
        className="btn-pixel mt-auto min-h-12 w-full cursor-pointer border-2 font-display text-lg font-bold uppercase tracking-wider transition-colors"
        style={{
          borderColor: f.accent,
          background: selected ? f.accent : 'transparent',
          color: selected ? '#fff' : f.accent,
          marginTop: '1.25rem',
        }}
      >
        {selected ? '✓ Selected' : 'Back'}
      </button>
    </article>
  )
}
