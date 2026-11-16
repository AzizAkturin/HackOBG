# Fighter moves

The robots fight in a boxing style. Every move is cosmetic: the winner is decided by the crowd vote ([ADR-0007](adr/0007-winner-by-blind-onchain-vote.md)). The moves exist so the arena shows real LLM progress as a fight ([architecture.md §4](architecture.md#4-live-event-protocol)).

This catalog lists what a fighter can do, what animation plays, and which LLM signal triggers it. `web/src/three/fight/choreographer.ts` plans each exchange (reads, blocks, counters, trades) and `web/src/three/director.ts` plays it; live stream cues pick who attacks and how hard, and a local AI fills the gaps.

## 1. Strikes

Boxing numbers the six basic punches 1 to 6. We add body and overhand variants for variety.

| # | Move | Hand | Target | What it looks like | Animation key |
| --- | --- | --- | --- | --- | --- |
| 1 | Jab | Lead | Head | Fast straight punch, small step in, torso barely turns | `jab` |
| 2 | Cross | Rear | Head | Straight power punch, hips and shoulders rotate fully | `cross` |
| 3 | Lead hook | Lead | Head | Arm bent ~90°, swings horizontally, torso whips across | `hook` |
| 4 | Rear hook | Rear | Head | Mirror of the lead hook | (stretch) |
| 5 | Lead uppercut | Lead | Chin | Dip the knees, punch rises vertically | (stretch) |
| 6 | Rear uppercut | Rear | Chin | Dip, then drive up through the legs and hips | `uppercut` |
| – | Body hook | Lead | Ribs | Level change down, hook to the side of the body | `body` |
| – | Overhand | Rear | Head | Looping punch over the opponent's guard, heavy and slow | `overhand` |
| – | Feint | Lead | – | Half a jab to draw a reaction | `feint` |

**Combinations** chain these, each punch starting as the last one lands: 1-2 (jab, cross), 1-2-3 (jab, cross, hook), 1-body-6 (jab, body hook, uppercut), 2-3-2.

## 2. Defense

| Move | What it looks like | Beats | Animation key |
| --- | --- | --- | --- |
| Block (high guard) | Both fists tight to the face, chin down, absorbs the punch | Anything, at a small cost | `block` |
| Slip | Small torso lean off the line of a straight punch | Jab, cross | `slip` |
| Duck / bob and weave | Drop the level under a punch, come up the other side | Hooks, overhand | `duck` |
| Step back | Short retreat out of range | Anything | `stepBack` |
| Parry | Lead hand slaps the incoming jab aside | Jab | (stretch) |
| Shoulder roll | Rolls a straight punch off the lead shoulder | Cross | (stretch) |
| Clinch | Tie up the opponent's arms to stop the exchange | Combos | (stretch) |

## 3. Footwork

Footwork runs in `web/src/three/footwork.ts`. The choreographer sends each fighter a movement intent; the locomotion layer steers with speed and acceleration limits, keeps the bodies apart, and keeps both inside the ropes.

| Intent | What it looks like |
| --- | --- |
| `hold` | Keep the preferred distance with a small in-and-out bounce |
| `press` | Walk the opponent down, mirroring their sideways drift |
| `cutOff` | Stand between the opponent and the open ring, herding them to the ropes |
| `retreat` | Back away; on the ropes, slide along them toward the open side |
| `circle` | Orbit the opponent (not the ring centre) |
| `pivot` | Swing about 80° round the opponent to get off the ropes or take an angle |
| `clinch` | Tie up chest to chest until the referee breaks it |
| `center`, `goto`, `locked` | Reset to the centre, walk to a corner or seat, stand still |

Range bands (centre-to-centre distance): clinch < 1.3, inside < 1.75, punching < 2.4, outside < 3.4, then far. `stepIn`, `stepBack`, `stagger`, `bodyFold` and `knockdown` carry root motion, so the fighter really travels instead of snapping back.

## 4. Reactions to taking a hit

Head and torso direction come from the spring layer (`web/src/three/physics.ts`), driven by the punch kind and hand: a lead hook turns the head to the defender's left, an uppercut snaps it up, a body shot folds them forward. The keyframed reactions only add the broken guard and the step back.

| Move | Trigger | Animation key |
| --- | --- | --- |
| Stagger | Clean head shot | `stagger` |
| Body fold | Clean body shot | `bodyFold` |
| Rocked | Stun from clean shots passes the fighter's chin | springs loosen, knees buckle, `wobble`, `coverUp` |
| Knee touch | A clean shot while rocked | `kneel` |
| Knockdown | A clean power shot while rocked, after the first 20% of the round, at most once | `knockdown` (falls, gets back up) |

## 5. Showboating

| Move | When | Animation key |
| --- | --- | --- |
| Taunt ("come on") | Finished the task first, or after a knockdown | `taunt` |
| Shadowboxing | Waiting for the bell | `jab` / `cross` thrown at air |
| Victory | Reveal, winner only | `victory` |

## 6. Mapping to the event protocol

The live protocol's `Move` type ([architecture.md §4](architecture.md#4-live-event-protocol)) is coarser than this catalog. The arena expands each protocol move into animations:

| Protocol `Move` | LLM signal that triggers it | Animations played |
| --- | --- | --- |
| `approach` | Fighter starts streaming | fight distance closes |
| `jab` | Token burst above the fighter's running average | `jab`, sometimes `feint` |
| `combo` | Sustained burst, or a structural milestone (new section, `PITCH:` started) | a combination: `jab` `cross` `hook`, or `jab` `body` `uppercut` |
| `dodge` | The opponent's burst while this fighter is idle | `slip`, `duck` or `block` |
| `circle` | Long gap with no tokens (thinking) | orbit, `stepBack` |
| `stagger` | Retry or error | `stagger` or `bodyFold` |
| `taunt` | Finished first, or finished while the other is still going | `taunt` |
| `knockdown` | Final reveal, on the loser | `knockdown` (stays down), winner plays `victory` |

The heaviest punches (`uppercut`, `overhand`) should be reserved for milestones, so the biggest moments on screen match the biggest moments in the model's output.

## 7. Authoring moves

Moves live in `web/src/three/moves.ts` as keyframes.

- Each key is `[u, partial pose, ease]`. The ease shapes the segment arriving at that key: `in` for strikes (accelerate into impact), `out` for recoveries, `snap` for defences, `anticipate` for a wind-up dip, `back` for an overshoot.
- `hit.at` must equal one key's `u`. Per-throw variation warps time on either side of it, so the hit key always lands exactly at the scheduled impact.
- Channels a key leaves out drift from the pose the fighter was in back to guard, so moves chain without snapping to guard.
- `vary` sets how much each throw differs (timing, reach, height, lean, power). `mirror` lets the move come off the other hand. `chain` makes the hips lead and the head trail.
- `tell` is when the defender can first read the move, `recover` when the fighter can act again, `root` how far the move carries the fighter.

## Sources

- Legends Boxing, [Boxer moves guide](https://www.legendsboxing.com/post/boxer-moves-ultimate-guide): the numbered punch system and core defense (slip, block, bob and weave).
- Peloton, [Boxing moves](https://onepeloton.com/blog/boxing-moves): ducking.
- Evolve MMA, [Beginner's guide to boxing defense](https://evolve-mma.com/blog/the-complete-beginners-guide-to-boxing-defense/): step-back defense.
- Boxing Insider, [Glossary](https://www.boxinginsider.com/almanac/boxing-glossary-insider-terms-and-phrases/): shoulder roll (Philly Shell), footwork terms.
