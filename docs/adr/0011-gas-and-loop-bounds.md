# 0011: Bounded loops, never hardcode gas limits

**Status:** Accepted

## Context
Monad charges `gas_bid * gas_limit`, not gas used. Overestimated limits are pure loss. Unbounded loops make estimates unreliable and can exceed block limits.

## Decision
- At most 8 fighters per round. Tally and lookup loops iterate at most 8 times. Per-round arrays are fixed-size `[8]`.
- No loops over entrants anywhere (pull payments, [0008](0008-pull-payments.md)).
- Frontend and backend always use `estimateGas` (viem default), never a hardcoded `gas:`. The backend may add a small 10 to 20% buffer for operator txs only.
- Pack a round's hot fields in one struct (Monad warms storage per 128-slot page, so co-located reads are cheaper).

## Alternatives considered
Dynamic arrays for fighters: no real benefit, and it makes gas variable.

## Consequences
The "customizable fighter count" is 2 to 8. More than 8 needs a contract change.

## How to change
Raise the constant `MAX_FIGHTERS` and the array sizes together. Gas for `settle` grows linearly, which is fine up to dozens.
