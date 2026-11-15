# Blockchain and Monad design

This is the source of truth for everything on-chain. Every non-obvious choice links to a decision record (ADR) in [docs/adr/](adr/README.md). Each ADR says why we made the choice, what we rejected, and exactly what to touch to change it. **If you change something on-chain, update the ADR first, then this doc, then the code.**

Facts about Monad were taken from the official docs on 2026-11-15. Monad changes fast (the testnet was reset from genesis on 2025-12-16), so re-check anything marked with a source link before relying on it.

## Contents

1. [Network facts](#1-network-facts)
2. [Monad vs Ethereum: what changes for us](#2-monad-vs-ethereum-what-changes-for-us)
3. [What we use from the Monad ecosystem](#3-what-we-use-from-the-monad-ecosystem)
4. [Trust model](#4-trust-model)
5. [Contract specification](#5-contract-specification)
6. [Money flow and payout math](#6-money-flow-and-payout-math)
7. [Testnet MON budget](#7-testnet-mon-budget)
8. [Wallets and onboarding](#8-wallets-and-onboarding)
9. [Reading the chain](#9-reading-the-chain)
10. [Deploy and verify](#10-deploy-and-verify)
11. [Known risks and accepted shortcuts](#11-known-risks-and-accepted-shortcuts)
12. [Mainnet migration checklist](#12-mainnet-migration-checklist)

---

## 1. Network facts

Source: [docs.monad.xyz/developer-essentials/testnet](https://docs.monad.xyz/developer-essentials/testnet)

| Field | Value |
| --- | --- |
| Network | Monad Testnet ([ADR-0001](adr/0001-monad-testnet-only.md)) |
| Chain ID | `10143` (mainnet is `143`) |
| Currency | MON, 18 decimals |
| Public RPC (HTTP / WS) | `https://testnet-rpc.monad.xyz` / `wss://testnet-rpc.monad.xyz` (20 rps, archive) |
| Alt public RPC | `https://rpc-testnet.monadinfra.com` / `wss://rpc-testnet.monadinfra.com` (20 rps, archive) |
| Ankr public RPC | `https://rpc.ankr.com/monad_testnet` (300 req / 10 s, not archive) |
| Explorers | MonadVision `https://testnet.monadvision.com`, Monadscan `https://testnet.monadscan.com` |
| Faucet | `https://faucet.monad.xyz` |
| Block time | ~300 ms ([JSON-RPC docs](https://docs.monad.xyz/reference/json-rpc)) |
| Max contract size | 128 KB (Ethereum: 24 KB) |

Canonical contracts we may touch (testnet):

| Contract | Address |
| --- | --- |
| Multicall3 | `0xcA11bde05977b3631167028862bE2a173976CA11` |
| Pyth Entropy (VRF, future use) | `0x36825bf3Fbdf5a29E2d5148bfe7Dcf7B5639e320` |
| EntryPoint v0.7 (only if we adopt a paymaster) | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` |

All values live in one config module (`packages/shared/chain.ts`, see [architecture.md](architecture.md)) so changing network means editing one file.

## 2. Monad vs Ethereum: what changes for us

Source: [docs.monad.xyz/developer-essentials/differences](https://docs.monad.xyz/developer-essentials/differences), [reserve-balance](https://docs.monad.xyz/developer-essentials/reserve-balance), [json-rpc](https://docs.monad.xyz/reference/json-rpc)

Monad is EVM-equivalent, so Solidity, Foundry, viem, wagmi and MetaMask all work unchanged. These are the differences that actually affect this project:

| Monad behavior | Impact on us | What we do |
| --- | --- | --- |
| **Gas is charged on the gas limit, not gas used.** The sender pays `value + gas_bid * gas_limit`. | A hardcoded high gas limit wastes the user's MON for real, with no refund. | Always use `estimateGas` (viem's default) and never hardcode limits in the frontend. Keep functions cheap and bounded so estimates are tight. ([ADR-0011](adr/0011-gas-and-loop-bounds.md)) |
| **Reserve balance (10 MON).** An EOA's balance cannot be pushed below `min(balance at tx start, 10 MON)` except by gas. The exception is an "emptying transaction" from an undelegated sender, allowed once every k=3 blocks (~1 s). | A user holding under 10 MON can still bet, but only through the emptying exception. Two value transfers from the same low-balance wallet within ~1 s can revert even though they were included. EIP-7702-delegated accounts can never go below 10 MON. | Use plain EOA embedded wallets, **not** EIP-7702 smart accounts ([ADR-0009](adr/0009-onboarding-privy-and-drip.md)). The UI disables the bet button until the previous tx confirms. The drip and operator wallets keep well over 10 MON. **Verify with a spike test at hour 1** (see [build-plan.md](build-plan.md)). |
| **~300 ms blocks, fast finality.** Tags: `latest` = Proposed, `safe` = Voted, `finalized` = Finalized. | Odds can update almost live. Proposed blocks can in principle be reorged. | UI reads `latest` for live odds. The backend writes to its DB only from `finalized` logs ([ADR-0010](adr/0010-chain-reads-and-indexing.md)). |
| **Many blocks share one `block.timestamp`** (seconds resolution, ~3 blocks/s). | Deadline checks are second-granular. | All deadlines are in seconds. Nothing depends on block number as a clock. |
| **No global mempool, no pending tx queries.** `newPendingTransactions` is not supported. | We cannot show "pending bets" from the mempool. | The frontend shows the user's own optimistic pending state. Everyone else sees bets after inclusion (~300 ms later). |
| **`eth_getLogs` range caps** (as low as 100 blocks per call on some public RPCs, i.e. ~30 s of chain). | Naive backfill from the deploy block fails with `-32602 Invalid block range`. | The indexer pages in 100-block chunks and stores the last processed block ([ADR-0010](adr/0010-chain-reads-and-indexing.md)). |
| **Historical `eth_call` can fail** on non-archive nodes. | We cannot reconstruct old pool state by calling at old blocks. | History comes from events mirrored into our DB, never from historical calls. |
| **Storage warmed per 128-slot page** (MIP-8). | Struct fields packed together are cheap to read together. | Keep a round's hot fields in one struct (already the case in the spec below). Minor optimization, not a requirement. |
| **Blob txs (type 3) unsupported.** | None. | Nothing. |

## 3. What we use from the Monad ecosystem

The hackathon requires using what Monad Foundation provides. This table maps each Monad resource to where it appears in the system.

| Monad resource | How we use it | ADR |
| --- | --- | --- |
| Monad Testnet + official RPC | All contracts and transactions | [0001](adr/0001-monad-testnet-only.md) |
| `foundry-monad` template ([monad-developers/foundry-monad](https://github.com/monad-developers/foundry-monad)) | Contract project scaffold, preconfigured for chain 10143 | [0002](adr/0002-foundry-monad-toolchain.md) |
| MonadVision (Sourcify) + Monadscan verification | Verified source on both explorers, linked from the UI | [0002](adr/0002-foundry-monad-toolchain.md) |
| Faucet | Seeds team wallets, which seed users through the in-app drip | [0009](adr/0009-onboarding-privy-and-drip.md) |
| Privy (listed embedded wallet, testnet subsidized) | Email/social login with embedded wallets, plus MetaMask | [0009](adr/0009-onboarding-privy-and-drip.md) |
| Fast blocks + WebSocket `eth_subscribe` (`logs` / `monadLogs`) | Live odds board that updates as bets land, on-chain voting that confirms in under a second | [0010](adr/0010-chain-reads-and-indexing.md) |
| Multicall3 | Batched reads of round state for the lobby | [0010](adr/0010-chain-reads-and-indexing.md) |
| Pyth Entropy (VRF) | **Upgrade path**, not MVP: verifiable randomness for pitch shuffling and matchmaking | [0012](adr/0012-randomness.md) |
| Account abstraction providers (Pimlico, ZeroDev, etc.) | **Upgrade path**, not MVP: gas sponsorship | [0009](adr/0009-onboarding-privy-and-drip.md) |

The demo story is that every bet and every vote is a real Monad transaction, and the odds board moves at block speed. On slower chains that would be too slow and too expensive.

## 4. Trust model

Be explicit about who can do what, because "who settles" is where prediction markets usually cheat.

| Actor | Key | Powers | Cannot |
| --- | --- | --- | --- |
| **Owner** | Team MetaMask (deployer) | Set weight-class params, set operator, set treasury, pause new rounds | Move user funds, change a round's outcome |
| **Operator** | Backend hot wallet (env var) | Register fighters, create rounds, open voting with a commitment, settle by revealing that commitment, cancel a round before settlement | Pick a winner directly (the contract tallies votes), change the shuffle after voting opens, block refunds forever |
| **Treasury** | Team address | Receive rake | Anything else |
| **User** | Their wallet | Bet, vote (one per entry), claim, refund | Vote without having bet, vote twice, bet after lock |
| **Anyone** | Any wallet | Cancel a round that missed its settle deadline, which unlocks refunds | Anything else |

What the operator **can** still abuse (accepted for the hackathon, see [ADR-0007](adr/0007-winner-by-blind-onchain-vote.md)):

- It knows the pitch-to-fighter mapping during voting and could leak it.
- It controls which LLM outputs become the pitches. The pitch text is committed by hash before voting, so it cannot swap pitches after votes come in.
- It could cancel rounds it dislikes. Cancelling refunds everyone in full, so this hurts liveness, not funds.

The deadline-based public cancel guarantees that **funds can never be stuck** even if the backend dies ([ADR-0006](adr/0006-round-lifecycle-and-deadlines.md)).

## 5. Contract specification

One contract, `FightClub.sol` ([ADR-0003](adr/0003-single-contract.md)). This is the interface spec, not the final code. Names and signatures are the contract between the contracts, backend, and frontend workstreams, so change them only by updating this section and telling the team.

### 5.1 State

```solidity
enum Phase { None, Open, Fighting, Voting, Settled, Cancelled }
// Fighting is derived: phase == Open && block.timestamp >= lockTime

struct WeightClass {
    uint96  minBet;        // the "entry fee", in wei
    uint96  maxBet;        // per address per round
    uint16  rakeBps;       // e.g. 500 = 5%
    uint32  voteDuration;  // seconds
    uint32  settleGrace;   // seconds after voteEnd before anyone may cancel
    bool    active;
    bytes32 configHash;    // keccak of the off-chain class definition JSON (models, token budget, reasoning)
}

struct Fighter {
    address owner;         // house address for curated fighters, user address for custom ones
    uint8   classId;
    uint32  wins;
    uint32  losses;
    bytes32 profileHash;   // keccak of name + bio + persona at registration
}

struct Round {
    uint8   classId;
    Phase   phase;
    uint8   fighterCount;     // 2..8
    uint8   winnerIndex;
    uint40  lockTime;         // betting closes
    uint40  voteEnd;          // set when voting opens
    uint40  settleDeadline;   // after this, anyone may cancel
    bytes32 taskHash;         // keccak of task prompt + scoring mode, committed at creation
    bytes32 revealCommit;     // keccak(abi.encode(roundId, labelToIndex, judgeRank, salt))
    bytes32 pitchesHash;      // keccak of the ordered pitch texts shown to voters
    uint128 totalPool;
    uint128 rake;
    // snapshot of the class at creation so owner edits never affect a live round (ADR-0014)
    uint96  minBet;
    uint96  maxBet;
    uint16  rakeBps;
    uint32  voteDuration;
    uint32  settleGrace;
}

mapping(uint8 => WeightClass) public classes;
mapping(uint32 => Fighter) public fighters;
mapping(uint256 => Round) public rounds;
mapping(uint256 => uint32[8]) public roundFighters;     // index -> fighterId
mapping(uint256 => uint128[8]) public poolByIndex;      // index -> total staked
mapping(uint256 => uint32[8]) public votesByLabel;      // shuffled label -> votes
mapping(uint256 => mapping(address => Entry)) public entries;

struct Entry { uint128 amount; uint8 fighterIndex; bool voted; bool claimed; }
```

Arrays are fixed at 8 so every loop is bounded ([ADR-0011](adr/0011-gas-and-loop-bounds.md)).

### 5.2 Functions

```solidity
// owner
function setWeightClass(uint8 classId, WeightClass calldata c) external onlyOwner;
function setOperator(address op) external onlyOwner;
function setTreasury(address t) external onlyOwner;
function setPaused(bool p) external onlyOwner;          // blocks createRound and enter only

// operator
function registerFighter(address owner, uint8 classId, bytes32 profileHash) external onlyOperator returns (uint32 fighterId);
function createRound(uint8 classId, uint32[] calldata fighterIds, bytes32 taskHash, uint40 lockTime) external onlyOperator returns (uint256 roundId);
function openVoting(uint256 roundId, bytes32 revealCommit, bytes32 pitchesHash) external onlyOperator; // requires now >= lockTime
function settle(uint256 roundId, uint8[] calldata labelToIndex, uint8[] calldata judgeRank, bytes32 salt) external onlyOperator; // requires now >= voteEnd
function cancel(uint256 roundId) external onlyOperator;   // any phase before Settled

// users
function enter(uint256 roundId, uint8 fighterIndex) external payable;  // first call creates the entry; later calls top up the same fighter only
function vote(uint256 roundId, uint8 label) external;                  // Voting phase, must have an entry, once
function claim(uint256 roundId) external;                               // Settled, backed the winner
function refund(uint256 roundId) external;                              // Cancelled

// anyone
function cancelExpired(uint256 roundId) external;  // now > settleDeadline and not Settled

// treasury
function withdrawRake(uint256 amount) external;     // sends accumulated rake to treasury
```

### 5.3 Rules enforced on-chain

- `enter`: phase Open, `now < lockTime`, `round.minBet <= entry.amount + msg.value <= round.maxBet` (the round's snapshot, not the live class), the fighter index is valid, the same fighter as any existing entry, contract not paused.
- `openVoting`: sets `voteEnd = now + voteDuration` and `settleDeadline = voteEnd + settleGrace`. Before voting opens, `settleDeadline` is `lockTime + MAX_FIGHT_SECONDS (600) + voteDuration + settleGrace`, so a backend that never opens voting still releases funds.
- `vote`: phase Voting, `now < voteEnd`, `entries[msg.sender].amount > 0`, `!voted`, `label < fighterCount`. One vote per entry, not weighted by stake ([ADR-0007](adr/0007-winner-by-blind-onchain-vote.md)).
- `settle`: checks `keccak256(abi.encode(roundId, labelToIndex, judgeRank, salt)) == revealCommit`. It maps each label's votes to a fighter index and picks the most votes. **Ties** go to whichever tied fighter ranks best in `judgeRank` (the judge model's ordering, committed before voting). **Zero votes** means the judge's top pick wins. It then updates fighter W/L, computes rake, and sets phase Settled.
- **Nobody backed the winner** (`poolByIndex[winner] == 0`): the round settles for W/L purposes, but the pool is refundable in full with no rake ([ADR-0005](adr/0005-parimutuel-pool.md)).
- Pull payments only, guarded by checks-effects-interactions plus a reentrancy guard ([ADR-0008](adr/0008-pull-payments.md)).

### 5.4 Events

```solidity
event WeightClassSet(uint8 indexed classId, WeightClass c);
event FighterRegistered(uint32 indexed fighterId, address indexed owner, uint8 classId, bytes32 profileHash);
event RoundCreated(uint256 indexed roundId, uint8 indexed classId, uint32[] fighterIds, bytes32 taskHash, uint40 lockTime);
event Entered(uint256 indexed roundId, address indexed user, uint8 fighterIndex, uint128 amount, uint128 fighterPool, uint128 totalPool);
event VotingOpened(uint256 indexed roundId, bytes32 revealCommit, bytes32 pitchesHash, uint40 voteEnd);
event Voted(uint256 indexed roundId, address indexed user, uint8 label);
event Settled(uint256 indexed roundId, uint8 winnerIndex, uint32 winnerFighterId, uint8[] labelToIndex, uint128 totalPool, uint128 rake, bool refundMode);
event RoundCancelled(uint256 indexed roundId, address by);
event Claimed(uint256 indexed roundId, address indexed user, uint128 payout);
event Refunded(uint256 indexed roundId, address indexed user, uint128 amount);
```

`Entered` carries the post-bet pools, so the live odds board can update from the event alone without an extra read.

### 5.5 Off-chain commitments

The chain stores **hashes**, not content ([ADR-0013](adr/0013-offchain-data-hash-commitments.md)):

| Hash | Committed when | Content (stored in our DB, served by API) |
| --- | --- | --- |
| `WeightClass.configHash` | class set | class JSON: allowed models, token budget, reasoning level, time limit |
| `Fighter.profileHash` | registration | name, bio, persona prompt, model id |
| `Round.taskHash` | round creation | task prompt, task category, scoring mode, salt |
| `Round.pitchesHash` | voting opens | ordered pitch texts exactly as shown to voters |
| `Round.revealCommit` | voting opens | shuffle (`labelToIndex`), `judgeRank`, salt |

Anyone can fetch the content from our API and check it against the hash, which makes the operator's after-the-fact tampering detectable.

## 6. Money flow and payout math

Parimutuel, like horse racing ([ADR-0005](adr/0005-parimutuel-pool.md)). Native MON only ([ADR-0004](adr/0004-native-mon.md)).

```
totalPool   = sum of all bets in the round
rake        = totalPool * rakeBps / 10000
winnerPool  = poolByIndex[winnerIndex]
payout(you) = yourBet * (totalPool - rake) / winnerPool        // floor division
```

Example: 4 fighters with pools of 1, 2, 3, 4 MON (total 10), 5% rake. Fighter #1 wins.
Net pool is 9.5 MON. Someone who bet 0.5 MON on #1 gets `0.5 * 9.5 / 1 = 4.75 MON`.
Implied odds shown live are `(totalPool - rake) / poolByIndex[i]`, so 9.5x for fighter #1 before the result.

Floor-division dust (a few wei) stays in the contract and is ignored.

The **entry fee** is the class `minBet`, and it counts as your bet. Higher classes have larger `minBet`/`maxBet`, which makes them the higher-stakes, higher-payout tables. Proposed starting values, kept tiny because testnet MON is scarce ([ADR-0014](adr/0014-weight-class-onchain-params.md)):

| Class | id | minBet (entry) | maxBet | rake | voteDuration | settleGrace |
| --- | --- | --- | --- | --- | --- | --- |
| Flyweight | 0 | 0.01 MON | 0.1 MON | 5% | 45 s | 300 s |
| Middleweight | 1 | 0.05 MON | 0.5 MON | 5% | 60 s | 300 s |
| Heavyweight | 2 | 0.2 MON | 2 MON | 5% | 60 s | 300 s |

## 7. Testnet MON budget

Rough per-transaction gas cost is negligible at testnet prices, but **remember gas is billed on the limit**. The real constraint is the reserve balance rule plus faucet limits.

| Wallet | Purpose | Target balance | Why |
| --- | --- | --- | --- |
| Deployer / owner | Deploy, configure classes | 1 to 2 MON | A handful of transactions |
| Operator | ~3 txs per round (create, openVoting, settle) plus fighter registrations | **12+ MON** | It sends no value, but keep it above 10 MON so the reserve rule never bites on rapid back-to-back txs |
| Drip | Funds new users (e.g. 0.3 MON each, once per account) | **10 MON + 0.3 per expected user** | It sends value in rapid succession, so it **must** stay above 10 MON or drips start reverting |
| Demo wallets | Teammates acting as bettors during the demo | 1 MON each | Enough for many bets at Flyweight |

Pool all teammates' faucet drips into the operator and drip wallets at hour 0.

## 8. Wallets and onboarding

[ADR-0009](adr/0009-onboarding-privy-and-drip.md). Goal: from landing page to first bet in under 60 seconds, with MetaMask supported.

1. User clicks **Enter the Club**. A Privy modal offers email / Google, or MetaMask (plus any injected wallet).
2. Email/Google users get a Privy **embedded EOA wallet** (not a 7702 smart account, because of the reserve rule). MetaMask users are prompted to add/switch to chain 10143.
3. If the wallet holds less than `minBet + gas buffer`, the frontend calls `POST /api/drip`. The backend sends 0.3 MON from the drip wallet, once per address and once per Privy user id, rate limited per IP.
4. User picks a fighter and signs `enter`. Embedded wallets can be set to skip the confirmation modal for small amounts so the flow feels like a normal app.

wagmi + viem handle contract calls. Privy plugs in as the wagmi connector, so the same hooks work for both wallet types.

## 9. Reading the chain

[ADR-0010](adr/0010-chain-reads-and-indexing.md).

- **Frontend live data**: a viem WebSocket client subscribes to `FightClub` logs (`Entered`, `Voted`, `Settled`, and so on) at `latest` and updates the odds board and vote counter immediately. The initial load batches `rounds(id)` and `poolByIndex(id)` reads through Multicall3.
- **Backend indexer**: subscribes to logs, plus a catch-up loop over `eth_getLogs` in 100-block pages. It writes rows only once a block is `finalized` and stores `lastIndexedBlock` so it resumes after restarts. This mirror powers match history, profiles and leaderboards. The chain stays the source of truth for money; the DB is a cache.
- **RPC**: the backend uses a dedicated provider endpoint (Alchemy or QuickNode free tier) because the public RPC caps at 20 rps. The frontend may use the public RPC, since each user generates little traffic.

## 10. Deploy and verify

[ADR-0002](adr/0002-foundry-monad-toolchain.md). Requires Foundry v1.8.0 or later.

```bash
# scaffold
forge init --template monad-developers/foundry-monad contracts

# deploy (testnet)
forge script script/Deploy.s.sol --rpc-url https://testnet-rpc.monad.xyz --broadcast --private-key $DEPLOYER_PK

# verify on MonadVision (Sourcify, no key)
forge verify-contract <addr> src/FightClub.sol:FightClub --chain 10143 \
  --verifier sourcify --verifier-url https://sourcify-api-monad.blockvision.org/

# verify on Monadscan (Etherscan-family key)
forge verify-contract <addr> src/FightClub.sol:FightClub --chain 10143 \
  --verifier etherscan --etherscan-api-key $MONADSCAN_KEY --watch
```

The deploy script also calls `setWeightClass` for the three classes, `setOperator`, `setTreasury`, and registers the house fighters. After deploy, write the address and deploy block to `packages/shared/deployments/10143.json`. Both the frontend and backend read that file, so redeploying never requires hunting for hardcoded addresses.

## 11. Known risks and accepted shortcuts

| Risk | Severity (testnet) | Accepted because | Fix later |
| --- | --- | --- | --- |
| Operator is a single hot key | Medium | Hackathon speed | Safe multisig (Safe v1.4.1 is deployed on testnet) as owner, rotate operator, or a decentralized oracle |
| Votes are public on-chain while voting is open (herding) | Low | Commit-reveal voting needs an extra phase and an extra user tx | Commit-reveal votes ([ADR-0007](adr/0007-winner-by-blind-onchain-vote.md)) |
| Bettors vote, so they are biased toward their own fighter | Medium | Blind, shuffled pitches reduce it, and it is part of the game ("pitch to the crowd") | Exclude votes for your own fighter after reveal, or blend in the judge score |
| Sybil: one person, many wallets, many votes | Low | Each vote costs at least `minBet`, and that money goes into the pool | Privy user-id gating, a proof-of-personhood add-on |
| Operator leaks the shuffle to a friend | Low | Testnet | Pyth Entropy shuffle revealed only at settlement ([ADR-0012](adr/0012-randomness.md)) |
| Reserve-balance reverts for low-balance users sending txs in quick succession | Medium | Documented, and the UI serializes txs | Paymaster / sponsored txs |
| Free LLM tier rate-limits mid-demo | High (UX) | Cost | Paid key; operator cancels the round, which refunds everyone |

## 12. Mainnet migration checklist

Not in scope, but here so nobody has to rediscover it:

1. Legal review (real-money wagering).
2. Change chain config to `143` and `rpc.monad.xyz`, plus a paid RPC.
3. Owner becomes a Safe multisig, the operator key moves to a KMS.
4. Audit the contract.
5. Replace the operator-chosen shuffle with Pyth Entropy, and consider commit-reveal votes.
6. Re-check the reserve balance parameters and gas pricing on mainnet.
