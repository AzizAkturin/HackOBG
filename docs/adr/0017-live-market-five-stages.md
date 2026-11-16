# 0017: Live 1v1 prediction market over five stages

**Status:** Accepted. Supersedes [0005](0005-parimutuel-pool.md); replaces the single final vote in [0007](0007-winner-by-blind-onchain-vote.md) with one vote per round.

## Context

We want Polymarket-style live trading: buy a fighter at the start, watch its price move as the match goes, and either cash out early or hold to the end, where a winning share pays a fixed amount. A parimutuel pool can't do this: your payout depends on everyone else's bets and isn't known until the end, and there's no price to sell at mid-match.

How Polymarket works (researched November 2026):

- Each market has outcome tokens. One YES plus one NO can always be made from $1 or merged back into $1. The winner pays $1 and the loser $0, so the price is the probability.
- Prices come from an order book between users, matched off-chain and settled on-chain. The displayed price is the bid/ask midpoint, or the last trade if the spread is over $0.10.
- You can sell any time before resolution at the best bid. That's the cash-out.
- Live sports markets delay marketable orders by about 1 to 3 s, so courtside watchers can't trade on a result before everyone else. Sports taker fees are price-dependent, largest near 50/50.
- An order book needs constant liquidity, so Polymarket pays market makers. It started with an automated market maker and moved to the order book at the end of 2022.

## Decision

**Market**
- Each match is 1v1 and binary. A share of a fighter pays **1 MON if it wins and 0 if it loses**, and the two prices always sum to 1 MON. This is Polymarket's token model.
- Liquidity comes from an **LMSR automated market maker**, not an order book, because a hackathon-sized crowd would leave a book empty. The price is `σ(anchor + (sharesA − sharesB)/b)`. Buying pushes a price up and selling pushes it down. `b` (liquidity, per class) sets how far.
- Buy and sell costs are exact LMSR integrals, using Solady's `expWad` and `lnWad`. Users get `quoteBuy` and `quoteSell` views and pass slippage limits.
- The fee is Polymarket-style: `feeBps × 4p(1−p)` of the trade value, so 2% at 50/50 and nearly 0 near certainty.

**House**
- The house is the counterparty. Each match locks the class `bankroll` (1 MON) from `houseBalance`, which the owner funds with `fundHouse`.
- **Solvency invariant:** after every trade, `pool ≥ max(sharesA, sharesB)`, so every winning share is always payable. Trades that would break it revert with `MarketFull`. The house can lose at most the bankroll.
- When the match ends, `pool + fees − winning shares` returns to `houseBalance`. The treasury can withdraw only free house MON.

**Five stages, best of 3**
1. **Start:** the market opens at odds from both fighters' on-chain records. Each record becomes a smoothed win rate `(wins + 1) / (fights + 2)` (new fighters count as 50%). The two rates are combined head to head with the log5 formula into fighter A's per-round chance `q`, clamped to 20-80%. The opening price is A's chance of taking a best of 3, `q²(3 − 2q)`. Trading runs until `tradeEnd`. `roundOddsFor` and `openingPriceA` expose this before a match exists.
2. **Elevator pitch**, 3. **Aspects** (scalability, profit, …), 4. **MVP:** for each round, trading closes while the fighters work. The operator opens voting with a commitment to the blind label mapping and a tie-break. Every address holding shares in that match gets one on-chain vote for "Pitch A" or "Pitch B". `resolveRound` reveals the mapping, counts the votes (ties and empty votes go to the committed tie-winner), and then:
   - if a fighter has 2 round wins, the match resolves (2-0 skips the MVP round);
   - otherwise the price is **re-anchored** to fighter A's chance of taking the best of 3 from that score with the same `q`: `1 − (1 − q)²` when 1-0 up, `q²` when 1-0 down, `q` when level. For evenly matched fighters that's 75% / 25% / 50%. Trading then reopens for `tradeWindow` seconds at that price.
5. **Result:** `claim` pays 1 MON per winning share.

Trading is only possible in the windows after each vote. That's a stricter version of Polymarket's in-game delay: no one can trade on a result before the price reflects it. Later buyers pay the new price, so the same MON buys fewer shares of a leader.

**Failure path:** every stage has a deadline. If the operator stalls, anyone can `cancelExpired`. Each trader then gets back `max(0, paid − received)` (fees included), pro rata if the match funds fall short, and the rest returns to the house.

## Alternatives considered

- **Order book (Polymarket today):** the real thing, but it needs active market makers and off-chain matching infrastructure, and thin books mean no cash-out. Worth revisiting if usage grows, with the house quoting as a market maker.
- **House-quoted fixed odds (sportsbook cash-out):** simple, but the operator sets every price and nothing reflects demand.
- **LMSR without re-anchoring:** prices would only move when people trade, not when a fighter wins a round. That's not what the product wants.
- **Off-chain anonymous votes:** free and private, but the tally would be trust-the-server. We chose on-chain votes by position holders: verifiable, sybil-resistant (you need a position), with blind labels. The trade-off is that each voter's choice is public.
- **Boxing 10-point scoring or total vote share:** keeps the MVP round always relevant, but is harder to explain. We chose best of 3 for clarity.

## Consequences

- One `WAB` contract still holds everything ([0003](0003-single-contract.md)). Pull payments ([0008](0008-pull-payments.md)) are kept for `claim` and `refund`. `sell` pays immediately behind a reentrancy guard.
- The contract is compiled with `via_ir` (the match struct is too large for the legacy pipeline).
- The operator sends 1 + up to 6 transactions per match (create, then openVoting and resolveRound per round) and never sends value, so Monad's 10 MON reserve rule doesn't block it.
- The house bankroll is real budget: 3 MON funds 3 concurrent matches.

## How to change

- Price movement: class `liquidity` (b). Fee: class `feeBps`. Opening odds: `roundOddsFor` (smoothing, log5, `MIN/MAX_ROUND_ODDS`). Re-anchor rule: `_matchOdds`.
- Rounds to win: `ROUNDS_TO_WIN`, plus the re-anchor table in `resolveRound`.
- Order book later: keep the 1-MON share model and `claim`; replace `buy`/`sell` with settlement of signed orders, and have the house post quotes from the same LMSR.
