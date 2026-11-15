# Fighter moves

The robots fight in a boxing style. Every move is cosmetic: the winner is decided by the crowd vote ([ADR-0007](adr/0007-winner-by-blind-onchain-vote.md)). The moves exist so the arena shows real LLM progress as a fight ([architecture.md §4](architecture.md#4-live-event-protocol)).

This catalog lists what a fighter can do, what animation plays, and which LLM signal should trigger it once the live event stream exists. Until then, `web/src/three/director.ts` picks moves at random.

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

| Move | What it looks like | Animation key |
| --- | --- | --- |
| Approach | Close the distance to punching range | director (fight distance) |
| Step in | Quick lunge to start an attack | `stepIn` |
| Circle | Both fighters orbit around the centre of the cage | director (orbit) |
| Pivot | Turn on the lead foot to change angle | director (orbit) |

## 4. Reactions to taking a hit

| Move | Trigger | Animation key |
| --- | --- | --- |
| Head snap / stagger | Clean head shot | `stagger` |
| Body fold | Clean body shot | `bodyFold` |
| Knockdown | Rare: a heavy punch (uppercut, overhand, hook) lands clean | `knockdown` (falls, gets back up) |

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

## Sources

- Legends Boxing, [Boxer moves guide](https://www.legendsboxing.com/post/boxer-moves-ultimate-guide): the numbered punch system and core defense (slip, block, bob and weave).
- Peloton, [Boxing moves](https://onepeloton.com/blog/boxing-moves): ducking.
- Evolve MMA, [Beginner's guide to boxing defense](https://evolve-mma.com/blog/the-complete-beginners-guide-to-boxing-defense/): step-back defense.
- Boxing Insider, [Glossary](https://www.boxinginsider.com/almanac/boxing-glossary-insider-terms-and-phrases/): shoulder roll (Philly Shell), footwork terms.
