# 0009: Privy embedded EOAs plus MetaMask, in-app drip, no paymaster yet

**Status:** Accepted

## Context
Requirements: MetaMask must work, and account creation must be near-instant for non-crypto users. Monad's docs list Privy as an embedded wallet provider that is "subsidizing all Monad Testnet usage" (Para and Turnkey are also free on testnet). Users need MON for bets and gas. Monad's reserve-balance rule says an EIP-7702-delegated account cannot drop below 10 MON, and an undelegated EOA under 10 MON can only send value via the "emptying transaction" exception (once per 3 blocks).

## Decision
- **Privy** for auth: email, Google, and external wallets (MetaMask, injected), wired into wagmi as the connector.
- Embedded wallets are **plain EOAs**. Do not enable 7702 / smart-account mode, because the reserve rule would block bets from wallets holding under 10 MON.
- **Drip:** `POST /api/drip` sends 0.3 MON from a team drip wallet when the user's balance is below `minBet + buffer`. Limited to once per address, once per Privy user id, and rate limited per IP. The drip wallet stays above 10 MON.
- The frontend serializes the user's txs (disables actions until the previous tx is confirmed) to stay clear of the emptying-exception window.

## Alternatives considered
- **RainbowKit / ConnectKit only:** fine for crypto users, but no email login.
- **Dynamic, Para, Turnkey, thirdweb:** all valid and listed by Monad. Privy is chosen for its testnet subsidy and mature wagmi integration.
- **ERC-4337 paymaster (Pimlico, ZeroDev, Alchemy, Biconomy, all listed for testnet) for sponsored gas:** removes gas from the UX, but bets still need MON value, so a drip is needed anyway. It adds bundler setup and smart accounts, and the 7702 path conflicts with the reserve rule.
- **Tell users to use the faucet:** a big drop-off point, and faucets have eligibility rules.

## Consequences
The drip wallet is a hot key on the server and must be refilled from team faucet drips. Abuse can drain it. That is acceptable on testnet, and the rate limits bound it.

## How to change
Auth is isolated in `web/src/wallet/`. Swapping providers means replacing the provider component and the wagmi connector config. Adding a paymaster means smart accounts (check the reserve-balance rules first) and a bundler client in the same folder. The drip lives in `server/src/routes/drip.ts`.
