// Float mirror of the WAB contract's market math (contracts/src/WAB.sol), for charts, previews and the
// server. The contract is the source of truth: for real trades, use its quoteBuy / quoteSell views.

/** The five stages of a match. */
export const STAGES = ["Start", "Elevator pitch", "Aspects", "MVP", "Result"] as const;
export type StageIndex = 0 | 1 | 2 | 3 | 4;

export const MIN_ROUND_ODDS = 0.2;
export const MAX_ROUND_ODDS = 0.8;

export const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
export const logit = (p: number) => Math.log(p / (1 - p));
const softplus = (x: number) => (x > 0 ? x + Math.log1p(Math.exp(-x)) : Math.log1p(Math.exp(x)));

/** Decimal odds ("coefficient"): what 1 MON pays if this side wins, before fees and price impact. */
export const coefficient = (price: number) => (price > 0 ? 1 / price : Infinity);

/** Smoothed win rate: new fighters count as 50%. */
export const winRate = (wins: number, losses: number) => (wins + 1) / (wins + losses + 2);

/** Fighter A's chance of winning one round against B (log5 of smoothed win rates), clamped to 20-80%. */
export function roundOdds(a: { wins: number; losses: number }, b: { wins: number; losses: number }) {
  const ra = winRate(a.wins, a.losses);
  const rb = winRate(b.wins, b.losses);
  const q = (ra * (1 - rb)) / (ra * (1 - rb) + rb * (1 - ra));
  return Math.min(MAX_ROUND_ODDS, Math.max(MIN_ROUND_ODDS, q));
}

/** Fighter A's chance of taking the best of 3 from a score, given per-round odds q. */
export function matchOdds(q: number, winsA: number, winsB: number) {
  if (winsA >= 2) return 1;
  if (winsB >= 2) return 0;
  if (winsA === winsB) return winsA === 0 ? q * q * (3 - 2 * q) : q;
  return winsA > winsB ? 1 - (1 - q) ** 2 : q * q;
}

/** Polymarket-style fee: feeBps at 50/50, shrinking toward 0 near certainty. */
export const feeFor = (amount: number, price: number, feeBps: number) => (amount * feeBps * 4 * price * (1 - price)) / 10_000;

/** LMSR state for one match. Amounts are in MON. side 0 = fighter A, 1 = fighter B. */
export type MarketState = { anchor: number; sharesA: number; sharesB: number; liquidity: number; feeBps: number };

export const logitA = (m: MarketState) => m.anchor + (m.sharesA - m.sharesB) / m.liquidity;
export const priceA = (m: MarketState) => sigmoid(logitA(m));
const sideLogit = (m: MarketState, side: 0 | 1) => (side === 0 ? logitA(m) : -logitA(m));

export function openMarket(q: number, liquidity: number, feeBps: number): MarketState {
  return { anchor: logit(matchOdds(q, 0, 0)), sharesA: 0, sharesB: 0, liquidity, feeBps };
}

export function quoteBuy(m: MarketState, side: 0 | 1, value: number) {
  const s = sideLogit(m, side);
  const fee = feeFor(value, sigmoid(s), m.feeBps);
  const y = softplus(s) + (value - fee) / m.liquidity;
  const shares = Math.max(0, (Math.log(Math.expm1(y)) - s) * m.liquidity);
  return { shares, fee };
}

export function quoteSell(m: MarketState, side: 0 | 1, shares: number) {
  const s = sideLogit(m, side);
  const gross = Math.min(shares, m.liquidity * (softplus(s) - softplus(s - shares / m.liquidity)));
  const fee = feeFor(gross, sigmoid(s), m.feeBps);
  return { proceeds: gross - fee, fee };
}

export function applyTrade(m: MarketState, side: 0 | 1, shareDelta: number): MarketState {
  return side === 0 ? { ...m, sharesA: m.sharesA + shareDelta } : { ...m, sharesB: m.sharesB + shareDelta };
}

/** After a round: reset the price to fighter A's chance of winning from the new score. */
export function reanchor(m: MarketState, q: number, winsA: number, winsB: number): MarketState {
  return { ...m, anchor: logit(matchOdds(q, winsA, winsB)) - (m.sharesA - m.sharesB) / m.liquidity };
}
