# 0002: Foundry via foundry-monad, verify on both explorers

**Status:** Accepted

## Context
Monad's docs recommend Foundry and publish a template, `monad-developers/foundry-monad`, preconfigured for testnet. They require Foundry v1.8.0 or later. Two official explorers exist: MonadVision (Sourcify verifier at `https://sourcify-api-monad.blockvision.org`) and Monadscan (Etherscan API).

## Decision
Scaffold `contracts/` from `foundry-monad`. Tests in Solidity (forge test). Deploy with a `forge script` that also configures classes, roles and house fighters. Verify on both MonadVision and Monadscan so judges can read the source on whichever explorer they open.

## Alternatives considered
- **Hardhat:** supported, but slower tests, and the team would need two languages in contract work.
- **Remix:** no scripted, repeatable deploy.

## Consequences
The ABI is exported from `contracts/out/FightClub.sol/FightClub.json` into `packages/shared/abi/` by a script, so the backend and frontend never hand-copy it.

## How to change
Swap the toolchain under `contracts/` and keep the ABI export path. Nothing else depends on Foundry.
