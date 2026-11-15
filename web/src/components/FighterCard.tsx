import { coefficient } from '@wab/shared'
import { brands } from '../data/brands'
import { mainEvent } from '../data/mock'
import type { Match } from '../game/useMatch'
import { firmware } from '../three/robots/firmware'
import { RobotBadge } from './RobotBadge'

interface Props {
  index: 0 | 1
  match: Match
  selected: boolean
  onSelect: () => void
  className?: string
}

const CORNER = ['var(--color-red)', 'var(--color-blue)'] as const

export function FighterCard({ index, match, selected, onSelect, className = '' }: Props) {
  const f = mainEvent.fighters[index]
  const corner = index === 0 ? 'Red corner' : 'Blue corner'
  const price = index === 0 ? match.priceA : 1 - match.priceA
  const shares = match.shares[index]!

  const stats: [string, string][] = [
    ['Record', `${f.record[0]}-${f.record[1]}`],
    ['ELO', String(f.elo)],
    ['Rounds won', `${match.wins[index]} of 2 needed`],
  ]

  return (
    <article aria-label={`${corner}: ${f.name}`} className={`panel flex flex-col p-5 ${className}`} style={selected ? { borderColor: CORNER[index] } : undefined}>
      <header className="flex items-start justify-between gap-3">
        <span className="label text-[11px]" style={{ color: CORNER[index] }}>
          {corner}
        </span>
        <span className="text-right font-display leading-none tabular-nums">
          <span className="block text-3xl font-bold text-ink">{Math.round(price * 100)}%</span>
          <span className="text-base text-mute">{coefficient(price).toFixed(2)}x</span>
        </span>
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

      {shares > 0 && (
        <p className="mt-3 text-lg">
          You hold <strong className="tabular-nums">{shares.toFixed(3)}</strong> shares · pays{' '}
          <strong className="tabular-nums text-green">{shares.toFixed(3)} MON</strong> if {f.name} wins
        </p>
      )}

      <button
        type="button"
        onClick={onSelect}
        disabled={!match.tradingOpen}
        aria-pressed={selected}
        className="btn-pixel mt-auto min-h-12 w-full cursor-pointer border-2 font-display text-lg font-bold uppercase tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          borderColor: CORNER[index],
          background: selected ? CORNER[index] : 'transparent',
          color: selected ? '#fff' : CORNER[index],
          marginTop: '1.25rem',
        }}
      >
        {!match.tradingOpen ? 'Trading closed' : selected ? `✓ Buying ${f.name}` : `Buy ${f.name}`}
      </button>
    </article>
  )
}
