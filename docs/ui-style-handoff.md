# UI style handoff

What a new agent or teammate needs to style WAB screens consistently. It records every styling decision made while building sign-in/sign-up, the profile page, the market chart, the live fight page (stage tracker, round desk, inline voting, trade ticket) and the top-bar merge. **Follow these rules for new UI; when you change one, update this file.**

Stack: Vite + React 19 + Tailwind CSS v4. Tokens live in `web/src/index.css` under `@theme` and become Tailwind utilities (`text-ink`, `bg-well`, `border-line`, …).

---

## 1. Theme and tokens

**The site is light-theme only** (`color-scheme: light`). There is no dark mode for the page. The only dark surface is the 3D arena, which uses `.theme-dark` to locally redefine the tokens to dark values. Don't add page-level dark mode without designing and validating it separately (see §5).

| Token | Value | Use for |
|---|---|---|
| `night` | `#ebebeb` | Page background |
| `panel` | `#ffffff` | Card/panel surfaces, tooltip background, chart surface |
| `well` | `#f2f2f2` | Recessed fills: progress tracks, avatar wells, **"trading closed" bands in the chart** |
| `line` | `#d4d4d4` | Borders, dividers, chart gridlines |
| `ink` | `#121212` | Primary text, current-step marker, crosshair |
| `mute` | `#6c6c6c` | Secondary text, kickers, axis text, "upcoming" states |
| `red` | `#d00000` | **Red corner / fighter A**, errors, negative change (▼), urgent timers, sign-out, "live" dots (broadcast convention) |
| `blue` | `#1a5fd0` | **Blue corner / fighter B**, voting actions, **text links**, global focus ring, weight-class kicker |
| `green` | `#1a8a4a` | Gains (▲), "pays if wins" amounts, Collect button, "name is free" |
| `gold` | `#b86e00` | **Only the ◆ MON currency glyph.** Removed from buttons, links, selection states and focus rings; don't reintroduce it |

Rules:
- **Primary button = `bg-ink text-white`.** (Gold with light text failed contrast at about 3.4:1 and was replaced everywhere.) Fighter-specific actions use the fighter's corner colour; voting uses `bg-blue`; Collect uses `bg-green`.
- **Text links = `text-blue hover:underline`** (e.g. "◂ Back to the ring", "MonadVision ↗", "Trade ▸").
- **Selected state = `border-ink`** (+ `bg-well` for tiles), never gold.
- **Use tokens, never hex values**, in components. In SVG, use `var(--color-…)` (e.g. `stroke="var(--color-red)"`) so `.theme-dark` and future theme changes apply.
- The top bar and scoreboard strip are your teammate's design and use literal hex (`#d00`, `#121212`, `#f2f2f2`). Leave them, but don't copy literal hex into new components.

## 2. Typography

| Role | Classes | Example |
|---|---|---|
| Kicker / eyebrow | `.label text-[11px] text-mute` (`.label` = display font, 600, uppercase, 0.18em tracking) | "ROUND 2 OF 3 · VOTE" |
| Section/panel title | `font-display text-xl–3xl font-bold uppercase text-ink` | "MARKET", "OBSIDIAN WINS 2–1" |
| Page title (task) | `text-xl sm:text-2xl leading-tight` (body font) | "Pitch a startup that…" |
| Big brand display | `.steel` (Steel font) for profile names and "Your profile"-style dialog titles; `.headline` for the arena HUD and fighter names | |
| Body | Barlow, `text-base`/`text-lg`, `text-ink` or `text-mute` | |
| Numbers | **always `tabular-nums`**; big figures `font-display text-2xl–3xl font-bold` | prices, clocks, MON |

- Minimum readable size is `text-sm` (14px) for anything a user must read. `text-[10px]`/`[11px]` is only for uppercase `.label` kickers.
- Capitalization: kickers and buttons are uppercase (via `.label` / `uppercase`). Sentences in body copy are sentence case.

## 3. Layout

**Fight page** (`web/src/pages/FightPage.tsx`), top to bottom:
1. Header: kicker row (weight class in `text-blue`, round id, "Best of 3") and the task as `h1`.
2. **Stage tracker, sticky**: `sticky top-0 z-30 -mx-4 px-4 py-2 bg-night/90 backdrop-blur`. The current round must always be visible while scrolling to vote or trade.
3. Two-column grid: `lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]`, `items-start`, `gap-5`.
   - **Left:** the arena, then the **round desk directly under it** (`space-y-4`). Voting, round results and payouts always render in this one spot, next to the fight. **Never route voting to a separate screen.**
   - **Right:** the market panel in compact mode, with the trade ticket inside it (`lg:sticky`).
4. Fighter cards: `md:grid-cols-2`.

Below `lg` everything stacks in that order; the market lands right under the arena.

**One shared match.** `useMatch()` runs once in `App.tsx` and is passed to the fight page, the Rankings page and the top-bar scoreboard, so every page shows the same stage, score, prices and trades. Never call `useMatch()` inside a page.

**Phone-width rule (verified at 390px):** every CSS grid needs an explicit `grid-cols-1` before its breakpoint columns, and grid/flex children that hold truncated text need `min-w-0` (`Panel` has it built in). Without this the implicit grid column grows to the longest text and the page scrolls sideways; this happened on Rankings (601px) and the fight page (415px). The only intentionally horizontal-scrolling element is the scoreboard strip in the top bar.

Other rules:
- Page container: `mx-auto max-w-[1400px] px-4`. Profile page: `max-w-[1000px]`.
- Panels: `.panel` class (white, hairline border, soft shadow) with `p-4` (compact) or `p-5`. Profile hero additionally uses `.edge-light`.
- Arena: 2:1 aspect, width `min(100%, calc((100vh - 300px) * 2))`, so the arena plus tracker fit one screen.

## 4. Fighter identity colours

- **Fighter A is always the red corner (`--color-red`), fighter B the blue corner (`--color-blue`).** This holds everywhere: chart lines, legend keys, side picker, buy button, card border, round-winner marks, vote bars, tracker step borders.
- **Colour follows the fighter, never the rank or the leader.** If the order of fighters ever changes in a view, keep each fighter's colour.
- Robot **brand colours** (`web/src/data/brands.ts`: `ui`, `glow`, `primary`) are for the robot itself: 3D paint, arena HUD names and round pips, robot badges, the nickname line on cards. **Don't use brand colours for market or data UI.** They change every matchup and aren't validated as a pair.
- Coloured text: fighter **names** may take their corner colour as an identity mark (tracker winners, round results, holdings, the "Red corner" kicker). Numbers and sentences stay in `ink`/`mute`; the colour goes on a small mark beside the value, not the value itself.

## 5. Charts (`web/src/components/MarketChart.tsx`)

Built to the dataviz method (form → colour → validate → marks → hover → accessibility → look at it):
- **Palette validated:** `#d00000` / `#1a5fd0` on the light surface pass every check (CVD ΔE 29 protan, normal-vision ΔE 37, ≥ 3:1 contrast). Light mode only. Re-run the validator if either corner colour changes or a dark theme is added.
- **One axis.** Prices as % on a right-side axis (0/25/50/75/100%). Never add a second y-axis (e.g. MON on the same chart). Position value lives in the tooltip and the "Your bet" readout instead.
- **Step lines**, 2px, round caps and joins: a price holds until the next trade or round result, like Polymarket.
- **Trading-closed periods** are `well`-filled bands with a two-line label: round short name (uppercase, mute), then the winner ("Kiln won", ink). Labels near the right edge are right-aligned so they stay inside.
- **Gridlines:** 1px solid `line`, never dashed.
- **End dots:** r=4 in the series colour with a 2px `panel` ring. **Direct end labels** "Name NN%": the higher line labels above, the lower below, flipped when that would leave the plot.
- **"You bought" marker:** an open circle (panel fill, series stroke) with the label below.
- **Hover:** a 1px `ink` crosshair that snaps to price changes. The tooltip shows the value first (bold %), then the multiplier, then the name, each with a short line-key in the series colour; it adds "Your bet ≈ X MON" after your entry. Arrow keys step through points when the chart has focus.
- **Accessibility:** `role="img"` with a full aria-label, plus a collapsible **price history table** (`<details>`).
- **Legend tiles** above the chart: line key, name, big %, multiplier. Compact mode hides the "Red/Blue corner" captions.
- Simulated data must carry the **"Sample data"** badge.
- Compact mode (in the side column): `p-4`, chart height `220px`, legend `gap-1.5`, "Your bet" as a 2×2 grid.

## 6. Match state UI

**Stage tracker** (`StageTracker.tsx`):
- The scoreline comes first: corner dot, NAME, a score badge (`bg-ink text-white` "1–1"), NAME, corner dot.
- Five equal columns (`grid-cols-5`). Each step has a 4px top border:
  - current → `ink`;
  - done → `mute`;
  - upcoming → `line`;
  - **a round that was won → the winner's corner colour**.
- The step line underneath:
  - finished round → "Name ✓" in the corner colour;
  - current step → "Fighting/Voting/Trading open · m:ss" (clock in mute);
  - finished Start → "Opened Kiln 28%";
  - MVP skipped by a 2–0 → "Not needed";
  - Result before the end → "First to 2".
- Below `sm` the step names shorten (Pitch / Aspects / MVP).

**Round desk** (`RoundDesk.tsx`): one panel, same position, content per phase.
- Every state uses the `DeskHeader` pattern: kicker ("Round 2 of 3 · Vote"), uppercase title, and a right-aligned clock (label, then a `text-3xl` tabular clock that turns `red` when urgent, ≤ 8–10 s).
- Voting: a 4px-tall progress track (`bg-well`) with a `bg-blue` fill for the time left. Two pitch cards side by side (`md:grid-cols-2`), `border-2`, the chosen one `border-blue`, with blue vote buttons.
- Blind labels are "Pitch A / Pitch B". **Never show robot names, colours or avatars on a pitch before voting closes.**
- Round result: per-fighter vote bars (2px track in the corner colour), "Name wrote Pitch X ★", and a price-move block "28% → 62%" plus ▲/▼ points in green/red.
- Final: a box bordered in the winner's corner colour, holding the payout text and a green **Collect** button.

**Live writing** (`RoundDesk.tsx` → `PitchCards`):
- While robots fight, the two pitches **type out live under the blind labels "Pitch A / Pitch B"**, never under robot names or colours. The A/B shuffle is fixed when the fight starts, so the cards you watch are the cards you vote on.
- **Both cards reveal at the same pace** (the share of round time elapsed), so finishing speed can't reveal which robot is which. Each shows a blinking caret, a "writing · N words" status, and a fixed-height scrolling body (`h-48`).
- When voting opens, the same component adds the vote buttons. Don't build a separate voting view.

**Live trades** (`LiveTrades.tsx`):
- A compact table: Trader (short address, mono, or bold "You"), Trade ("bought"/"cashed out" + corner dot + name), MON, price after the trade, age.
- Columns have a small uppercase header row and fixed widths (`w-10`, `w-9`, `w-8`) so numbers align. Your rows get a `bg-well` highlight; new rows use `.feed-in`.
- `plain` mode drops its own heading for use inside a titled `Panel` (Rankings: "Live trades · R042").

**Arena overlays** (`Octagon.tsx`):
- **Broadcast banner** for the first ~4 s of each phase ("Round 3 · MVP", "Vote now · Pick the better pitch below ↓", "Kiln takes it"). It uses `.pop`.
- **`.pop` bakes in `translateX(-50%)`**, so anything using it must be positioned `absolute left-1/2` (with `w-max max-w-[90%]` for text). Using `inset-x-0` pushes it half off-screen.
- A persistent status tag sits at the bottom centre (`bg-black/60`, white `.label`): "Round 2 · Aspects · live", "Between rounds · trading open", …
- HUD under each name: 2 skewed round-win pips (lit = brand glow), plus a progress bar while fighting.
- Arena choreography: trading → `betting` (sparring), fighting → `fighting`, **voting → `rest` (robots sit in their corners)**, final → `reveal`.

**Trade ticket** (`TradeTicket.tsx`):
- Side picker: a 2-button `radiogroup`. The selected side is filled with its corner colour and white text; the other is outlined.
- Amount input plus chips (0.05 / 0.1 / 0.2 / 0.3).
- Preview row: Shares · Pays if wins (green) · Coefficient. The buy button is filled with the side's corner colour: "Buy Kiln · 0.1 MON".
- The fee goes in a `text-xs` note under the button.
- Holdings rows have outlined **Cash out X.XXX** buttons (ink border, inverts on hover). They're hidden after the final.
- **When trading is closed, replace the controls with a dashed-border note that says why and when it reopens** ("Closed during the vote · reopens in 0:13"). Don't show disabled inputs with no explanation.

**Fighter cards** (`FighterCard.tsx`):
- Corner kicker in the corner colour, big % plus multiplier top-right, badge, name (`.headline`), stats list (Record, ELO, Model, Rounds won).
- "You hold X shares · pays X MON" when you have a position.
- The button is outlined in the corner colour and fills when selected; it reads "Trading closed" when disabled.

## 7. Numbers and copy

| Thing | Format |
|---|---|
| Price / chance | Whole percent: `30%` |
| Coefficient | `1 / price`, `2.18x` (2 decimals; 1 decimal ≥ 10x; `99x+` cap) |
| MON amounts | 3 decimals under 1 MON (`0.094 MON`), else 2 |
| Shares | 3 decimals |
| Changes | `▲ +32%` green / `▼ -6%` red; price moves in "pts" |
| Clocks | `m:ss` via `formatClock` |
| Wallet | `0x1234…abcd` short form; full address in `font-mono text-sm` where it can be copied |

Voice:
- Plain words: "shares", "pays 1 MON each", "Cash out", "Collect", "Pitch A". Never show "LMSR" or "re-anchor" in the UI.
- **Always explain a blocked action** (why, and when it changes), e.g. "Only people holding shares can vote this round."
- Play-money reminders stay ("Testnet play money. No real value.").

## 8. Controls and forms

- Buttons: `.btn-pixel` plus `font-display font-bold uppercase tracking-wider`, `min-h-12` for primary actions and **≥ `min-h-11` (44px) for anything tappable**.
- The exception is the slim black nav bar (34px tall): `AccountButton` uses `h-[26px] text-[13px]` (Sign in on red `#d00` with white text, signed-in as a white name with a 24px avatar).
- Disabled: `disabled:cursor-not-allowed disabled:opacity-50`. Toggles use `aria-pressed`; radio-like pickers use `role="radiogroup"` / `role="radio"` + `aria-checked`.
- Inputs: `border-2 border-line bg-panel`, `focus:border-ink`, `aria-invalid:border-red`. Helper text sits underneath and becomes `role="alert"` in red on error.
- Live validation messages (username): mute while idle or checking, green "Name is free.", red with the reason.
- **Dialogs: use native `<dialog>` + `showModal()`** with classes `panel m-auto w-[min(100%-2rem,32rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto p-6`, `backdrop:bg-night/80–85`. Escape must cancel. The sign-up dialog treats Escape and Cancel as "abandon sign-up".
- Avatar picker: a 4×2 grid of radio tiles, selected tile `border-gold bg-well`. Avatars render with `RobotBadge`; user avatars have no `chassis` and fall back to the helmet head, which keeps fans visually distinct from AI fighters.
- Menus: a `panel` dropdown, items `min-h-11`, closing on outside click and Escape.
- Toasts: App-level toast via the `onPlaced` / `onDone(msg)` callbacks, short past-tense text ("Bought 0.368 Kiln shares").

## 9. Accessibility checklist (applied; keep it)

- Global `:focus-visible` outline: don't remove outlines.
- **Live regions must not wrap ticking clocks.** Only the round desk title is `aria-live="polite"`; the whole desk re-announced every second before this was fixed.
- `aria-current="step"` on the current tracker step; the scoreline has a spoken `aria-label`.
- The arena and chart are `role="img"` with descriptive labels; the chart is keyboard-steppable and has a table view.
- Respect `prefers-reduced-motion`: `.pop`/`.blink`/`.feed-in` are disabled in CSS, and smooth scrolling checks the media query.
- Identity is never colour-only: names, "Red/Blue corner" text, ★ / ✓ marks and the legend accompany colour.

## 10. Known inconsistencies (fix when you touch them)

Resolved in the audit: the Rankings page now uses the shared match; the old `useRound`, `BetSlip`, `VotingBooth` and `Ringside` were deleted (the arena's choreography type moved to `game/arenaPhase.ts`); gold removed from interactive states; round IDs are neutral `ink` (no weight-class red/blue); the nav and page title both say "Rankings"; phone overflow fixed.

Still open:
- **Garage page** (`/garage`, not in the nav) colours its weight-class buttons green/blue/red. Fine for a dev showcase; restyle before linking it.
- Other matches on the fight card and scoreboard are static mock rows with no page. They show status only, no action links; don't add dead links.
- The Profile page and dialogs were checked on desktop only; the fight and Rankings pages were checked at 390px.
- All match data is simulated (`web/src/game/useMatch.ts`, `web/src/data/matchContent.ts`) and labelled "Sample data". When wiring real chain data, keep the `Match` interface so these components don't change.
