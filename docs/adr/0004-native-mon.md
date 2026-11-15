# 0004: Bets in native MON

**Status:** Accepted

## Context
Users need the simplest possible path from login to bet.

## Decision
`enter` is `payable`, and every amount in the contract is native MON in wei. No ERC-20, no WMON.

## Alternatives considered
- **Custom play-money ERC-20 minted freely:** removes faucet scarcity, but needs an approve tx before each bet (or permit), and it is less "Monad-native" for judges.
- **WMON:** an extra wrap step for no gain.

## Consequences
Users need testnet MON, hence the drip ([0009](0009-onboarding-privy-and-drip.md)). Payouts are native transfers, so we must follow reentrancy rules ([0008](0008-pull-payments.md)).

## How to change
Add a `token` address. Replace `msg.value` with `transferFrom` in `enter`, and native sends with `transfer` in `claim`, `refund` and `withdrawRake`. The frontend adds an approve step. A play token would also make the drip unnecessary.
