import { useState, type FormEvent } from 'react'
import { coefficient } from '@wab/shared'
import { formatClock, mainEvent } from '../data/mock'
import { LIMITS, type Match, type Side } from '../game/useMatch'

const CORNER = ['var(--color-red)', 'var(--color-blue)'] as const
const CHIPS = [0.05, 0.1, 0.2, 0.3]
const pct = (p: number) => `${Math.round(p * 100)}%`
const mon = (v: number) => v.toFixed(3)

/** Buy either robot at the live price, or cash out what you hold. Mirrors the contract's buy/sell. */
export function TradeTicket({ match, side, onSide, onDone }: { match: Match; side: Side; onSide: (s: Side) => void; onDone: (msg: string) => void }) {
  const [raw, setRaw] = useState('0.1')
  const amount = Number(raw)
  const prices = [match.priceA, 1 - match.priceA]
  const f = mainEvent.fighters[side]!

  let error = ''
  if (!Number.isFinite(amount) || amount <= 0) error = 'Enter an amount'
  else if (amount < LIMITS.min) error = `Min ${LIMITS.min} MON`
  else if (amount > LIMITS.max) error = `Max ${LIMITS.max} MON per trade`
  else if (amount > match.balance + 1e-9) error = 'Not enough MON'

  const quote = !error && match.tradingOpen ? match.quoteBuy(side, amount) : null
  const reason =
    match.phase === 'fighting'
      ? `Closed while robots fight · reopens after the vote`
      : match.phase === 'voting'
        ? `Closed during the vote · reopens in ${formatClock(match.secondsLeft)}`
        : match.phase === 'final'
          ? 'Match over'
          : ''

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!quote) return
    match.buy(side, amount)
    onDone(`Bought ${quote.shares.toFixed(3)} ${f.name} shares`)
  }

  return (
    <form onSubmit={submit} aria-labelledby="ticket-title" className="mt-3 border-t border-line pt-3">
      <div className="flex items-baseline justify-between">
        <h3 id="ticket-title" className="font-display text-lg font-bold uppercase">
          Trade
        </h3>
        <span className="text-sm text-mute tabular-nums">Balance {match.balance.toFixed(3)} MON</span>
      </div>

      {/* side picker */}
      <div role="radiogroup" aria-label="Robot to buy" className="mt-2 grid grid-cols-2 gap-1.5">
        {mainEvent.fighters.map((fi, i) => {
          const on = side === i
          return (
            <button
              key={fi.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onSide(i as Side)}
              className="flex min-h-11 cursor-pointer items-center justify-between border-2 px-2 font-display font-semibold"
              style={{ borderColor: on ? CORNER[i] : 'var(--color-line)', background: on ? CORNER[i] : 'transparent', color: on ? '#fff' : 'var(--color-ink)' }}
            >
              <span className="truncate">{fi.name}</span>
              <span className="tabular-nums">{pct(prices[i]!)}</span>
            </button>
          )
        })}
      </div>

      {match.tradingOpen ? (
        <>
          <div className="mt-2 flex gap-1.5">
            <label htmlFor="amount" className="sr-only">
              Amount in MON
            </label>
            <input
              id="amount"
              inputMode="decimal"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              aria-invalid={!!error}
              aria-describedby="amount-help"
              className="min-w-0 flex-1 border-2 border-line bg-panel px-2 py-1.5 font-display text-xl tabular-nums outline-none focus:border-ink aria-invalid:border-red"
            />
            {CHIPS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setRaw(String(c))}
                className={`min-h-11 cursor-pointer border-2 px-2 font-display text-sm tabular-nums ${amount === c ? 'border-ink text-ink' : 'border-line text-mute hover:border-mute'}`}
              >
                {c}
              </button>
            ))}
          </div>
          <dl id="amount-help" className="mt-2 grid grid-cols-3 gap-1 text-sm">
            <div>
              <dt className="text-mute">Shares</dt>
              <dd className="font-display text-lg font-semibold tabular-nums">{quote ? quote.shares.toFixed(3) : '—'}</dd>
            </div>
            <div>
              <dt className="text-mute">Pays if wins</dt>
              <dd className="font-display text-lg font-semibold tabular-nums text-green">{quote ? `${mon(quote.shares)}` : '—'}</dd>
            </div>
            <div>
              <dt className="text-mute">Coefficient</dt>
              <dd className="font-display text-lg font-semibold tabular-nums">
                {quote ? `${(quote.shares / amount).toFixed(2)}x` : `${coefficient(prices[side]!).toFixed(2)}x`}
              </dd>
            </div>
          </dl>
          {error && (
            <p role="alert" className="text-sm text-red">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={!quote}
            className="btn-pixel mt-2 min-h-12 w-full cursor-pointer font-display text-lg font-bold uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: CORNER[side] }}
          >
            Buy {f.name} · {amount > 0 ? amount : 0} MON
          </button>
          {quote && <p className="mt-1 text-xs text-mute">Includes {mon(quote.fee)} MON fee. Price moves as you buy.</p>}
        </>
      ) : (
        <p className="mt-2 border border-dashed border-line px-3 py-2 text-base text-mute">{reason}</p>
      )}

      {/* holdings + cash out */}
      {match.holds && match.phase !== 'final' && (
        <ul className="mt-3 space-y-1.5">
          {[0, 1].map((i) =>
            match.shares[i]! > 0 ? (
              <li key={i} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  <strong style={{ color: CORNER[i] }}>{mainEvent.fighters[i]!.name}</strong>{' '}
                  <span className="tabular-nums text-mute">{match.shares[i]!.toFixed(3)} shares</span>
                </span>
                <button
                  type="button"
                  disabled={!match.tradingOpen}
                  onClick={() => {
                    const v = match.quoteCashOut(i as Side)
                    match.cashOut(i as Side)
                    onDone(`Cashed out ${v.toFixed(3)} MON`)
                  }}
                  className="min-h-9 cursor-pointer border-2 border-ink px-2 font-display font-semibold tabular-nums hover:bg-ink hover:text-white disabled:cursor-not-allowed disabled:border-line disabled:text-mute disabled:hover:bg-transparent"
                >
                  {match.tradingOpen ? `Cash out ${mon(match.quoteCashOut(i as Side))}` : 'Locked'}
                </button>
              </li>
            ) : null,
          )}
        </ul>
      )}
    </form>
  )
}
