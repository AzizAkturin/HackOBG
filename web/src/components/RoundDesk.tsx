import { formatClock } from '../data/fighters'
import { ROUNDS } from '../data/matchContent'
import { SEC, type Match } from '../game/useMatch'

const CORNER = ['var(--color-red)', 'var(--color-blue)'] as const
const letter = (label: number) => String.fromCharCode(65 + label)
const pct = (p: number) => `${Math.round(p * 100)}%`
/** Fighter behind blind label: label 0 is fighter B when swapped. */
const fighterOf = (label: number, swapped: boolean) => (swapped ? 1 - label : label)

/**
 * The panel under the arena. Always in the same place; its content follows the match:
 * trading -> fighting -> voting (blind pitches, inline) -> round result -> final payout.
 */
export function RoundDesk({ match }: { match: Match }) {
  return (
    <section aria-labelledby="desk-title" className="panel p-5">
      {match.phase === 'voting' ? (
        <Voting match={match} />
      ) : match.phase === 'fighting' ? (
        <Fighting match={match} />
      ) : match.phase === 'final' ? (
        <Final match={match} />
      ) : match.results.length > 0 ? (
        <RoundResult match={match} />
      ) : (
        <Start match={match} />
      )}
    </section>
  )
}

function DeskHeader({ kicker, title, clockLabel, seconds, urgent }: { kicker: string; title: string; clockLabel?: string; seconds?: number; urgent?: boolean }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
      <div className="min-w-0">
        <p className="label text-[11px] text-mute">{kicker}</p>
        <h2 id="desk-title" aria-live="polite" className="font-display text-2xl font-bold uppercase leading-tight text-ink sm:text-3xl">
          {title}
        </h2>
      </div>
      {clockLabel && seconds !== undefined && (
        <p className="shrink-0 text-right font-display">
          <span className="label block text-[11px] text-mute">{clockLabel}</span>
          <span className={`text-3xl font-bold tabular-nums ${urgent ? 'text-red' : 'text-ink'}`}>{formatClock(seconds)}</span>
        </p>
      )}
    </header>
  )
}

const KO_TEXT: Record<string, string> = {
  timeout: 'ran out of time',
  budget_exhausted: 'ran out of tokens',
  http_error: 'the model errored',
  empty: 'gave no answer',
  aborted: 'was stopped',
}

/** Write the task and pick the two OpenRouter models. Any OpenRouter slug works, so paid models can use credit. */
function Setup({ match }: { match: Match }) {
  const locked = match.armed
  const ready = !!match.config && !!match.setup.task.trim() && match.setup.models.every(Boolean)
  const setModel = (i: 0 | 1, id: string) => {
    const next: [string, string] = [...match.setup.models]
    next[i] = id
    match.setSetup({ models: next })
  }
  return (
    <form
      className="mt-3 space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        match.start()
      }}
    >
      <label className="block">
        <span className="label text-[11px] text-mute">Prompt for both robots</span>
        <textarea
          value={match.setup.task}
          placeholder="e.g. Pitch a startup that makes laundromats profitable again."
          onChange={(e) => match.setSetup({ task: e.target.value })}
          disabled={locked}
          rows={3}
          maxLength={3000}
          className="mt-1 w-full resize-y border border-line bg-panel p-2 text-base text-ink disabled:opacity-60"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        {match.fighters.map((f, i) => (
          <label key={i} className="block">
            <span className="label text-[11px]" style={{ color: CORNER[i] }}>
              {f.name} · {f.label}
            </span>
            <input
              list="fight-models"
              value={match.setup.models[i]}
              onChange={(e) => setModel(i as 0 | 1, e.target.value.trim())}
              disabled={locked}
              spellCheck={false}
              placeholder="registry id or vendor/model"
              className="mt-1 w-full border border-line bg-panel p-2 font-mono text-sm text-ink disabled:opacity-60"
            />
          </label>
        ))}
        <datalist id="fight-models">
          {(match.config?.models ?? []).map((m) => (
            <option key={m.id} value={m.id}>
              {m.label} · {m.maker}
            </option>
          ))}
        </datalist>
      </div>
      {match.configError && <p className="text-sm text-red">Can't reach the fight server ({match.configError}).</p>}
      {!match.config && !match.configError && <p className="text-sm text-mute">Connecting to the fight server…</p>}
      <div className="flex flex-wrap items-center gap-2">
        {!locked && (
          <button type="submit" disabled={!ready} className="btn-pixel min-h-11 cursor-pointer bg-blue px-4 font-display font-bold uppercase tracking-wider text-white disabled:opacity-50">
            Start match
          </button>
        )}
        <button
          type="button"
          onClick={() => match.start(true)}
          disabled={!ready}
          className="btn-pixel min-h-11 cursor-pointer bg-red px-4 font-display font-bold uppercase tracking-wider text-white disabled:opacity-50"
        >
          Ring the bell now
        </button>
        <span className="text-sm text-mute">
          Each round is one live call per robot on OpenRouter (6 per match at most)
          {match.config && `, up to ${match.config.limits.maxTokens} tokens and ${match.config.limits.fightSeconds}s each`}.
        </span>
      </div>
    </form>
  )
}

function Start({ match }: { match: Match }) {
  return (
    <>
      {match.armed ? (
        <DeskHeader kicker="Stage 1 · Start" title="Trading is open" clockLabel="Bell in" seconds={match.secondsLeft} urgent={match.secondsLeft <= 10} />
      ) : (
        <DeskHeader kicker="Stage 1 · Start" title="Set up the fight" />
      )}
      <Setup match={match} />
      <p className="mt-3 text-lg text-ink">
        No fight history is on record yet, so <strong>both corners open at {pct(match.openingPriceA)}</strong>.
      </p>
      <ol className="mt-3 grid gap-2 sm:grid-cols-3">
        {ROUNDS.map((r, i) => (
          <li key={r.key} className="border border-line px-3 py-2">
            <p className="label text-[10px] text-mute">Round {i + 1}</p>
            <p className="font-display text-lg font-semibold leading-tight">{r.name}</p>
            <p className="text-sm text-mute">{r.brief}</p>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-sm text-mute">Best of 3, decided by the audience. Trading closes during each round and reopens after the vote, at the new price.</p>
    </>
  )
}

function Fighting({ match }: { match: Match }) {
  const r = ROUNDS[match.roundIndex]!
  return (
    <>
      <DeskHeader
        kicker={`Round ${match.roundIndex + 1} of 3 · Live`}
        title={r.name}
        clockLabel="Voting opens in"
        seconds={match.secondsLeft}
      />
      <p className="mt-1 text-base text-mute">
        {r.brief} Pitches are shuffled into A and B, so you judge the work, not the robot.
      </p>
      <PitchCards match={match} />
    </>
  )
}

function Voting({ match }: { match: Match }) {
  const r = ROUNDS[match.roundIndex]!
  const { votes } = match.voting
  const cast = votes[0] + votes[1]
  return (
    <>
      <DeskHeader
        kicker={`Round ${match.roundIndex + 1} of 3 · Vote`}
        title={`${r.name}: which pitch is better?`}
        clockLabel="Voting ends"
        seconds={match.secondsLeft}
        urgent={match.secondsLeft <= 8}
      />
      <div className="mt-2 h-1 bg-well" aria-hidden>
        <div className="h-full bg-blue transition-[width] duration-300 ease-linear" style={{ width: `${(match.secondsLeft / SEC.vote) * 100}%` }} />
      </div>
      <p className="mt-2 text-base text-mute">
        Robots stay hidden until voting closes · {cast} {cast === 1 ? 'vote' : 'votes'} cast
        {!match.holds && ' · only position holders can vote'}
      </p>
      <PitchCards match={match} voting />
    </>
  )
}

/**
 * The two blind pitches. While robots fight they type out live (both at the same pace, so timing can't
 * reveal who is who); when voting opens the same cards get vote buttons.
 */
function PitchCards({ match, voting = false }: { match: Match; voting?: boolean }) {
  const { swapped, myVote } = match.voting
  const fight = match.fight
  return (
    <div className="mt-3 grid gap-3 md:grid-cols-2">
      {[0, 1].map((label) => {
        const f = fighterOf(label, swapped)
        const outcome = fight?.outcomes?.find((o) => o.idx === f)
        const writing = !voting && !!fight && !fight.done
        const streamed = fight?.texts[f] ?? ''
        const ko = outcome?.status === 'ko' ? `Knocked out: ${KO_TEXT[outcome.reason ?? ''] ?? outcome.reason}.` : null
        const shown = [streamed.trim() || (writing ? '' : ko ? '' : fight?.error ? `No answer: ${fight.error}` : ''), ko].filter(Boolean).join('\n\n')
        const words = shown.trim() ? shown.trim().split(/\s+/).length : 0
        const mine = myVote === label
        return (
          <article key={label} aria-label={`Pitch ${letter(label)}`} className={`flex flex-col border-2 p-4 ${mine ? 'border-blue' : 'border-line'}`}>
            <header className="flex items-baseline justify-between gap-2">
              <h3 className="font-display text-xl font-bold uppercase">Pitch {letter(label)}</h3>
              <span className="text-sm tabular-nums text-mute">
                {writing ? (
                  <>
                    <span className="blink mr-1.5 inline-block h-2 w-2 rounded-full bg-red align-middle" aria-hidden />
                    writing · {words} words
                  </>
                ) : (
                  `${words} words`
                )}
              </span>
            </header>
            <p
              className="mt-2 h-48 overflow-y-auto whitespace-pre-line pr-1 text-base leading-relaxed text-ink"
              aria-busy={writing}
            >
              {shown || (writing && <span className="text-mute">Thinking…</span>)}
              {writing && <span className="blink ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[3px] bg-ink" aria-hidden />}
            </p>
            {voting && (
              <button
                type="button"
                onClick={() => match.vote(label)}
                disabled={myVote !== null || !match.holds}
                aria-pressed={mine}
                className="btn-pixel mt-4 min-h-12 w-full cursor-pointer bg-blue font-display text-lg font-bold uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mine ? '✓ Your vote' : myVote !== null ? 'Vote cast' : !match.holds ? 'Hold shares to vote' : `Vote ${letter(label)}`}
              </button>
            )}
          </article>
        )
      })}
    </div>
  )
}

function RoundResult({ match }: { match: Match }) {
  const res = match.results[match.results.length - 1]!
  const r = ROUNDS[res.index]!
  const total = res.votes[0] + res.votes[1]
  const nextRound = ROUNDS[match.results.length]
  const moved = res.priceAfter - res.priceBefore
  return (
    <>
      <DeskHeader
        kicker={`Round ${res.index + 1} result · trading reopened`}
        title={`${match.fighters[res.winner].name} takes the ${r.name.toLowerCase()}`}
        clockLabel={nextRound ? `${nextRound.short} bell in` : undefined}
        seconds={match.secondsLeft}
      />
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
        <div>
          {[0, 1].map((f) => {
            const share = total ? res.votes[f] / total : 0.5
            const label = res.swapped ? 1 - f : f
            return (
              <div key={f} className="mb-2">
                <p className="flex items-baseline justify-between text-base">
                  <span>
                    <strong style={{ color: CORNER[f] }}>{match.fighters[f]!.name}</strong> <span className="text-mute">wrote Pitch {letter(label)}</span>
                    {res.winner === f && ' ★'}
                  </span>
                  <span className="font-display text-lg tabular-nums">
                    {res.votes[f]} · {pct(share)}
                  </span>
                </p>
                <div className="h-2 bg-well" aria-hidden>
                  <div className="h-full" style={{ width: `${share * 100}%`, background: CORNER[f] }} />
                </div>
              </div>
            )
          })}
        </div>
        <div className="border-l-0 border-line sm:border-l sm:pl-4">
          <p className="label text-[10px] text-mute">{match.fighters[0].name} price</p>
          <p className="font-display text-2xl font-bold tabular-nums">
            {pct(res.priceBefore)} → {pct(res.priceAfter)}
          </p>
          <p className={`text-base font-semibold ${moved >= 0 ? 'text-green' : 'text-red'}`}>
            {moved >= 0 ? '▲' : '▼'} {Math.abs(Math.round(moved * 100))} pts
          </p>
        </div>
      </div>
      <p className="mt-1 text-base text-mute">Score {match.wins[0]}–{match.wins[1]}. Buy or cash out now; trading closes when the next round starts.</p>
    </>
  )
}

function Final({ match }: { match: Match }) {
  const w = match.winner!
  const lost = match.shares[1 - w]! > 0 && match.shares[w]! === 0
  return (
    <>
      <DeskHeader kicker="Stage 5 · Result" title={`${match.fighters[w].name} wins ${match.wins[w]}–${match.wins[1 - w]}`} clockLabel="Setup reopens in" seconds={match.secondsLeft} />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-2 p-4" style={{ borderColor: CORNER[w] }}>
        <p className="text-lg">
          {match.payout > 0
            ? `Your ${match.payout.toFixed(3)} shares of ${match.fighters[w].name} pay 1 MON each.`
            : lost
              ? `Your shares were on ${match.fighters[1 - w].name}. They expire worthless.`
              : 'You had no position this match.'}
        </p>
        {match.payout > 0 && (
          <button
            type="button"
            onClick={match.claim}
            disabled={match.claimed}
            className="btn-pixel min-h-12 cursor-pointer bg-green px-5 font-display text-lg font-bold uppercase tracking-wider text-white disabled:cursor-default"
          >
            {match.claimed ? `✓ Collected ${match.payout.toFixed(3)} MON` : `Collect ${match.payout.toFixed(3)} MON`}
          </button>
        )}
      </div>
    </>
  )
}
