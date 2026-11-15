# Architecture Decision Records (blockchain)

Every on-chain or chain-adjacent decision has one record here. A record says what we chose, why, what we rejected, and **exactly what to touch to change it**. The goal is that anyone joining later can disagree with a decision, see its full reasoning, and change it without breaking something they didn't know was connected.

## How to change a decision

1. Edit the ADR: set `Status` to `Superseded by NNNN` (or edit in place if nothing has been built yet), and write the new decision as a new numbered ADR.
2. Update [../blockchain.md](../blockchain.md), the sections the ADR links to.
3. Follow the ADR's **How to change** list (contract, ABI, backend, frontend).
4. If the contract interface changed, redeploy and update `packages/shared/deployments/10143.json`, then tell every workstream (the ABI is shared).

## Index

| # | Decision | Status |
| --- | --- | --- |
| [0001](0001-monad-testnet-only.md) | Monad testnet only, no real value | Accepted |
| [0002](0002-foundry-monad-toolchain.md) | Foundry via `foundry-monad`, verify on MonadVision and Monadscan | Accepted |
| [0003](0003-single-contract.md) | One `WAB` contract, not upgradeable | Accepted |
| [0004](0004-native-mon.md) | Bets in native MON, no ERC-20 | Accepted |
| [0005](0005-parimutuel-pool.md) | Parimutuel pool with an entry fee (min bet) and rake | Superseded by 0017 |
| [0006](0006-round-lifecycle-and-deadlines.md) | Round state machine with timestamp deadlines and public cancel | Accepted |
| [0007](0007-winner-by-blind-onchain-vote.md) | Winner decided by entrants' blind on-chain vote, judge breaks ties | Amended by 0017 |
| [0008](0008-pull-payments.md) | Pull payments (claim / refund) | Accepted |
| [0009](0009-onboarding-privy-and-drip.md) | Privy embedded EOAs plus MetaMask, in-app MON drip, no paymaster yet | Accepted |
| [0010](0010-chain-reads-and-indexing.md) | Direct viem reads and subscriptions plus a small custom indexer | Accepted |
| [0011](0011-gas-and-loop-bounds.md) | Bounded loops (max 8 fighters), never hardcode gas limits | Accepted |
| [0012](0012-randomness.md) | Operator commit-reveal randomness now, Pyth Entropy later | Accepted |
| [0013](0013-offchain-data-hash-commitments.md) | Content off-chain, keccak hashes on-chain | Accepted |
| [0014](0014-weight-class-onchain-params.md) | Weight classes: money params on-chain, capability params off-chain with a hash | Accepted |
| [0015](0015-fighter-identity-onchain.md) | Fighters registered on-chain with W/L; ELO and memory off-chain | Accepted |
| [0016](0016-roles-and-keys.md) | Owner / operator / treasury split | Accepted |
| [0017](0017-live-market-five-stages.md) | Live 1v1 prediction market (LMSR, 1 MON shares, cash-out) over five stages, best of 3 rounds | Accepted |
