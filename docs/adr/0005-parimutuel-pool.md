# 0005: Parimutuel pool with entry fee and rake

**Status:** Superseded by [0017](0017-live-market-five-stages.md)

## Context
The product is "bet on one competitor among several", like horse racing. Each round needs an entry fee. Higher weight classes should be higher-stakes.

## Decision
Parimutuel (tote) betting:
- The entry fee is the class `minBet`, and it is part of your bet. You may add up to `maxBet`.
- One entry per address per round. Top-ups must go to the same fighter.
- Rake (`rakeBps`, default 5%) is taken from the total pool at settlement and sent to the treasury.
- Winners split `totalPool - rake` in proportion to their bets.
- If nobody backed the winner, everyone can refund in full and no rake is taken.
- Live implied odds are `(totalPool - rake) / poolByIndex[i]`.

The house never takes the other side of a bet, so it can never be insolvent.

## Alternatives considered
- **Fixed odds set by the house:** the house carries risk and needs a bankroll and odds-setting logic.
- **LMSR / AMM shares per fighter:** the most "prediction market", lets people trade during the fight, but the math and UX are too much for 9 hours.
- **Separate non-refundable entry fee plus a bet:** two numbers to explain. Folding the fee into the min bet gives the same effect.
- **Multiple entries per address (hedging across fighters):** makes "one entry = one vote" ambiguous.

## Consequences
Odds move until lock, so early bettors don't get a guaranteed price. The UI must say "odds are final at lock". Payout math is in [blockchain.md section 6](../blockchain.md#6-money-flow-and-payout-math).

## How to change
Payout logic is isolated in `settle` (rake) and `claim` (share). An AMM would replace `enter`/`claim` and add buy/sell functions, and the `Entered` event shape would change, which affects the frontend odds board and the indexer.
