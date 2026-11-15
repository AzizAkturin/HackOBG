# 0013: Content off-chain, hashes on-chain

**Status:** Accepted

## Context
Tasks, pitches, transcripts, fighter personas and memories are kilobytes of text. Storing them on-chain is wasteful, and this data changes shape often during a hackathon.

## Decision
Store content in the backend DB and commit `keccak256` of a canonical JSON encoding on-chain at the moment it becomes binding: `configHash`, `profileHash`, `taskHash`, `pitchesHash`, `revealCommit` (see [blockchain.md section 5.5](../blockchain.md#55-off-chain-commitments)). The API exposes the raw content, and the UI shows a "verify" link that recomputes the hash client-side.

Canonical encoding: `JSON.stringify` with sorted keys, UTF-8, then `keccak256` (viem `keccak256(toBytes(str))`). The implementation lives in `packages/shared/hash.ts` and is used by both the backend and frontend.

## Alternatives considered
- **IPFS / Arweave pinning:** truly public availability, but an extra service, and it doesn't add much for a testnet demo.
- **Emit full content in events:** cheap-ish on Monad and fully on-chain, but large logs strain the getLogs limits. A reasonable middle ground later for pitches only.

## Consequences
If our DB is lost, the hashes remain but the content is gone. Acceptable on testnet.

## How to change
Swap `packages/shared/hash.ts` storage targets (e.g. pin to IPFS and commit the CID). The contract fields stay `bytes32`.
