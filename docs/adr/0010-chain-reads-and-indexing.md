# 0010: Direct viem reads and subscriptions plus a small custom indexer

**Status:** Accepted

## Context
The UI needs live odds and vote counts. Match history, profiles and leaderboards need historical queries. Monad RPC facts: WebSocket `eth_subscribe` supports `logs`, `newHeads`, `monadLogs` and `monadNewHeads`. `eth_getLogs` is capped at 100 to 1,000 blocks per call depending on the provider. Historical `eth_call` may fail. The public RPC is limited to 20 rps. Block tags: `latest` = Proposed, `safe` = Voted, `finalized` = Finalized.

## Decision
- **Frontend:** a viem WS client subscribes to WAB logs at `latest` for instant updates. The initial snapshot is batched through Multicall3 (`0xcA11bde05977b3631167028862bE2a173976CA11`).
- **Backend indexer:** in-process in the orchestrator. It subscribes to logs, plus a catch-up loop with `eth_getLogs` in 100-block pages from `lastIndexedBlock`. It **writes to the DB only for finalized blocks**. Idempotent upserts keyed by `(txHash, logIndex)`.
- The backend uses a dedicated free-tier provider RPC (Alchemy or QuickNode). The frontend uses the public RPC.

## Alternatives considered
- **Envio HyperIndex, Goldsky, Ponder, thirdweb Insight, QuickNode Streams:** robust, but each adds a hosted service, a schema DSL and setup time. Envio or Goldsky is the right call after the hackathon.
- **Reading everything from contract storage on demand:** no history, and historical calls are unreliable on Monad.

## Consequences
The DB is a cache that can be rebuilt by replaying from the deploy block. The money path never depends on the DB: claims read contract state.

## How to change
Indexer code lives in `server/src/chain/indexer.ts` and only maps events to DB rows. Replacing it with a hosted indexer means pointing API queries at that indexer's DB or GraphQL instead.
