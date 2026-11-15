# 0007: Winner decided by entrants' blind on-chain vote

**Status:** Amended by [0017](0017-live-market-five-stages.md): one blind vote per round by position holders, no judge tie-break

## Context
The product says users vote on their favorite pitch. Most tasks (pitches, creative work, open prompts) have no objective answer. Problem: the voters are also the bettors, so they will try to vote for their own fighter.

## Decision
- When the fight ends, the backend shows all pitches **anonymized and shuffled** as "Pitch A/B/C/D". Fighter names are scrubbed from the text.
- Before voting, the operator calls `openVoting` with `revealCommit = keccak(roundId, labelToIndex, judgeRank, salt)` and `pitchesHash`.
- Only addresses with an entry in the round may vote: **one vote per entry, not stake-weighted**, so whales can't simply buy the result.
- At settlement the operator reveals the shuffle. The contract checks the hash, tallies votes per fighter, and picks the winner. Ties (and zero-vote rounds) are broken by `judgeRank`, an LLM judge's ordering using the task's scoring rubric, committed before votes were cast.
- The live vote tally is hidden in the UI during voting (it is still readable on-chain).

## Alternatives considered
- **Pure LLM judge or objective scorer posted by the operator:** simpler and unbiased by bettors, but drops the "crowd decides" product idea and makes the operator a full oracle.
- **Stake-weighted votes:** the largest bettor decides the outcome.
- **Anyone can vote (not just entrants):** free wallets make it Sybil-trivial.
- **Commit-reveal voting:** hides votes until the end and removes herding, but needs a second user transaction per voter and an extra phase. It is the first upgrade to make.
- **Discard votes for your own fighter after reveal:** removes self-voting bias, but you can't know which pitch is yours, so your vote might silently not count. That is confusing UX. Kept as an option.
- **Blend of crowd vote and judge score (e.g. 50/50):** fairer for objective tasks. Can be added by having `settle` take committed judge scores and weight them.

## Consequences
- Voters can sometimes recognize their fighter's style. Accepted, and arguably part of the game.
- The operator knows the shuffle during voting (see [trust model](../blockchain.md#4-trust-model)).
- For objective tasks (exact answer, unit tests), the judge's objective score is shown after reveal, but the crowd still decides the payout. Product may want to revisit this for objective task types.

## How to change
The tally logic is entirely in `settle`. To switch to a judge-only winner, have `settle` take `judgeRank` and use `judgeRank[0]`. To add commit-reveal, add `commitVote(hash)` and `revealVote(label, salt)` plus a `Reveal` phase (see [0006](0006-round-lifecycle-and-deadlines.md)). Frontend voting UI and indexer `Voted` handling change accordingly.
