# 0016: Owner / operator / treasury split

**Status:** Accepted

## Context
The backend must sign transactions automatically (create rounds, open voting, settle), which means a hot key in a server env var. That key should not be able to change economic parameters or steal funds.

## Decision
- **Owner** = deployer MetaMask account held by one teammate. It can set classes, the operator, the treasury, and pause.
- **Operator** = server hot wallet. It runs rounds and can only cancel (which refunds) or settle through a hash-checked reveal.
- **Treasury** = a team address that receives rake via `withdrawRake`.
- **Drip wallet** = a separate server hot wallet, not known to the contract at all.
- All four are fresh accounts, never personal wallets that hold mainnet funds.

## Alternatives considered
- **One key for everything:** a leaked server env var would mean full control.
- **Safe multisig as owner** (Safe v1.4.1 is deployed on Monad testnet): best practice, but signing friction during a hackathon. Do it right after.

## Consequences
If the operator key leaks, the attacker can cancel rounds (refunds, annoying) or create junk rounds. Rotate with `setOperator`.

## How to change
`setOperator` / `setTreasury` rotate keys without a redeploy. To use a multisig owner, transfer ownership (OpenZeppelin `Ownable2Step`) to the Safe address.
