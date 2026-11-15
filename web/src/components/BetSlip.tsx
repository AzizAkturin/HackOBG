import { useState } from 'react'
import { classLimits, firstName, mainEvent } from '../data/mock'
import type { Round } from '../game/useRound'

interface Props {
  round: Round
  selected: number | null
  onPlaced: (msg: string) => void
  className?: string
}

const { min, max } = classLimits[mainEvent.weightClass]
const chips = [min, 0.1, 0.25, max]

export function BetSlip({ round, selected, onPlaced, className = '' }: Props) {
  const { balance, locked, payoutFor, placeBet } = round
  const [raw, setRaw] = useState('0.1')
  const amount = Number(raw)
  const fighter = selected === null ? null : mainEvent.fighters[selected]

  let error = ''
  if (!Number.isFinite(amount) || amount <= 0) error = 'Enter an amount'
  else if (amount < min) error = `Min bet is ${min} MON`
  else if (amount > max) error = `Max bet in ${mainEvent.weightClass} is ${max} MON`
  else if (amount > balance) error = 'Not enough MON'

  const payout = selected === null || error ? 0 : payoutFor(selected, amount)
  const canBet = fighter && !error && !locked

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canBet || selected === null) return
    if (placeBet(selected, amount)) onPlaced(`${amount} MON on ${firstName(fighter.name)}`)
  }

  return (
    <form onSubmit={submit} aria-labelledby="slip-title" className={`panel flex flex-col p-5 ${className}`}>
      <p className="chroma text-center font-pixel text-5xl font-bold" aria-hidden>
        VS
      </p>
      <h2 id="slip-title" className="label mt-3 scroll-mt-24 text-center text-[11px] text-mute">
        Your bet
      </h2>
      <p className="mt-1 text-center font-pixel text-xl uppercase" style={{ color: fighter?.accent }}>
        {fighter ? fighter.name : <span className="text-mute">Pick a corner</span>}
      </p>

      <label htmlFor="stake" className="label mt-5 block text-[11px] text-mute">
        Stake · MON
      </label>
      <input
        id="stake"
        inputMode="decimal"
        autoComplete="off"
        value={raw}
        onChange={(e) => setRaw(e.target.value.replace(',', '.'))}
        aria-invalid={!!error}
        aria-describedby="stake-help"
        className="mt-2 w-full border-2 border-line bg-night px-3 py-2 font-pixel text-2xl tabular-nums tracking-widest outline-none focus:border-gold"
      />
      <p id="stake-help" className={`mt-1 text-lg ${error && raw ? 'text-red' : 'text-mute'}`} role={error ? 'alert' : undefined}>
        {error && raw ? error : `${min}–${max} · balance ${balance.toFixed(2)}`}
      </p>

      <div className="mt-2 grid grid-cols-4 gap-2">
        {chips.map((c, i) => (
          <button
            key={c}
            type="button"
            onClick={() => setRaw(String(c))}
            className={`min-h-11 cursor-pointer border-2 font-pixel text-sm tabular-nums transition-colors ${
              amount === c ? 'border-gold text-gold' : 'border-line text-ink hover:border-mute'
            }`}
          >
            {i === chips.length - 1 ? 'MAX' : c}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-baseline justify-between border-2 border-dashed border-line px-3 py-2">
        <span className="label text-[11px] text-mute">Win pays</span>
        <span className="font-pixel text-2xl tabular-nums text-green">{payout > 0 ? payout.toFixed(3) : '---'}</span>
      </div>

      <button
        type="submit"
        disabled={!canBet}
        className="btn-pixel mt-5 min-h-14 w-full cursor-pointer bg-gold font-pixel text-lg font-bold uppercase tracking-wider text-night hover:bg-ink"
      >
        {locked ? 'Bets locked' : fighter ? `Back ${firstName(fighter.name)} ▸` : 'Pick a corner'}
      </button>
      <p className="mt-3 text-center text-base text-mute">Testnet play money. No real value.</p>
    </form>
  )
}
