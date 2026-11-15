# Off-chain architecture

The frontend and backend technology choices are deliberately boring and easy to swap. The chain-facing pieces follow [blockchain.md](blockchain.md).

## 1. Components

```
                         Monad Testnet (10143)
                        ┌──────────────────────┐
         enter/vote/    │   FightClub.sol      │   create/openVoting/
         claim txs      │                      │   settle txs (operator key)
   ┌───────────────────▶│                      │◀────────────────────┐
   │   logs (WS, latest)└──────────┬───────────┘                     │
   │◀──────────────────────────────┤ logs (finalized)                │
   │                               ▼                                 │
┌──┴────────────────┐   REST + WS  ┌─────────────────────────────────┴──┐
│ web (static SPA)  │◀────────────▶│ server (orchestrator, one process) │
│ Vite + React + TS │              │ scheduler · round runner · indexer │
│ Pixi.js arenas    │              │ LLM gateway · judge · memory · API │
│ Privy + wagmi     │              │ drip wallet · SQLite               │
└───────────────────┘              └──────────────┬─────────────────────┘
                                                  │ OpenAI-compatible HTTP
                                                  ▼
                                   OpenCode Zen (free) / OpenRouter (fallback)
```

| Component | Choice | Why | Hosting |
| --- | --- | --- | --- |
| `contracts/` | Solidity + Foundry (`foundry-monad`) | [ADR-0002](adr/0002-foundry-monad-toolchain.md) | Monad testnet |
| `web/` | Vite + React + TypeScript, Pixi.js for arenas, wagmi + viem, Privy | No SSR needed (Next.js was rejected as overkill). Privy and wagmi are React-first. Pixi handles 2D sprites and particles well | Vercel or Netlify (static) |
| `server/` | Node 20 + TypeScript, Fastify, `ws`, viem, `better-sqlite3` | One long-lived process holds WebSockets, timers and the operator key. SQLite is zero-setup | Railway with a persistent volume for the SQLite file |
| `packages/shared/` | TS module used by both | Chain config, ABI, deployment addresses, hash function, event and API types | n/a |

Monorepo with pnpm workspaces. Swapping SQLite for Postgres later only touches `server/src/db/`.

## 2. Server modules

| Module | Responsibility |
| --- | --- |
| `scheduler` | Keeps one house round queued per active class, plus the custom-round queue. Concurrency limit (default 1 live fight) to protect the free LLM tier |
| `round-runner` | A state machine per round that mirrors the chain: create, wait for lock, fight, pitches, judge, openVoting, wait for voteEnd, settle, post-round. Every step is idempotent and resumable from the DB after a restart |
| `llm-gateway` | One OpenAI-compatible client. Provider config is `{baseUrl, apiKey, model}` per fighter. Streams tokens, enforces `max_tokens` and a wall-clock timeout, retries once, falls back to the alternate provider |
| `fight` | Builds each fighter's prompt (persona + memories + class rules + task + output format), runs all fighters concurrently, emits visual events |
| `judge` | Generates the rubric at round creation (for free-text tasks). After the fight, scores and ranks results to produce `judgeRank` |
| `memory` | Post-round notes, career summaries, ELO updates |
| `chain` | viem clients (operator wallet, drip wallet, public), tx sending with nonce management and retries, and the indexer ([ADR-0010](adr/0010-chain-reads-and-indexing.md)) |
| `api` | REST and WebSocket endpoints (below), plus moderation for custom fighters and tasks |

**If an LLM call fails mid-fight**, that fighter "gets knocked out" (its result is empty, it ranks last with the judge, and its pitch says it was KO'd). The round continues. If **all** fail, or the provider is down, the operator calls `cancel` and everyone is refunded.

## 3. Data model (SQLite)

```
weight_classes   (id, name, min_bet, max_bet, rake_bps, models_json, max_tokens, reasoning, fight_seconds, config_hash)
fighters         (id = on-chain id, owner, class_id, name, nickname, bio, avatar, persona, provider, model, params_json, profile_hash, elo, status)
fighter_memories (id, fighter_id, round_id, note, created_at)
fighter_summary  (fighter_id, summary, updated_round)
tasks            (id, round_id, prompt, category, scoring_mode, rubric_json, salt, task_hash)
rounds           (id = on-chain id, class_id, phase, lock_time, vote_end, fight_seconds, created_by, task_id,
                  shuffle_json, judge_rank_json, salt, reveal_commit, pitches_hash, winner_index, tx hashes...)
round_fighters   (round_id, idx, fighter_id, output, pitch, tokens_used, finished_at, ko)
round_events     (round_id, seq, t_ms, fighter_idx, kind, payload_json)   -- recorded stream for replays
entries          (round_id, address, fighter_idx, amount, voted_label, claimed, tx_hash)  -- mirrored from chain
votes            (round_id, address, label, tx_hash)                                    -- mirrored from chain
elo_history      (fighter_id, round_id, elo_before, elo_after)
drips            (address, privy_user_id, ip, amount, tx_hash, created_at)
indexer_state    (key, last_indexed_block)
```

## 4. Live event protocol

One WebSocket at `/ws`. Clients subscribe to a round: `{ "type": "subscribe", "roundId": 42 }`. The server sends envelopes `{ roundId, seq, tMs, event }`. Every event is also written to `round_events`, and a replay is the same stream played back from the DB.

```ts
type FightEvent =
  | { kind: "phase"; phase: "open" | "fighting" | "pitching" | "voting" | "settled" | "cancelled"; endsAt?: number }
  | { kind: "progress"; fighter: number; tokens: number; budget: number }      // throttled to ~4/s per fighter
  | { kind: "action"; fighter: number; move: Move; intensity: number }          // derived by the server
  | { kind: "snippet"; fighter: number; text: string }                          // live work preview for the side panel
  | { kind: "ko"; fighter: number; reason: string }
  | { kind: "finished"; fighter: number; atMs: number }
  | { kind: "pitches"; pitches: { label: string; text: string; result: string }[] }  // anonymized
  | { kind: "reveal"; labelToFighter: number[]; votes: number[]; judgeRank: number[]; winner: number };

type Move = "approach" | "jab" | "combo" | "dodge" | "circle" | "stagger" | "taunt" | "knockdown";
```

How the server turns LLM streams into moves (cosmetic, but tied to real progress):

| Signal | Move |
| --- | --- |
| A burst of tokens (rate above the fighter's running average) | `jab`, or `combo` when sustained |
| Long gap with no tokens (thinking / reasoning) | `circle` |
| Hit a structural milestone (a new section, `PITCH:` started) | a heavier `combo` aimed at the current leader |
| Retry or error | `stagger` |
| Finished first / finished while others are still going | `taunt` |
| Final reveal winner vs losers | `knockdown` on the losers |

On-chain activity (bets, votes) does **not** go through this socket. The frontend reads it straight from Monad ([ADR-0010](adr/0010-chain-reads-and-indexing.md)), so the odds board is provably real.

## 5. REST API

| Method + path | Purpose |
| --- | --- |
| `GET /api/classes` | Classes with on-chain and off-chain params |
| `GET /api/fighters?class=` | Roster with record, ELO, bio |
| `GET /api/fighters/:id` | Profile, memories, history |
| `POST /api/fighters` | Create a custom fighter (requires a wallet signature, moderated) |
| `GET /api/rounds?status=live\|upcoming\|past` | Lobby and history |
| `GET /api/rounds/:id` | Round detail: task, fighters, pitches (after the fight), reveal data (after settlement) |
| `GET /api/rounds/:id/events` | Recorded event stream for replays |
| `GET /api/rounds/:id/commitments` | The raw content behind every on-chain hash, for verification ([ADR-0013](adr/0013-offchain-data-hash-commitments.md)) |
| `POST /api/rounds` | Queue a custom round (requires a wallet signature) |
| `POST /api/drip` | Fund a new user's wallet ([ADR-0009](adr/0009-onboarding-privy-and-drip.md)) |
| `GET /api/leaderboard?class=` | ELO table |
| `GET /api/users/:address` | Bettor profile, P&L, unclaimed rounds |

Write endpoints authenticate with a SIWE-style signed message (wallet signature over a nonce), not passwords.

## 6. Frontend screens

1. **Lobby:** live and upcoming fight cards per class, the leaderboard teaser, and an "Enter the Club" login.
2. **Fight card / round page:** fighters, odds board (live from chain), bet slip, countdown. Turns into the **arena** at lock, the **pitch voting** view after the fight, and the **reveal** after settlement. Same URL throughout.
3. **Fighter profile**, **leaderboard**, **match history + replay**, **my bets** (with collect buttons).
4. **Create:** custom fighter and custom round forms.

## 7. Environment variables

```
# server
MONAD_RPC_HTTP, MONAD_RPC_WS          # dedicated provider endpoint
OPERATOR_PK, DRIP_PK                  # fresh hot wallets, see ADR-0016
FIGHTCLUB_ADDRESS, DEPLOY_BLOCK       # also in packages/shared/deployments/10143.json
ZEN_API_KEY, OPENROUTER_API_KEY
PRIVY_APP_ID, PRIVY_APP_SECRET        # to verify Privy user ids on /api/drip
DB_PATH=/data/fightclub.sqlite

# web
VITE_PRIVY_APP_ID, VITE_API_URL, VITE_WS_URL, VITE_MONAD_RPC_WS
```
