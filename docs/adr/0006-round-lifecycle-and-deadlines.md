# 0006: Round state machine with deadlines and public cancel

**Status:** Accepted

## Context
Rounds have betting, fighting (off-chain LLM work), voting and settlement. The backend can crash or a free LLM tier can fail mid-round. Funds must never get stuck.

## Decision
```
createRound -> Open --(now >= lockTime)--> [Fighting, derived]
  --openVoting--> Voting --(now >= voteEnd) settle--> Settled
any state before Settled --cancel (operator) / cancelExpired (anyone, now > settleDeadline)--> Cancelled
```
- All times are unix seconds checked against `block.timestamp` (Monad puts ~3 blocks in each second).
- `lockTime` is set at creation. The fight runs off-chain from lockTime until the class time limit (max 600 s).
- `openVoting` sets `voteEnd = now + voteDuration` and `settleDeadline = voteEnd + settleGrace`.
- Before voting opens, `settleDeadline = lockTime + 600 + voteDuration + settleGrace`.
- Cancelled rounds refund 100%, no rake.

## Alternatives considered
- **Operator-only cancel:** if the backend dies, funds are stuck. Unacceptable.
- **Block-number deadlines:** block time is an implementation detail that has changed before. Seconds are stable.

## Consequences
The backend scheduler must call `openVoting` and `settle` on time. If it misses `settleDeadline`, the round cancels and refunds, which is safe but a bad demo, so the scheduler retries aggressively.

## How to change
Phase logic lives in modifiers on each function. Adding a phase (e.g. commit-reveal voting, see [0007](0007-winner-by-blind-onchain-vote.md)) means a new enum value, a new deadline field, and a new backend scheduler step.
