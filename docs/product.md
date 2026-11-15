# Product spec

On-chain rules are in [blockchain.md](blockchain.md). This doc covers the game itself.

## 1. The round, start to finish

| # | Phase | Duration (default) | What users see | What happens underneath |
| --- | --- | --- | --- | --- |
| 1 | **Fight card posted** | 60 to 120 s of betting | The task, the 4 fighters (cards with name, record, ELO, bio, class), live odds, pool size, countdown | Operator called `createRound`. Bets are `enter` txs. Odds update per block |
| 2 | **Lock** | instant | "Bets closed. FIGHT." | `lockTime` passes. The orchestrator starts all fighters at once |
| 3 | **Fight** | 30 s to 5 min (class and task dependent) | The animated arena. Fighters "attack" as they make progress. A side panel streams each fighter's work | LLM calls stream tokens. The orchestrator turns them into visual events (see [architecture.md](architecture.md#4-live-event-protocol)) |
| 4 | **Pitches** | 45 to 60 s of voting | Anonymous "Pitch A/B/C/D" cards, each with the result and a pitch of 120 words or less. Entrants get one vote | The judge model ranks the pitches. Operator calls `openVoting` with the commitments. Votes are `vote` txs |
| 5 | **Decision** | instant | Reveal animation: the pitches flip to show fighter identities, the winner is announced, payouts are shown | Operator calls `settle`. Contract tallies votes. ELO and memories update |
| 6 | **Collect** | any time | "Collect X MON" button | `claim` tx |

## 2. Weight classes

Classes group fighters by capability, not by size. The money side (entry fee, max bet, rake) is on-chain. The capability side is off-chain config hashed on-chain ([ADR-0014](adr/0014-weight-class-onchain-params.md)).

| Class | Entry (min bet) | Max bet | Allowed models | Max output tokens | Reasoning | Fight time |
| --- | --- | --- | --- | --- | --- | --- |
| **Flyweight** | 0.01 MON | 0.1 MON | Small/fast free models | 1,500 | off | 30 to 60 s |
| **Middleweight** | 0.05 MON | 0.5 MON | Mid-size free models | 4,000 | low | 1 to 2 min |
| **Heavyweight** | 0.2 MON | 2 MON | The strongest models available (paid keys if we have them, otherwise the biggest free models) | 12,000 | high | 2 to 5 min |

Why higher classes are riskier: the stakes are larger, and stronger models produce closer, less predictable results, so favorites lose more often. The exact model lists are filled in at hour 1 once we know which free models actually respond (see [README costs](../README.md#costs-you-bear-right-now)).

Custom rounds may override the fight time and token budget within the class limits.

## 3. Fighters

Persistent characters ([ADR-0015](adr/0015-fighter-identity-onchain.md)).

| Field | Where | Example |
| --- | --- | --- |
| id, owner, class, wins, losses | On-chain | `#7`, house, Middleweight, 12-5 |
| name, nickname, bio, avatar | DB | "Rex 'The Compiler' Okafor", "Never comments his code. Never loses a fight in the server room." |
| persona prompt | DB | Fighting style: terse, aggressive, ships fast, takes risks |
| model id + params | DB | provider, model, temperature |
| ELO per class | DB | 1,540 |
| memories | DB | A list of short notes written after each round |

**Memory loop.** After each round, one cheap LLM call writes a note of 2 sentences or less per fighter: the task, what they did, how the crowd reacted, whether they won, and one lesson. The latest 5 notes plus a running "career summary" (rewritten every 5 rounds) go into the fighter's system prompt next fight. Over time, fighters develop rivalries ("lost to Vesper twice on writing tasks"), which makes them feel like real people.

**House roster.** Seed 8 to 12 fighters across the 3 classes with distinct personas, so a 4-fighter card always has contrast.

**Custom fighters.** Users can create a fighter (name, bio, persona, model from the class allowlist). The backend moderates it (blocklist plus a cheap LLM check), then registers it on-chain with the user as `owner`. Custom fighters build their own record and memory like house fighters.

## 4. Tasks and scoring

Users can pick a template or write their own prompt for custom rounds. House rounds rotate templates.

Every task has a **category**, which picks the arena visual, and a **scoring mode**, which tells the judge how to rank results. The judge ranking is always computed and committed. It breaks vote ties, and it is shown after the reveal as "the judge's card" ([ADR-0007](adr/0007-winner-by-blind-onchain-vote.md)).

| Scoring mode | Use for | How the judge ranks | MVP? |
| --- | --- | --- | --- |
| `rubric` | Pitches, writing, design ideas, strategy, any free-text prompt | An LLM judge scores each result 1 to 10 on 3 to 5 rubric criteria generated with the task. Ranked by total | Yes (default) |
| `exact` | Riddles, math, trivia with one right answer | Correct answers first, then by time to answer | Yes |
| `constraint` | "Write a haiku about X", "under 50 words", "must include Y" | Programmatic checks (word count, regex), then rubric | Stretch |
| `tests` | Coding tasks | Run hidden unit tests in a sandbox, ranked by tests passed, then time | Stretch (needs a sandbox) |

For a free-text custom prompt, the backend makes one LLM call at round creation to classify the category, pick a scoring mode and generate a rubric. That output becomes part of `taskHash`.

The **pitch** is part of every fighter's output: the fighter must end with a `PITCH:` section of 120 words or less, selling its result to the crowd without naming itself. If the task's result is short (e.g. an exact answer), the pitch shows the result plus the fighter's argument for it.

## 5. Arenas (visual environments)

The arena changes with the task category, so every task can be watched. All arenas share one animation vocabulary (approach, jab, combo, dodge, stagger, taunt, knockdown) driven by the same event stream. Only the setting and props change.

| Category | Arena | Flavor |
| --- | --- | --- |
| `pitch` / business | **The Basement**: concrete floor, single bulb, crowd in shadow | Default fight club |
| `code` | **Server Room**: racks, blinking LEDs, cables as ropes | Fighters' punches throw code fragments |
| `math` / logic | **Chalk Cage**: chain-link cage covered in equations | Hits leave chalk marks |
| `writing` / creative | **The Alley**: rain, neon sign, brick walls | Words spray-painted on walls as they write |
| `trivia` | **Bar Fight**: pool table, neon beer signs | Bottles fly on correct answers |
| `design` / strategy | **Parking Garage**: concrete pillars, car headlights | Blueprints flutter |

**Aesthetic: fight club.** Grainy film texture, muted greens and sodium-orange light, distressed typewriter-and-stencil type, splice-frame glitches on transitions, stamped red "WINNER" reveal. Fighters are 2D silhouettes or simple pixel sprites with a color accent per fighter. The UI copy leans into the theme ("First rule: back your fighter. Second rule: back your fighter.").

## 6. Leaderboard and history

- **Leaderboard:** per class, sorted by ELO, showing record (on-chain W/L), win streak, and total MON wagered on them.
- **Fighter profile:** bio, record, ELO chart, recent memories ("diary"), and past fights.
- **Match history:** every round with task, fighters, pitches, vote breakdown, judge card, pool, payouts, and a replay of the fight animation from recorded events.
- **Bettor profile** (by wallet): rounds entered, P&L, unclaimed winnings.

ELO: after each settled round, every pair of fighters is treated as a match decided by final vote rank (K=32, per class). Only house and approved custom fighters are rated.

## 7. Custom rounds

A user configures: class, number of fighters (2 to 8), the fighters themselves (from the roster or their own), a task (template or free text), and optional fight time and token budget within class limits. The backend validates it, queues it (free LLM tiers mean only 1 or 2 rounds can run at once), and creates it on-chain when a slot opens. Everyone can bet on custom rounds, not just the creator.

## 8. Out of scope for the 9-hour build

Real money, fighter NFTs and owner revenue share, in-fight betting, commit-reveal voting, code sandbox scoring, chat, mobile-native apps, multiple simultaneous live rounds per class.
