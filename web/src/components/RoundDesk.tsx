import { formatClock, mainEvent } from '../data/mock'
import { ROUNDS, submissions } from '../data/matchContent'
import { SEC, type Match } from '../game/useMatch'

const CORNER = ['var(--color-red)', 'var(--color-blue)'] as const
const letter = (label: number) => String.fromCharCode(65 + label)
const pct = (p: number) => `${Math.round(p * 100)}%`
const name = (i: number) => mainEvent.fighters[i]!.name
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

function Start({ match }: { match: Match }) {
  const [red, blue] = mainEvent.fighters
  return (
    <>
      <DeskHeader kicker="Stage 1 · Start" title="Trading is open" clockLabel="Bell in" seconds={match.secondsLeft} urgent={match.secondsLeft <= 10} />
      <p className="mt-2 text-lg text-ink">
        Opening odds come from their records: {red.name} {red.record[0]}–{red.record[1]} vs {blue.name} {blue.record[0]}–{blue.record[1]}, so{' '}
        <strong>{red.name} opens at {pct(match.openingPriceA)}</strong>. Back a robot in the market panel.
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
      <DeskHeader kicker={`Round ${match.roundIndex + 1} of 3 · Fighting`} title={r.name} clockLabel="Voting opens in" seconds={match.secondsLeft} />
      <p className="mt-2 text-lg text-ink">{r.brief}</p>
      <p className="mt-1 text-base text-mute">
        Both robots are writing now. Trading is closed until the vote is in.
        {match.holds ? ' You hold shares, so you get a vote.' : ' Only people holding shares can vote this round.'}
      </p>
    </>
  )
}

function Voting({ match }: { match: Match }) {
  const r = ROUNDS[match.roundIndex]!
  const { swapped, votes, myVote } = match.voting
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
        Robots are hidden until voting closes. {cast} {cast === 1 ? 'vote' : 'votes'} cast.
      </p>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {[0, 1].map((label) => {
          const mine = myVote === label
          const text = submissions[r.key][fighterOf(label, swapped)]
          return (
            <article key={label} aria-label={`Pitch ${letter(label)}`} className={`flex flex-col border-2 p-4 ${mine ? 'border-blue' : 'border-line'}`}>
              <h3 className="font-display text-xl font-bold uppercase">Pitch {letter(label)}</h3>
              <p className="mt-2 max-h-56 overflow-y-auto whitespace-pre-line pr-1 text-base leading-relaxed text-ink">{text}</p>
              <button
                type="button"
                onClick={() => match.vote(label)}
                disabled={myVote !== null || !match.holds}
                aria-pressed={mine}
                className="btn-pixel mt-auto min-h-12 w-full cursor-pointer bg-blue font-display text-lg font-bold uppercase tracking-wider text-white disabled:cursor-not-allowed"
                style={{ marginTop: '1rem' }}
              >
                {mine ? '✓ Your vote' : myVote !== null ? 'Vote cast' : `Vote ${letter(label)}`}
              </button>
            </article>
          )
        })}
      </div>
      {!match.holds && <p className="mt-2 text-base text-mute">Voting is for position holders. Buy any amount when trading reopens to vote next round.</p>}
    </>
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
        title={`${name(res.winner)} takes the ${r.name.toLowerCase()}`}
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
                    <strong style={{ color: CORNER[f] }}>{name(f)}</strong> <span className="text-mute">wrote Pitch {letter(label)}</span>
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
          <p className="label text-[10px] text-mute">{name(0)} price</p>
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
      <DeskHeader kicker="Stage 5 · Result" title={`${name(w)} wins ${match.wins[w]}–${match.wins[1 - w]}`} clockLabel="Next match in" seconds={match.secondsLeft} />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-2 p-4" style={{ borderColor: CORNER[w] }}>
        <p className="text-lg">
          {match.payout > 0
            ? `Your ${match.payout.toFixed(3)} shares of ${name(w)} pay 1 MON each.`
            : lost
              ? `Your shares were on ${name(1 - w)}. They expire worthless.`
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
