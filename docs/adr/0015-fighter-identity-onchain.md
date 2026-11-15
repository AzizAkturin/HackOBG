# 0015: Fighters on-chain with W/L, ELO and memory off-chain

**Status:** Accepted

## Context
Fighters are persistent characters with names, descriptions, records and memories that grow every round. Some are house-curated and some are user-created.

## Decision
- `registerFighter(owner, classId, profileHash)` (operator only) assigns a `uint32` id. House fighters are owned by the treasury address, and custom fighters by the creating user's address.
- **On-chain:** owner, class, `wins`, `losses` (updated in `settle`), and `profileHash`. This is the fighter's tamper-proof career record.
- **Off-chain:** name, bio, avatar, persona prompt, model id, per-class ELO, and memories (an LLM-written note appended after each round; the latest N are injected into the next fight's prompt).
- Registration goes through the operator so custom fighters get moderated (name and persona filter) before they exist on-chain.

## Alternatives considered
- **Fighters as ERC-721 NFTs:** ownable and tradable characters, a strong post-hackathon idea (owners could earn a cut of rake). Adds a token contract and metadata URIs. Deferred.
- **Fully off-chain fighters:** the record would be easy to fake, and it misses an easy on-chain story.
- **Permissionless `registerFighter`:** spam and unmoderated names.

## Consequences
A user "owns" a fighter only in the sense of the `owner` field. There is no transfer function yet.

## How to change
For NFTs: deploy an ERC-721 whose token id is the fighter id, and have `registerFighter` mint it. `Fighter.owner` then becomes `ownerOf(id)`. To pay owners, add `ownerCutBps` to the class and credit it in `settle`.
