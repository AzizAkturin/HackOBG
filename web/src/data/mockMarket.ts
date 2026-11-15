// SAMPLE DATA: a simulated five-stage match between the mock main-event fighters, built with the same
// market math as the contract. Replace with on-chain history (MatchCreated / Traded / RoundResolved
// events, which carry timestamps) once the stage runner creates real matches.
import { applyTrade, openMarket, priceA, quoteBuy, reanchor, roundOdds, type MarketState } from '@wab/shared'
import { mainEvent } from './mock'

export type PricePoint = { t: number; priceA: number }
/** A stretch of the match. Trading is closed while fighters work and the audience votes. */
export type StageSpan = { stage: number; label: string; from: number; to: number; trading: boolean; result?: string }
export type MyPosition = { side: 0 | 1; shares: number; paid: number; at: number; price: number }

export type MarketHistory = {
  points: PricePoint[]
  spans: StageSpan[]
  start: number
  now: number
  stage: number
  position: MyPosition | null
  roundOdds: number
}

/** Small deterministic PRNG so the sample looks the same on every load. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

export function sampleMarket(now = Date.now()): MarketHistory {
  const [red, blue] = mainEvent.fighters
  const q = roundOdds({ wins: red.record[0], losses: red.record[1] }, { wins: blue.record[0], losses: blue.record[1] })
  const rand = rng(7)
  const sec = 1000
  // Timeline (seconds from start): open 180, then per round: fight 90 + vote 60 + trade 60.
  const start = now - 11 * 60 * sec
  let m: MarketState = openMarket(q, 1, 200)
  const points: PricePoint[] = [{ t: start, priceA: priceA(m) }]
  const spans: StageSpan[] = []
  let t = start
  let position: MyPosition | null = null

  const tradeWindow = (len: number, bias: number, mine = false) => {
    const end = t + len * sec
    let ti = t
    if (mine) {
      const price = priceA(m)
      const { shares } = quoteBuy(m, 0, 0.1)
      ti += 9 * sec
      m = applyTrade(m, 0, shares)
      points.push({ t: ti, priceA: priceA(m) })
      position = { side: 0, shares, paid: 0.1, at: ti, price }
    }
    while (true) {
      ti += (6 + rand() * 14) * sec
      if (ti >= end) break
      const side: 0 | 1 = rand() < bias ? 0 : 1
      const { shares } = quoteBuy(m, side, 0.02 + rand() * 0.08)
      m = applyTrade(m, side, rand() < 0.2 ? -shares * 0.6 : shares) // some cash-outs
      points.push({ t: ti, priceA: priceA(m) })
    }
    t = end
  }

  const rounds: { label: string; winner: 0 | 1 }[] = [
    { label: 'Elevator pitch', winner: 0 },
    { label: 'Aspects', winner: 1 },
  ]

  spans.push({ stage: 1, label: 'Start', from: t, to: t + 180 * sec, trading: true })
  tradeWindow(180, 0.45, true)

  let wins = [0, 0]
  rounds.forEach((r, i) => {
    const closedFrom = t
    t += 150 * sec // fight 90 s + vote 60 s
    wins = wins.map((w, k) => (k === r.winner ? w + 1 : w))
    const name = r.winner === 0 ? red.name : blue.name
    spans.push({ stage: i + 2, label: r.label, from: closedFrom, to: t, trading: false, result: `${name} won` })
    m = reanchor(m, q, wins[0], wins[1])
    points.push({ t, priceA: priceA(m) })
    spans.push({ stage: i + 2, label: 'Trading', from: t, to: t + 60 * sec, trading: true })
    tradeWindow(60, r.winner === 0 ? 0.6 : 0.35)
  })

  // Now: the MVP round is being fought and voted on, so trading is closed.
  spans.push({ stage: 4, label: 'MVP', from: t, to: now, trading: false })
  return { points, spans, start, now, stage: 4, position, roundOdds: q }
}
