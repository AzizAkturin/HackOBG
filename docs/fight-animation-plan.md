# Fight animation overhaul: plan of action

Goal: robot fights that look advanced, exciting and unpredictable, like real boxing. This merges four research passes (motion quality, physics/impact, fighter AI, footwork) into one build order with the cross-part contracts resolved.

## 1. What is wrong today (verified in code)

Motion
- `samplePose` wraps every move in GUARD at u=0 and u=1 (`moves.ts:258`), and `play()` hard-swaps actions, so combos retract to guard between punches.
- One smoothstep ease everywhere (`moves.ts:230`): velocity is zero at the hit key, so punches decelerate into the target.
- The 16/s follow in `Robot.tsx:232` (time constant ~62 ms) is longer than a jab's strike segment (~97 ms): the arm never reaches full extension and peaks ~60 ms after sparks fire. Reduced motion (6/s) is worse.
- Fixed durations and keys, so every jab is identical. `pose()` mutates state (nulls finished actions), so it cannot be sampled purely.

Impact
- Hit reactions are canned (`stagger` for any head shot) and ignore punch direction. Hurt only flashes lights; damage only drives the wear shader.
- Legs only bend and walk; no hip lead, weight shift or rear-foot pivot. `body.position = (side, fwd)` slides the feet.
- Camera shake is `Math.random()` per frame: fps dependent and directionless.
- Everything runs on `clock.elapsedTime`, so there is no way to freeze fight time (hitstop).

Choreography
- Attacker is a coin flip per exchange; combo pick is uniform weighted; reaction rolled per punch independently; defender always reacts exactly 0.18 s before impact.
- Only one fighter acts at a time. No counters, trades, interrupted combos, stamina, momentum or style. `damage[]` never changes behaviour. Gaps are uniform random.

Footwork
- Fixed `sin(t*0.35)` orbit around world origin at a fixed distance (bodies 2.0 apart in a fight, 4.2 idle). No pressing, retreating, ropes, corners, clinch.
- `pose()` returns WALK whenever speed > 0.4, so guard drops whenever a fighter steps.
- Facing bias uses `sign(world x)`, so stance flips when fighters cross x=0 once they move freely.
- Step moves use pose `fwd`, which snaps back instead of moving the fighter.

## 2. Key finding that shapes the design

The backend never decides hits. `packages/shared/src/events.ts` and `server/src/fight/moves.ts` emit one-sided per-fighter `action` events (`jab | combo | dodge | circle | stagger | taunt | knockdown`, with `intensity`) driven by LLM token bursts, milestones, thinking gaps and retries. The winner comes from a blind vote after the fight; every move is cosmetic. So the frontend director is the **choreographer**: the backend (or a local AI in mock mode) says what each fighter is trying to do and how hard, and the director decides the defence and outcome. No WS client exists in `web/` yet, and `useRound.ts` is a 24 s mock while live fights run 30 s to 5 min.

## 3. Target architecture

```
 Intent source (swappable)          Choreographer (pure, seeded)        Executor (director.ts)                 Render
 ┌──────────────────────┐          ┌───────────────────────────┐       ┌───────────────────────────┐        ┌────────────────────────┐
 │ RandomSource (AI)    │─Intent[]▶│ choreograph(ctx, intents) │─beats▶│ Timeline on fight clock   │──────▶ │ Robot.tsx              │
 │ LiveSource (protocol)│          │  reads, counters, trades, │       │ play / impact / range /   │        │ base pose (moves.ts)   │
 └──────────────────────┘          │  rocked, rhythm           │       │ cue / state beats         │        │ + spring offsets       │
                                   └───────────────────────────┘       │ owns: now, hitstop, rng,  │        │ + gait / leg IK        │
                                                                       │ FighterState, Locomotion, │        └────────────────────────┘
                                                                       │ FighterBody springs       │
                                                                       └───────────────────────────┘
```

Layers composed per robot per frame, in this order:
1. **Base pose**: `sampleInstance(move, now)` from `moves.ts`, filtered with a phase-dependent follow (none during strikes).
2. **Spring offsets**: `FighterBody.x` from `physics.ts`, added after filtering (never low-passed), then `clampPose`.
3. **Locomotion**: `base.x/z/rotY` from `footwork.ts`; legs from `gait.ts` (stepping) blended with planted IK (pivot, weight shift) as speed approaches 0.

New modules (pure TS, no `three`, testable with `node --test`):
- `three/fight/rng.ts`, `fighter.ts`, `rhythm.ts`, `catalog.ts`, `choreographer.ts`, `timeline.ts`, `live.ts`
- `three/physics.ts`, `three/ringGeo.ts`, `three/footwork.ts`, `three/gait.ts`

## 4. Resolved cross-part decisions

These are the places where the four research passes disagreed or overlapped. Each is settled here so stages do not fight each other.

| Topic | Decision |
|---|---|
| Time | Director owns a fight clock: `tick(realDt, phase)` sets `now` and scaled `dt` (0 during hitstop, 0.35 during slow-mo). `pose(i)` and every beat, move, spring and locomotion step use fight time. Lights, crowd, sparks, lens and camera stay on wall clock on purpose (sparks bursting over frozen fighters is the classic impact read). |
| Randomness | One seeded `Rng` (mulberry32) in `fight/rng.ts`, forked per subsystem. No `Math.random` in sampling, physics or footwork. Seed = `roundId` in live mode, so replays are identical. |
| Starting moves | `play(i, move, at, { v?: Variation, mirror?, startU? })`. `from` pose is captured at play time from the director's pure base sample. "Cancel" is just playing the next move (from-capture blends it). Speed/fatigue maps to `Variation.windup/recover`, not a separate `speed` knob. |
| Hit timing | Always `moveTiming(move, v).hitAt`; the old `def.dur * hit.at` is removed. Variation uses a two-piece time warp so the hit key lands exactly at `hitAt`. |
| MoveDef schema | One extension, added in Stage 1 even where unused yet: `keys` with per-key `ease`, `end`, `vary`, `mirror`, `chain`, `tell` (u where readable), `recover` (u after which the fighter can act), `hit: { at, target, kind: HitKind, hand: 'lead'|'rear', power }`, `root?: { fwd?, side?, from?, to? }`, `range?: RangeBand[]`, `cost?`. Mirroring flips `hand`. |
| Stun / rocked | Gameplay state lives in `FighterState` (fight/fighter.ts) only. `FighterBody` springs read `rocked` and `damage` to set stiffness and rest targets (knee buckle, hands falling, slow sway). No duplicate counter in physics. |
| `impact()` | Becomes the Timeline's impact-beat executor (Part 3 owns it). It calls `applyImpact` (state), `body.impulse/recoil/whiff` (springs), `freeze` (hitstop), `loco.push` (knockback), plus existing bursts, shake, crowd cue and event. |
| Impulse API | `impulse(i, kind, hand, strength)` with strength = `power × (clean ? 1 : 0.4)`; `recoil(attacker, hand, strength)` on blocks; `whiff(attacker, kind, hand)` on slips and ducks. |
| Knockback and steps | Real travel goes through `loco.push` (impulse) and `loco.commit` (root motion from `MoveDef.root`). Keyframe `fwd/side` become small leans applied to the pelvis (`upper`), not `body`, so feet stay planted. |
| Reaction moves | `stagger` and `bodyFold` become non-directional "guard broken" shapes (arms flare, short drop, root step back). Head and torso direction come from springs, otherwise a hook double-hits. |
| Movement intents | Footwork's `MoveIntent` is the single vocabulary (`hold, press, cutOff, retreat, circle, pivot, clinch, center, goto, locked`). The AI's "pin" is `press` with high urgency. Range beats carry a `MoveIntent`. |
| Styles | Part 3 styles are canonical: `pressure`, `counter`, `outboxer`. Each maps to a `LocoStyle` (accel, speeds, preferred range, bounce). |
| Legs | `gait.ts` owns stepping (sagittal, lateral shuffle, pivot-in-place, wheel yaw) and stride phase. Planted two-bone IK with hip lead, per-leg weight shift and rear-foot pivot lives beside it and fades in as speed approaches 0. |
| Camera | `CameraRig` gets three additions: azimuth tracking perpendicular to the fighter axis (±0.7 rad, hysteresis), punch-in toward the impact on heavy hits, and directional fps-independent shake. All off or reduced under reduced motion. |
| Reduced motion | `director.reduced` set in `Arena.tsx`. No overshoot/anticipation eases, no kinetic chain, half amplitude variation, damped kicks, static buckle, half-length hitstop, no punch-in or shake. |
| Event types | Director's `FightEvent` is renamed `ImpactEvent` (clashes with the protocol type), keeping `attacker, move, reaction` and adding optional `power, clean, note`. |
| Tests | `node --test` over pure modules (Node 26 type stripping, `.ts` imports); exclude `*.test.ts` from `tsconfig.app.json`. No new dependency. |

## 5. Build order

Each stage ends in a verifiable state. Stop after each for review.

### Stage 0: foundations (~0.5 d)
- Fight clock: `director.tick(realDt, phase)`, `now`, `dt`, `freeze()`, `slowmo`; switch `DirectorTick` (`Effects.tsx:11`) and Robot's pose/blend/stride to fight time.
- `fight/rng.ts`; director gets `rng` and `reduced`.
- `node --test` script and tsconfig exclude.
- Dev debug hook behind `?debug`: `window.__director`, a time-scale multiplier, and keys to force a move plus reaction (hook-hit, uppercut-hit, block, whiff, knockdown).
- Verify: app looks unchanged; `freeze(1)` from the console stops fighters while crowd and lights keep going.

### Stage 1: motion quality (~1.5 d)
- `moves.ts`: `Ease`/`EASES`, the full MoveDef schema above, `Variation`, `rollVariation`, `moveTiming`, `instantiate`, `sampleInstance`, `mirrorPose`, `addPose`, `clampPose`. Delete `samplePose`.
- Director: actions become `MoveInstance`; pure `basePose(i)`; `frame(i) → { pose, follow }`; cleanup of finished moves moves into `update()`; impacts scheduled from `moveTiming`.
- Robot: follow alpha from `follow` (instant during strike windows, ~30 in moves, 8 idle, 4 walk/sit); additive-offset slot after filtering.
- Retune keys: `in` strikes with a short stick hold, `anticipate` hook load with whip follow-through, `back` overshoot on recovery, `snap` defences, gravity `in` on the knockdown fall plus a small bounce.
- Sub-order: sampler with from-capture first (fixes snap-back alone), then follow, then variation, then retune, then mirror and kinetic chain.
- Verify: check script asserts start = from, hit key exact at `hitAt`, end = GUARD, no NaN, elbows ≤ 0, mirror is an involution, across 200 variations × every move × mirror. Visually at 0.25×: no retract between punches, full extension on the spark frame, five jabs look different.

### Stage 2: impact feel (~1.5 d)
- `physics.ts`: `FighterBody` with 14 spring channels (head pitch/yaw/roll, torso, pelvis fwd/side/drop, arms, guard), fixed 1/120 substeps, limits, NaN reset; `KICKS` table per `HitKind` with ±20% jitter and a small off-axis term.
- Damage loosens springs (lower ω and ζ) so hurt robots wobble and settle slowly. Rocked rest targets get wired in Stage 5 once `FighterState` exists.
- Hitstop durations by power (block 25 ms to knockdown 140 ms + 0.45 s slow-mo at 0.35×), `max` not sum; defender hit-shake jitter during the freeze.
- Recoil on blocks, overextension stumble (`loosen`) on whiffs.
- Retune `stagger`/`bodyFold` to non-directional.
- Camera: punch-in and directional shake.
- Verify: lead hook turns the defender's face to its left, uppercut snaps up, body shot folds. Spring peaks within ~5% at normal vs 6× CPU throttle. Crowd and sparks move during freezes. `damage = [0.9, 0.9]` visibly wobbles.

### Stage 3: footwork and ring (~3.5 d)
- `ringGeo.ts` (moves `RING_HALF`, `CORNER_SEATS` out of Ring/director): clamp, rope and corner info, `trapped`, `escapeDir`, `backroom`.
- `footwork.ts` `Locomotion`: intents, local-frame speed caps and accel limits, step pulses synced to stride phase, fixed stance sign per fighter (fixes the flip), circle-circle collision with presser mass bias, rope rebound, clinch sub-state with referee break, `push`, `commit`, `query`.
- Root motion: `MoveDef.root` committed per frame; keyframe `fwd` becomes lean only.
- Director: `base` becomes a getter over `loco.f`; GUARD during fights regardless of speed (fixes guard drop); phase default intents (betting spots, press/hold, walk to seats with tangential sidestep). Placeholder weighted intent picker until Stage 5.
- `gait.ts` stepping: forward/back sign from local velocity, lateral step-drag shuffle, pivot-in-place, stride scaled by `rig.thigh`; wheel robot (gyro) yaws its wheel toward travel.
- Camera azimuth tracking and separation-based radius.
- Verify: `node --test` collision fuzz (10k pairs), 60 s sim fuzz at random dt (no NaN, no overlap, inside ring, accel limits), behaviour tests (press traps retreater within 10 s, pivot escapes ropes in 1.5 s, rest from crossed positions seats both in 6 s). `?footwork` debug overlay; check foot sliding at 0.25×.

### Stage 4: planted legs (~1 d)
- Two-bone sagittal IK per leg with lateral abduction; hip lead (`hipYaw = clamp(0.45·yaw, ±0.3)`, torso counter-rotates); per-leg drop for weight shift; rear-foot pivot with heel lift; mirror sign handling in one helper. Blend with gait by speed. Wheel: weight shift becomes upper lean, recoil spins the wheel. Skip IK while `|fall| > 0.05`.
- Verify: crosses and hooks pivot the rear foot; weight visibly moves to the front knee; check silverback (widest hips) and stilt (tallest) for joint gaps and hyperextension.

### Stage 5: fighter AI and choreography (~5 d)
- `fight/fighter.ts`: `FighterProfile` from brand/weight class/elo/avgFinish (`profileFor`), `FighterState` (stamina, damage, stun, rocked, momentum, rally, knockdowns, down, busyUntil, reads), `applyImpact`, `tickState`.
- `fight/rhythm.ts`: tension curve over `roundLen` (feel-out, plateau, late ramp) plus mode machine (feel, work, flurry, lull, swarm, recover, finish); log-normal gaps.
- `fight/catalog.ts`: tagged combos replacing `COMBOS`, defence-by-punch table.
- `fight/choreographer.ts`: utility-based initiative (A, B, trade, nobody); range-aware combo choice from `loco.query`; reads via `tell` + log-normal reaction time scaled by fatigue, damage, rocked, combo depth and recent feints; margin decides evade, block, glancing or clean; slip/duck counters that truncate the attacker's combo; block returns; trades; feints that bait. Stun crosses a chin-based threshold → rocked 2.5 to 4 s → opponent swarms with `press` urgency, rocked fighter covers up or clinches → survive, knee touch or knockdown. Comebacks. Knockdown only when rocked, never before 20% of the round, at most one per fighter per round.
- `fight/timeline.ts`: typed beats on the fight clock with group cancel. Director becomes the executor; `exchange()`, `react()`, `COMBOS`, `HEAVY` deleted.
- Wire rocked into Stage 2 springs (buckle, hands falling, sway).
- New moves: `kneel`, `coverUp` (block with hold), `wobble`, `down`, `clinch`; stretch: `parry`, lead uppercut, rear hook (mirror gives these free).
- Consumers: `CrowdKind` gains `rocked` (and `comeback`) in `moods.ts`, `Crowd.tsx` priority; Octagon callouts for Counter, Rocked, Trade, Comeback, throttled to clean power shots, notes and knockdowns.
- Verify: seeded `node --test` over 1000 exchanges: no impossible overlaps, every impact matches a hit frame, defences before impact and reactions after, counters only after evasions, RT spread std > 0.04 s, clean-hit rate rises with fatigue and damage, counter style counters ≥ 2× pressure style, knockdown rules hold, deterministic per seed. Rhythm: last quarter busier than first, non-uniform gaps. Full-round sim at 24 s and 180 s. Then watch 3 to 4 rounds.

### Stage 6: live event source (~1 d, end-to-end blocked on a web WS client)
- `fight/live.ts`: protocol → Intent (`jab` light, `combo` combo, `combo ≥ 0.8` power with land bias, `dodge` evade/counter, `circle` reset, `stagger` opponent lands a clean shot, `taunt`/first `finished` showboat, `ko` finish stay-down, `progress` bounded momentum bias, `reveal` loser down and winner victory).
- 0.5 s playout buffer so near-simultaneous opposite intents become trades and counters; coalescing; stale intents dropped after 2.5 s; idle filler after 1.5 s of silence.
- Verify: recorded envelopes give identical timelines for live and replay; simultaneous opposite jabs produce a trade or counter; `ko` keeps the loser down across phases.

**Total: about 14 developer-days.** Stages 1 and 2 give most of the visible improvement for ~3 days.

## 6. Risks to keep in view
- **Fairness of visuals.** Bettors and voters watch this. If one robot looks dominant it can read as a hint about the blind-vote winner. Momentum bias from real progress is capped at ±0.5, and land bias must never make one robot look destroyed. Needs a product call (see open questions).
- **Overshoot artefacts.** `back` eases can hyperextend elbows or sink `fall` into the mat; `clampPose` and no overshoot on `fall`.
- **Knockdown near ropes.** Root step plus fall can put the head outside the ring; scale fall by `backroom` or slide toward centre first.
- **Springs vs knockdown.** Scale body and torso offsets down as `|fall|` grows; head and arm channels only for the knockdown impulse.
- **Clinch-range sparks inside bodies.** Clamp impact reach to at least attacker radius + 0.15.
- **Crowd single slot** loses one cue in trades; cue the trade winner or make `crowd` a short ring buffer.
- **Phase transitions.** `down: 'out'` must persist through rest, voting and reveal, or the KO'd robot stands up. Clear rocked, stun and timeline on leaving `fighting`; keep damage.
- **Callout spam** with more events; throttle.
- **Fight length.** Rhythm must normalise to `roundLen` from `phase.endsAt`, not assume 24 s.

## 7. Open questions
1. How visibly should the live progress lead influence who looks like they are winning, given betting and blind voting?
2. Should mock/random mode show knockdowns at all, or only when the backend sends `ko`?
3. Any style mapping preferences per brand (e.g. which robots are pressure fighters vs counterpunchers)?
