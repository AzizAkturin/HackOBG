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
