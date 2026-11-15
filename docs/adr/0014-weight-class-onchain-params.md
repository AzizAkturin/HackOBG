# 0014: Weight classes, money params on-chain and capability params off-chain

**Status:** Accepted

## Context
Weight classes are defined by model capability (model tier, context/token budget, reasoning level, time limit) and should carry higher stakes at higher tiers. The contract only needs the parts that touch money and timing.

## Decision
- **On-chain** (`WeightClass` struct): `minBet` (entry fee), `maxBet`, `rakeBps`, `voteDuration`, `settleGrace`, `active`, and `configHash`.
- **Off-chain** (DB, hashed into `configHash`): allowed models, max output tokens, reasoning level, fight time limit, and visual tier theming.
- Classes are owner-configurable at any time. `createRound` **snapshots** `minBet`, `maxBet`, `rakeBps`, `voteDuration` and `settleGrace` into the `Round` struct, so an owner edit never changes the rules of a round that already has bets in it.

## Alternatives considered
- **Everything off-chain:** the contract couldn't enforce the entry fee or rake.
- **Everything on-chain (model names, token budgets):** strings in storage, and the contract can't enforce off-chain model behavior anyway.

## Consequences
"Fighter really used a Heavyweight model" is not provable on-chain. It is backed only by the committed config plus the transcripts we publish.

## How to change
Add fields to `WeightClass` (and to the round snapshot) and to the deploy script's class setup. Off-chain class fields change freely, as long as the new `configHash` is pushed with `setWeightClass`.
