# 0008: Pull payments

**Status:** Accepted

## Context
A round may have many winners. Pushing payouts in a loop during `settle` is unbounded gas (and on Monad, gas is billed on the limit), and one reverting receiver blocks everyone.

## Decision
`settle` only records the result. Winners call `claim(roundId)`, and cancelled or refund-mode rounds use `refund(roundId)`. Both follow checks-effects-interactions plus a `nonReentrant` guard and send via `call{value:}`. The UI shows a "Collect winnings" button and a list of unclaimed rounds on the profile.

## Alternatives considered
- **Push in settle:** unbounded loop, griefable.
- **Operator-batched push (backend calls `payoutBatch(roundId, from, to)`):** nicer UX, but the operator pays gas and it adds complexity. A possible later addition on top of pull.

## Consequences
Users must click to collect. Embedded wallets make this one tap.

## How to change
Add `payoutBatch` as an operator function that iterates a slice of entrants (requires tracking an entrant array per round). Keep `claim` working so funds are never stuck.
