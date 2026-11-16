import { mainEvent } from '../data/mock'
import type { Match } from '../game/useMatch'

const CORNER = ['var(--color-red)', 'var(--color-blue)'] as const

const ago = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000))
  return s < 5 ? 'now' : s < 60 ? `${s}s` : `${Math.floor(s / 60)}m`
}

/** Recent buys and cash-outs in this match (Traded events on-chain), newest first.
 *  plain: no own heading or divider, for use inside a titled Panel. */
export function LiveTrades({ match, limit = 6, plain = false }: { match: Match; limit?: number; plain?: boolean }) {
  const items = match.feed.slice(0, limit)
  return (
    <section aria-labelledby={plain ? undefined : 'trades-title'} aria-label={plain ? 'Live trades' : undefined} className={plain ? '' : 'mt-3 border-t border-line pt-3'}>
      {!plain && (
        <h3 id="trades-title" className="flex items-center gap-2 font-display text-lg font-bold uppercase">
          Live trades
          {match.tradingOpen && <span className="blink h-2 w-2 rounded-full bg-red" aria-hidden />}
        </h3>
      )}
      {items.length === 0 ? (
        <p className="mt-1 text-sm text-mute">{match.tradingOpen ? 'No trades yet. Be the first.' : 'No trades yet this match.'}</p>
      ) : (
        <>
        <ol className="divide-y divide-line">
          {items.map((t) => {
            const f = mainEvent.fighters[t.side]!
            return (
              <li key={t.key} className={`feed-in flex items-center gap-2 py-1.5 text-sm ${t.mine ? '-mx-2 bg-well px-2' : ''}`}>
                <span className="w-[4.5rem] shrink-0 truncate font-mono text-xs text-mute" title={t.who}>
                  {t.mine ? <strong className="font-body text-sm text-ink">You</strong> : t.who}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  <span className={t.isBuy ? 'text-ink' : 'text-mute'}>{t.isBuy ? 'bought' : 'cashed out'}</span>{' '}
                  <span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: CORNER[t.side] }} aria-hidden />
                  <span className="font-semibold">{f.name}</span>
                </span>
                <span className="w-10 shrink-0 text-right font-display tabular-nums">{t.mon.toFixed(2)}</span>
                <span className="w-8 shrink-0 text-right text-xs tabular-nums text-mute">{ago(match.now - t.at)}</span>
              </li>
            )
          })}
        </ol>
        </>
      )}
    </section>
  )
}
