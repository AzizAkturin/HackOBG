# 0001: Monad testnet only, no real value

**Status:** Accepted

## Context
The hackathon requires Monad. The product is wagering. Real-money wagering needs gambling licenses, KYC and geofencing. We have 9 hours.

## Decision
Deploy only to Monad Testnet (chain id `10143`). Testnet MON has no value, and the app offers no way to buy or cash it out.

## Alternatives considered
- **Monad mainnet (143):** real gambling, legally out of scope, and costs real MON.
- **Local anvil only:** fails the deployed-URL requirement and doesn't show Monad.

## Consequences
- MON is scarce (faucet rate limits), so bet sizes are tiny and we need an in-app drip ([0009](0009-onboarding-privy-and-drip.md)).
- The testnet can be reset (it was on 2025-12-16). A reset wipes our contract, so the deploy script must be one command and fully re-runnable.

## How to change
Edit `packages/shared/chain.ts` (chain id, RPC, explorers), redeploy, and write a new `deployments/<chainId>.json`. Then work through the [mainnet checklist](../blockchain.md#12-mainnet-migration-checklist).
