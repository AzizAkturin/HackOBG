# 0003: One WAB contract, not upgradeable

**Status:** Accepted

## Context
We need weight classes, a fighter registry, rounds, bets, votes, settlement and payouts. Monad allows 128 KB contracts. We have 9 hours and one person on contracts.

## Decision
A single non-upgradeable `WAB.sol` holds everything. If we need changes, we redeploy and the backend re-registers fighters from its DB.

## Alternatives considered
- **Separate registry, market and voting contracts:** cleaner separation, but cross-contract calls, more deploy wiring and more ABIs, with no benefit at this scale.
- **Upgradeable proxy (UUPS):** keeps the address stable, but adds storage-layout risk and complexity. A testnet redeploy is cheap.
- **Factory with one contract per round:** isolates funds per round, but costs a deploy per round and makes indexing harder.

## Consequences
A redeploy loses on-chain history (old rounds and W/L stay on the old address). The DB keeps history, and fighter W/L can be re-seeded by passing initial counts to `registerFighter` if we ever need it.

## How to change
To split contracts: keep the event names from [blockchain.md section 5.4](../blockchain.md#54-events) so the indexer and frontend still work, and update `deployments/10143.json` to hold several addresses.
