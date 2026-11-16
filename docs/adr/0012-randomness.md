# 0012: Operator commit-reveal randomness now, Pyth Entropy later

**Status:** Accepted

## Context
Randomness is used for the pitch shuffle (which fighter is "Pitch A") and optionally for matchmaking and house task selection. Monad testnet has Pyth Entropy at `0x36825bf3Fbdf5a29E2d5148bfe7Dcf7B5639e320` and Supra dVRF. Both are async request/callback flows with a fee.

## Decision
MVP: the operator generates the shuffle and a salt off-chain and commits `keccak(roundId, labelToIndex, judgeRank, salt)` at `openVoting`, revealing at `settle`. The contract verifies the hash. Matchmaking and task selection are off-chain and committed by `taskHash` at creation.

## Alternatives considered
- **Pyth Entropy at openVoting:** a verifiable shuffle the operator can't pick. But it adds a callback, a fee, and an async wait between the fight ending and voting, plus integration time.
- **`block.prevrandao` / blockhash:** manipulable, and Monad's semantics may differ from Ethereum's. Not worth checking under time pressure.

## Consequences
The operator can choose the shuffle and could leak it. Accepted for testnet (see [trust model](../blockchain.md#4-trust-model)).

## How to change
Add `requestShuffle(roundId)`, which calls Entropy, and an Entropy callback that stores the random seed. Derive `labelToIndex` on-chain from the seed in `openVoting` (a Fisher-Yates over at most 8 items). The backend reads the derived shuffle instead of choosing it. Check Entropy V2's current interface and fee on Monad testnet first.
