# Fight Club (working title)

A prediction market on Monad testnet where AI models fight like a virtual UFC.

Each round puts 2 to 8 AI "fighters" (default 4) on the same task. Users pay an entry fee and back one fighter, like betting on a horse. When the timer runs out, every fighter presents a short pitch of its result. Entrants vote on the pitches without knowing which fighter wrote which one, and the vote decides the winner. People who backed the winner split the pool. Fighters are grouped into weight classes by capability (model tier, token budget, reasoning level). They are persistent characters with names, bios, fight records, ELO ratings, and memories that carry over between rounds.

This repo currently contains **documentation only**. Nothing is implemented yet. Read the docs, agree on the decisions, then build.

## Document map

| Doc | What it covers | Who must read it |
| --- | --- | --- |
| [docs/blockchain.md](docs/blockchain.md) | **The most important doc.** Monad network facts, Monad-specific gotchas, contract spec, money flow, trust model, onboarding | Everyone |
| [docs/adr/](docs/adr/README.md) | One decision record per blockchain decision: context, choice, alternatives, how to change it later | Everyone before changing anything on-chain |
| [docs/product.md](docs/product.md) | Game loop, weight classes, fighters, tasks, scoring, voting, leaderboard, memory | Everyone |
| [docs/architecture.md](docs/architecture.md) | Off-chain services, data model, API, live event stream, visualizer | Backend and frontend owners |
| [docs/build-plan.md](docs/build-plan.md) | 9-hour staged plan, workstreams, interface contracts, verification gates | Everyone, at kickoff |

## Costs you bear right now

Everything on-chain is testnet, so no real money moves through the app. The real costs are listed below, ordered from most to least likely to cost money. Items marked **verify** are facts we could not confirm from official sources while writing this. Check them in the first hour.

| Item | Expected cost | Notes |
| --- | --- | --- |
| **LLM inference** | **$0 to $10** | Plan A is the OpenCode Zen free models (OpenAI-compatible API at `https://opencode.ai/zen/v1`). **Verify:** third-party sources disagree on whether Zen needs a one-time deposit before free models work, and which models are free right now. Plan B is OpenRouter `:free` models. **Verify:** OpenRouter has historically capped free usage at about 50 requests/day with no credit purchase, and about 1,000/day after buying $10 of credits. One round uses about 13 LLM calls (4 fights, 4 memory updates, 1 judge, plus retries), so 50/day is only about 3 rounds. For a live demo, budget the $10. |
| **Backend hosting** | **$0 to $5** | The orchestrator must be an always-on process (it holds WebSockets and runs the round scheduler). Railway's trial credit or the $5 Hobby plan both work. Render's free tier sleeps when idle, which kills scheduled rounds, so avoid it. |
| **Testnet MON** | **$0, but limited** | Testnet MON is free but rate limited. The official faucet is `https://faucet.monad.xyz` (**verify** its eligibility rules). QuickNode's faucet gives one drip every 12 hours and **requires a small mainnet balance** on the requesting wallet, so that route can cost a few dollars of real tokens. We need MON for the deployer, the operator hot wallet (gas), and the drip wallet that funds new users. See "Budget" in [docs/blockchain.md](docs/blockchain.md#7-testnet-mon-budget). **Start collecting MON from every teammate's wallet at hour 0.** |
| Frontend hosting | $0 | Vercel or Netlify free tier, static site. |
| Privy (login + embedded wallets) | $0 | Monad's docs say Privy is "subsidizing all Monad Testnet usage". Needs a free account and an app ID. |
| RPC provider | $0 | The public RPC is capped at 20 requests/second. Sign up for a free Alchemy or QuickNode Monad testnet endpoint for the backend. |
| Monadscan API key | $0 | Free Etherscan-family key, used only for contract verification. MonadVision verification (Sourcify) needs no key. |
| Custom domain | $0 to $15, optional | The `*.vercel.app` / `*.up.railway.app` URLs are enough for the deployed URL requirement. |

**Realistic total: $0 to $20.** The one cost that is likely to be real is LLM credits if the free tiers rate-limit the demo.

Accounts someone on the team must create before hour 1: Privy, OpenCode Zen (and/or OpenRouter), Railway, Vercel, Alchemy or QuickNode, Etherscan (for Monadscan). Plus a fresh MetaMask account for each of the three project wallets (deployer/owner, operator, drip). **Never reuse a personal wallet that holds mainnet funds**, because the operator and drip private keys will sit in server environment variables.

## Legal framing

This is testnet only, with play money that has no value. The app must never offer a way to buy testnet MON or cash it out. Running it with real money would raise gambling licensing, KYC, and geofencing requirements that are out of scope.
