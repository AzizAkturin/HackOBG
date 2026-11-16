# 9-hour build plan

Four workstreams run in parallel after a shared kickoff. Each stage ends in a **gate**: a check that must pass before the next stage depends on it. The ABI, event list, WebSocket protocol and REST API in [blockchain.md](blockchain.md#5-contract-specification) and [architecture.md](architecture.md) are the interfaces between workstreams, so agree on them at kickoff and change them only by announcing it.

Workstreams (assign one or more people each):

- **A. Contracts:** `WAB.sol`, tests, deploy, verify
- **B. Orchestrator:** server, LLM gateway, round runner, judge, memory, indexer, API
- **C. Web app:** wallet/onboarding, lobby, betting, voting, profiles, leaderboard
- **D. Arena visuals:** Pixi arenas, sprites, animation driven by the event stream, underground-fight styling

## Stage 0: Kickoff and spikes (hour 0 to 1)

Everyone together for 15 minutes to read [blockchain.md](blockchain.md) and confirm the ADRs. Then:

| Who | Task | Gate (must be true before moving on) |
| --- | --- | --- |
| All | Each teammate requests faucet MON. Create fresh deployer, operator, drip and treasury wallets. Pool MON into operator and drip | Operator and drip each hold more than 10 MON ([why](blockchain.md#7-testnet-mon-budget)) |
| A | `forge init --template monad-developers/foundry-monad contracts`, deploy a trivial contract, verify on MonadVision | A verified contract shows on testnet.monadvision.com |
| A | **Reserve-balance spike:** from a wallet holding about 1 MON, send two value txs to a contract back to back, then two spaced 2 s apart | We know the observed behavior and have noted it in [ADR-0009](adr/0009-onboarding-privy-and-drip.md) |
| B | **LLM spike:** call every candidate OpenCode Zen free model (and OpenRouter `:free`) with streaming, 4 at once | We have a list of models that stream reliably and know their rate limits. Fill in the class model lists in [product.md](product.md#2-weight-classes). Decide whether the $10 OpenRouter credit is needed |
| C | Vite + React app with Privy (email + MetaMask) on chain 10143 and a balance display | Email login creates an embedded wallet and MetaMask switches to Monad testnet |
| D | Pixi canvas with two placeholder sprites playing every `Move` from a hardcoded event list | All 8 moves render |
| B | Create the Railway service and Vercel project with hello-world deploys | Both public URLs respond (de-risks the deployed-URL requirement early) |

## Stage 1: Vertical slice, one round end to end (hour 1 to 4)

The goal is the ugliest possible complete round: create, bet, fight, vote, settle, claim.

| Who | Task | Gate |
| --- | --- | --- |
| A | Full `WAB.sol` per spec, forge tests for: bet limits, lock, voting eligibility, tie break, refund mode (nobody backed the winner), cancel and `cancelExpired`, claim math, reentrancy | `forge test` green. Deployed and verified on both explorers. Address and block in `packages/shared/deployments/10143.json`. ABI exported to `packages/shared/abi/` |
| B | Round runner with one hardcoded task and 4 house fighters: createRound, lock, fight (streamed), pitches, judge, openVoting, settle. Indexer mirroring events | A round created by the server settles on-chain by itself, visible on MonadVision |
| C | Round page: fighter cards, live odds from `Entered` logs, bet slip calling `enter`, pitch voting calling `vote`, claim button. Drip endpoint wired in | A fresh email user can go from login to a bet in under 60 s on the deployed URL |
| D | Basement arena consuming the real `/ws` stream (progress and actions), snippet side panel | A live fight animates from real LLM output |

**Gate for stage 1:** two teammates on separate devices bet on different fighters in the same round on the deployed URL, vote, see the reveal, and the winner claims. Record a screen capture of this as the demo fallback.

## Stage 2: The real product (hour 4 to 7)

| Who | Task | Gate |
| --- | --- | --- |
| A | Seed all three weight classes and the house roster (8 to 12 fighters) via the deploy script. Help B with tx reliability (nonce handling, retries, gas estimate buffer) | Each class has a round running on schedule |
| B | Weight classes (model, token and time limits), task templates plus free-text classification and rubric generation, memory notes, ELO, custom fighters and custom rounds with moderation, commitments endpoint | A custom round with a user-written prompt runs end to end. Fighters' prompts include memories from earlier rounds |
| C | Lobby, leaderboard, fighter profiles with diary (memories), match history, my bets, create fighter and create round forms, "verify" links (hash check + explorer tx links) | Every page reads real data |
| D | 3+ arena environments mapped by category, pitch reveal animation, underground-fight styling pass (grain, type, color), replay mode from `/api/rounds/:id/events` | Three different task categories visibly change the arena. Replays work |

## Stage 3: Harden and demo (hour 7 to 9)

| Who | Task |
| --- | --- |
| All | Run back-to-back rounds for 30 minutes on the deployed URL. Log every failure and fix the top ones |
| B | Confirm restart recovery: kill the server mid-round, restart, the round resumes or cancels cleanly |
| A | Refill operator and drip wallets. Confirm `cancelExpired` refund path works on a deliberately abandoned round |
| C + D | Mobile layout check, loading and error states (tx rejected, low balance, LLM KO) |
| All | Demo script (below), backup video, final README pass with the deployed URL and contract addresses |

**Demo script (3 minutes):** log in with email (no wallet extension needed), receive the drip, bet on a Middleweight fighter, watch the fight in an arena that matches the task, vote on blind pitches, watch the reveal, collect winnings. Open the settle tx on MonadVision and the fighter's on-chain W/L record. Mention that each bet and vote confirmed in under a second.

## Cut list, in order, if behind schedule

1. Custom rounds with free-text prompts (keep templates only)
2. Custom fighters
3. Arenas beyond the Basement
4. Replays (keep history as text)
5. Heavyweight class
6. ELO (keep on-chain W/L only)

Never cut: the on-chain bet, vote, settle and claim loop, the live arena, the deployed URL, and contract verification.
