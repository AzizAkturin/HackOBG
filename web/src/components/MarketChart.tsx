import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { coefficient } from '@wab/shared'
import type { MarketHistory, PricePoint } from '../game/marketHistory'

export type ChartFighter = { name: string }

// Corner colours: fixed categorical pair, validated for colour-blind separation (protan ΔE 29) and 3:1 contrast.
const SERIES = ['var(--color-red)', 'var(--color-blue)'] as const
const CORNER = ['Red corner', 'Blue corner'] as const

const PAD = { top: 40, right: 44, bottom: 28, left: 8 }
const SHORT: Record<string, string> = { 'Elevator pitch': 'Pitch' }

const pct = (p: number) => `${Math.round(p * 100)}%`
const mult = (p: number) => {
  const c = coefficient(p)
  return c >= 100 ? '99x+' : `${c < 10 ? c.toFixed(2) : c.toFixed(1)}x`
}
const mon = (v: number) => v.toFixed(v < 1 ? 3 : 2)
const clock = (t: number) => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })

/** Price of `side` at time t: the last point at or before t (prices hold between trades). */
function priceAt(points: PricePoint[], t: number) {
  let p = points[0]!.priceA
  for (const pt of points) {
    if (pt.t > t) break
    p = pt.priceA
  }
  return p
}

type Props = {
  fighters: [ChartFighter, ChartFighter]
  history: MarketHistory
  /** the market runs locally on the contract's math until the contract is deployed; the fights themselves are real */
  simulated?: boolean
  /** Narrow column next to the arena: tighter legend, chart fills the column's height. */
  compact?: boolean
  className?: string
  /** Rendered inside the panel under the chart, e.g. the trade ticket. */
  children?: ReactNode
}

export function MarketChart({ fighters, history, simulated, compact, className = '', children }: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(640)
  const [H, setH] = useState(260)
  const [hoverT, setHoverT] = useState<number | null>(null)

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      setWidth(Math.max(260, Math.floor(e!.contentRect.width)))
      setH(Math.max(180, Math.floor(e!.contentRect.height)))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { points, spans, start, now, position } = history
  const innerW = width - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const x = (t: number) => PAD.left + ((t - start) / (now - start)) * innerW
  const y = (p: number) => PAD.top + (1 - p) * innerH
  const tFromX = (px: number) => start + ((px - PAD.left) / innerW) * (now - start)

  // Step lines: a price holds until the next trade or round result, like Polymarket's chart.
  const line = (f: (p: number) => number) => {
    let d = `M${x(points[0]!.t)},${y(f(points[0]!.priceA))}`
    for (const pt of points.slice(1)) d += `H${x(pt.t)}V${y(f(pt.priceA))}`
    return d + `H${x(now)}`
  }
  const paths = [line((p) => p), line((p) => 1 - p)]

  const last = points[points.length - 1]!.priceA
  const current = [last, 1 - last]

  // end labels follow their dot: try above, then below, then further out, and take the first spot clear of every line and the other label
  const labelY = (() => {
    type Box = { x0: number; x1: number; y0: number; y1: number }
    const obstacles: Box[] = [(p: number) => p, (p: number) => 1 - p].flatMap((f) =>
      points.flatMap((pt, k) => {
        const yy = y(f(pt.priceA))
        const x0 = x(pt.t)
        const out: Box[] = [{ x0, x1: x(points[k + 1]?.t ?? now), y0: yy, y1: yy }]
        if (k > 0) {
          const prev = y(f(points[k - 1]!.priceA))
          out.push({ x0, x1: x0, y0: Math.min(prev, yy), y1: Math.max(prev, yy) })
        }
        return out
      }),
    )
    const out: number[] = []
    const order = [0, 1].sort((a, b) => current[b]! - current[a]!)
    for (const [rank, i] of order.entries()) {
      const right = x(now) - 8
      const w = (fighters[i]!.name.length + 4) * 7.2
      const dotY = y(current[i]!)
      const offsets = Array.from({ length: 8 }, (_, k) => [-(10 + 16 * k), 18 + 16 * k]).flatMap((pair) => (rank === 0 ? pair : pair.reverse()))
      const hits = (by: number) => {
        const box = { x0: right - w - 2, x1: right + 2, y0: by - 13, y1: by + 5 }
        return obstacles.filter((o) => o.x1 >= box.x0 && o.x0 <= box.x1 && o.y1 >= box.y0 && o.y0 <= box.y1).length
      }
      let best = Math.min(Math.max(dotY + offsets[0]!, PAD.top + 12), PAD.top + innerH - 4)
      let bestHits = Infinity
      for (const off of offsets) {
        const by = dotY + off
        if (by - 11 < PAD.top || by + 3 > PAD.top + innerH) continue
        const h = hits(by)
        if (h < bestHits) {
          best = by
          bestHits = h
          if (h === 0) break
        }
      }
      out[i] = best
      obstacles.push({ x0: right - w, x1: right, y0: best - 11, y1: best + 3 })
    }
    return out
  })()
  const shown = hoverT ?? now
  const atHover = priceAt(points, shown)
  const hoverPrices = [atHover, 1 - atHover]
  const posValue = (p: number) => (position ? position.shares * (position.side === 0 ? p : 1 - p) : 0)

  // Snap the crosshair to the nearest price change so readers land on real values.
  const snap = (t: number) => {
    const ts = points.map((p) => p.t).concat(now)
    return ts.reduce((best, v) => (Math.abs(v - t) < Math.abs(best - t) ? v : best), ts[0]!)
  }
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const t = tFromX(e.clientX - r.left)
    setHoverT(t < start || t > now ? null : snap(t))
  }
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const ts = points.map((p) => p.t).concat(now)
    const i = hoverT === null ? ts.length - 1 : ts.indexOf(hoverT)
    const next = Math.min(ts.length - 1, Math.max(0, i + (e.key === 'ArrowRight' ? 1 : -1)))
    setHoverT(ts[next]!)
  }
  const span = spans.find((s) => shown >= s.from && shown <= s.to)

  const tooltipLeft = hoverT === null ? 0 : Math.min(Math.max(x(hoverT) - 90, 0), width - 180)

  return (
    <section aria-labelledby="market-title" className={`panel flex flex-col ${compact ? 'p-4' : 'p-5'} ${className}`}>
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="market-title" className="font-display text-xl font-bold uppercase tracking-wide text-ink">
          Market
        </h2>
        {simulated && (
          <span className="label border border-line px-2 py-0.5 text-[10px] text-mute" title="Fights are live LLM calls. Trades and crowd are simulated with the contract's math until it is deployed on Monad.">
            Simulated market
          </span>
        )}
      </header>

      {/* Legend: name, chance, payout multiplier (Polymarket-style) */}
      <ul className={`mt-3 grid grid-cols-2 ${compact ? 'gap-1.5' : 'gap-2'}`}>
        {fighters.map((f, i) => (
          <li key={f.name} className={`flex items-center border border-line ${compact ? 'gap-2 px-2 py-1.5' : 'gap-3 px-3 py-2'}`}>
            <svg width="16" height="4" aria-hidden className="shrink-0">
              <line x1="0" y1="2" x2="16" y2="2" stroke={SERIES[i]} strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display text-lg font-semibold leading-tight text-ink">{f.name}</span>
              {!compact && <span className="text-sm text-mute">{CORNER[i]}</span>}
            </span>
            <span className="text-right tabular-nums">
              <span className={`block font-display font-bold leading-none text-ink ${compact ? 'text-xl' : 'text-2xl'}`}>
                {pct(current[i]!)}
              </span>
              <span className="text-sm text-mute">{mult(current[i]!)}</span>
            </span>
          </li>
        ))}
      </ul>

      <div ref={wrap} className={`relative mt-3 ${compact ? 'h-[220px]' : 'h-[260px]'}`}>
        <svg
          width={width}
          height={H}
          role="img"
          aria-label={`Price history. ${fighters[0].name} ${pct(current[0]!)}, ${fighters[1].name} ${pct(current[1]!)}. Use left and right arrow keys to step through price changes.`}
          tabIndex={0}
          onPointerMove={onMove}
          onPointerLeave={() => setHoverT(null)}
          onKeyDown={onKey}
          onBlur={() => setHoverT(null)}
          className="absolute inset-0 block touch-pan-y outline-offset-4"
        >
          {/* trading-closed bands with their stage name */}
          {spans
            .filter((s) => !s.trading)
            .map((s) => (
              <g key={`${s.label}-${s.from}`}>
                <rect x={x(s.from)} y={PAD.top} width={Math.max(0, x(Math.min(s.to, now)) - x(s.from))} height={innerH} fill="var(--color-well)" />
                {(() => {
                  // Two short lines (round, then winner); labels near the right edge align right so they stay inside.
                  const nearEnd = x(s.from) + 64 > width - PAD.right
                  const lx = nearEnd ? width - PAD.right : x(s.from) + 4
                  const anchor = nearEnd ? 'end' : 'start'
                  return (
                    <text x={lx} y={PAD.top - 22} textAnchor={anchor} className="fill-[var(--color-mute)] font-display text-[11px] font-semibold uppercase tracking-wider">
                      <tspan x={lx}>{SHORT[s.label] ?? s.label}</tspan>
                      {s.result && (
                        <tspan x={lx} dy="12" className="fill-[var(--color-ink)] normal-case tracking-normal">
                          {s.result}
                        </tspan>
                      )}
                    </text>
                  )
                })()}
              </g>
            ))}

          {/* recessive hairline grid + right axis */}
          {[0, 0.25, 0.5, 0.75, 1].map((p) => (
            <g key={p}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(p)} y2={y(p)} stroke="var(--color-line)" strokeWidth="1" />
              <text x={width - PAD.right + 8} y={y(p) + 4} className="fill-[var(--color-mute)] text-[11px] tabular-nums">
                {pct(p)}
              </text>
            </g>
          ))}
          <text x={PAD.left} y={H - 8} className="fill-[var(--color-mute)] text-[11px]">
            {clock(start)}
          </text>
          <text x={width - PAD.right} y={H - 8} textAnchor="end" className="fill-[var(--color-mute)] text-[11px]">
            Now
          </text>

          {paths.map((d, i) => (
            <path key={i} d={d} fill="none" stroke={SERIES[i]} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          ))}

          {/* where you bought */}
          {position && (
            <g>
              <circle
                cx={x(position.at)}
                cy={y(position.side === 0 ? position.price : 1 - position.price)}
                r="5"
                fill="var(--color-panel)"
                stroke={SERIES[position.side]}
                strokeWidth="2"
              />
              <text
                x={x(position.at) + 8}
                y={y(position.side === 0 ? position.price : 1 - position.price) + 18}
                className="fill-[var(--color-ink)] text-[11px] font-semibold"
              >
                You bought
              </text>
            </g>
          )}

          {/* end dots with a surface ring, plus direct labels */}
          {current.map((p, i) => (
            <g key={i}>
              <circle cx={x(now)} cy={y(p)} r="4" fill={SERIES[i]} stroke="var(--color-panel)" strokeWidth="2" />
              <text
                x={x(now) - 8}
                y={labelY[i]}
                textAnchor="end"
                stroke="var(--color-panel)"
                strokeWidth="3"
                paintOrder="stroke"
                className="fill-[var(--color-ink)] text-[12px] font-semibold"
              >
                {fighters[i]!.name} {pct(p)}
              </text>
            </g>
          ))}

          {hoverT !== null && (
            <g pointerEvents="none">
              <line x1={x(hoverT)} x2={x(hoverT)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--color-ink)" strokeWidth="1" />
              {hoverPrices.map((p, i) => (
                <circle key={i} cx={x(hoverT)} cy={y(p)} r="4" fill={SERIES[i]} stroke="var(--color-panel)" strokeWidth="2" />
              ))}
            </g>
          )}
        </svg>

        {hoverT !== null && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 w-[180px] border border-line bg-panel p-2 text-sm shadow-md"
            style={{ left: tooltipLeft }}
          >
            <p className="text-mute">
              {clock(hoverT)}
              {span && ` · ${span.trading ? 'trading' : span.label}`}
            </p>
            {hoverPrices.map((p, i) => (
              <p key={i} className="flex items-center gap-2">
                <svg width="12" height="4" aria-hidden>
                  <line x1="0" y1="2" x2="12" y2="2" stroke={SERIES[i]} strokeWidth="2" strokeLinecap="round" />
                </svg>
                <strong className="tabular-nums text-ink">{pct(p)}</strong>
                <span className="tabular-nums text-mute">{mult(p)}</span>
                <span className="truncate text-mute">{fighters[i]!.name}</span>
              </p>
            ))}
            {position && hoverT >= position.at && (
              <p className="mt-1 border-t border-line pt-1 text-ink">
                Your bet ≈ <strong className="tabular-nums">{mon(posValue(atHover))} MON</strong>
              </p>
            )}
          </div>
        )}
      </div>

      {position && <YourBet fighters={fighters} position={position} price={last} compact={compact} />}

      {children}

      <details className={`${compact ? 'mt-2' : 'mt-4'} text-sm`}>
        <summary className="label cursor-pointer text-[11px] text-mute hover:text-ink">Price history table</summary>
        <div className="mt-2 max-h-56 overflow-y-auto">
          <table className="w-full text-left tabular-nums">
            <thead className="text-mute">
              <tr>
                <th className="py-1 font-normal">Time</th>
                <th className="py-1 font-normal">{fighters[0].name}</th>
                <th className="py-1 font-normal">{fighters[1].name}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.t} className="border-t border-line">
                  <td className="py-1">{clock(p.t)}</td>
                  <td className="py-1">
                    {pct(p.priceA)} · {mult(p.priceA)}
                  </td>
                  <td className="py-1">
                    {pct(1 - p.priceA)} · {mult(1 - p.priceA)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}

function YourBet({
  fighters,
  position,
  price,
  compact,
}: {
  fighters: [ChartFighter, ChartFighter]
  position: NonNullable<MarketHistory['position']>
  price: number
  compact?: boolean
}) {
  const sidePrice = position.side === 0 ? price : 1 - price
  const worth = position.shares * sidePrice
  const change = worth / position.paid - 1
  const up = change >= 0
  return (
    <dl className={`grid grid-cols-2 border-t border-line ${compact ? 'mt-3 gap-x-3 gap-y-2 pt-3' : 'mt-4 gap-3 pt-4 sm:grid-cols-4'}`}>
      <div>
        <dt className="text-sm text-mute">Your bet</dt>
        <dd className="font-display text-base font-semibold leading-tight sm:text-lg text-ink">
          {mon(position.paid)} MON on {fighters[position.side].name}
        </dd>
      </div>
      <div>
        <dt className="text-sm text-mute">Bought at</dt>
        <dd className="font-display text-base font-semibold leading-tight sm:text-lg tabular-nums text-ink">
          {pct(position.price)} · {mult(position.price)}
        </dd>
      </div>
      <div>
        <dt className="text-sm text-mute">Worth now</dt>
        <dd className="font-display text-base font-semibold leading-tight sm:text-lg tabular-nums text-ink">
          ≈ {mon(worth)} MON{' '}
          <span className={up ? 'text-green' : 'text-red'}>
            ({up ? '▲ +' : '▼ '}
            {Math.round(change * 100)}%)
          </span>
        </dd>
      </div>
      <div>
        <dt className="text-sm text-mute">Pays if {fighters[position.side].name} wins</dt>
        <dd className="font-display text-base font-semibold leading-tight sm:text-lg tabular-nums text-ink">{mon(position.shares)} MON</dd>
      </div>
    </dl>
  )
}
