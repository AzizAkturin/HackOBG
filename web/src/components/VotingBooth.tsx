import { brands } from '../data/brands'
import { firstName, formatClock, mainEvent, roundLabel, type Output } from '../data/mock'
import { VOTE_SEC, type Round } from '../game/useRound'

const letter = (label: number) => String.fromCharCode(65 + label)

const FADE_STOPS = [140, 52, 30, 2]

function timerColor(elapsed: number) {
  const t = Math.min(1, Math.max(0, (elapsed - 0.6) / 0.4))
  const pos = t * (FADE_STOPS.length - 1)
  const i = Math.min(FADE_STOPS.length - 2, Math.floor(pos))
  const hue = FADE_STOPS[i] + (FADE_STOPS[i + 1] - FADE_STOPS[i]) * (pos - i)
  return `hsl(${hue} 80% 45%)`
}

function OutputBody({ output }: { output: Output }) {
  if (output.kind === 'image') {
    return <img src={output.src} alt={output.alt} className="aspect-square w-full border border-line bg-well object-contain" />
  }
  return (
    <div className="max-h-[52vh] overflow-y-auto whitespace-pre-wrap pr-2 text-lg leading-relaxed text-ink">{output.text}</div>
  )
}

export function VotingBooth({ round }: { round: Round }) {
  const { phase, labelToFighter, labelVotes, myVote, voteSecondsLeft, castVote, result } = round
  const revealed = phase === 'reveal' && result !== null
  const cast = labelVotes.reduce((a, b) => a + b, 0)
  const isImage = mainEvent.outputs[0]?.kind === 'image'

  return (
    <section aria-labelledby="vote-title">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <p className="label flex flex-wrap items-center gap-x-3 text-mute">
            <span className="text-blue">{mainEvent.weightClass}</span>
            <span>{roundLabel(mainEvent.roundId)}</span>
            <span>{revealed ? 'The decision' : 'Investor rating'}</span>
          </p>
          <h1 id="vote-title" className="mt-1.5 text-xl leading-tight sm:text-2xl">
            {revealed ? 'The votes are in' : `Which ${isImage ? 'image' : 'answer'} is better?`}
          </h1>
        </div>
        <dl className="flex shrink-0 gap-6 font-display">
          <div>
            <dt className="label text-mute">{revealed ? 'Status' : 'Voting ends'}</dt>
            <dd className={`text-3xl font-bold tabular-nums ${!revealed && voteSecondsLeft <= 10 ? 'text-red' : 'text-ink'}`}>
              {revealed ? 'FINAL' : formatClock(voteSecondsLeft)}
            </dd>
          </div>
          <div>
            <dt className="label text-mute">Votes</dt>
            <dd className="text-3xl font-bold tabular-nums text-gold">{cast}</dd>
          </div>
        </dl>
      </div>

      {!revealed && (
        <div className="mt-3 h-1 bg-well" aria-hidden>
          <div
            className="h-full transition-[width,background-color] duration-1000 ease-linear"
            style={{
              width: `${(Math.max(0, voteSecondsLeft) / VOTE_SEC) * 100}%`,
              backgroundColor: timerColor(1 - Math.max(0, voteSecondsLeft) / VOTE_SEC),
            }}
          />
        </div>
      )}

      <div className="panel mt-4 p-5">
        <p className="label text-[11px] text-mute">The prompt</p>
        <p className="mt-1 text-xl leading-snug">{mainEvent.task}</p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {labelToFighter.map((fighter, label) => {
          const f = mainEvent.fighters[fighter]
          const output = mainEvent.outputs[fighter]
          const mine = myVote === label
          const won = revealed && result.winner === fighter
          const share = revealed && cast > 0 ? result.votes[fighter] / cast : 0
          return (
            <article
              key={label}
              aria-label={revealed ? `Response ${letter(label)}, by ${f.name}` : `Response ${letter(label)}`}
              className="panel flex flex-col p-5"
              style={won ? { borderColor: f.accent, boxShadow: `0 0 0 2px ${f.accent}` } : mine ? { borderColor: 'var(--color-blue)' } : undefined}
            >
              <header className="mb-3 flex items-center justify-between gap-3 border-b border-line pb-3">
                <h2 className="headline text-2xl uppercase">Response {letter(label)}</h2>
                {revealed ? (
                  <span className="label text-[11px]" style={{ color: brands[f.brand].ink }}>
                    {won && '★ Winner · '}
                    {f.name}
                  </span>
                ) : (
                  <span className="label text-[11px] text-mute">Anonymous</span>
                )}
              </header>

              {output ? <OutputBody output={output} /> : <p className="text-lg text-mute">Knocked out. No response.</p>}

              <div className="mt-auto pt-5">
                {revealed ? (
                  <>
                    <div className="flex items-baseline justify-between text-lg">
                      <span className="text-mute">{result.votes[fighter]} votes</span>
                      <span className="font-display text-2xl tabular-nums">{Math.round(share * 100)}%</span>
                    </div>
                    <div className="mt-1 h-2 bg-well" aria-hidden>
                      <div className="h-full" style={{ width: `${share * 100}%`, background: f.accent }} />
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => castVote(label)}
                    disabled={myVote !== null}
                    aria-pressed={mine}
                    className="btn-pixel min-h-12 w-full cursor-pointer bg-blue font-display text-lg font-bold uppercase tracking-wider text-white"
                  >
                    {mine ? '✓ Your vote' : myVote !== null ? 'Vote cast' : `Vote ${letter(label)}`}
                  </button>
                )}
              </div>
            </article>
          )
        })}
      </div>

      {revealed ? (
        <Settlement round={round} />
      ) : (
        <p className="mt-4 text-center text-lg text-mute">
          {myVote === null
            ? 'Robots stay hidden until voting closes. The most votes wins the pool.'
            : 'Vote locked in. Robots are revealed when voting closes.'}
        </p>
      )}
    </section>
  )
}

function Settlement({ round }: { round: Round }) {
  const { result, myBets } = round
  if (!result) return null
  const winner = mainEvent.fighters[result.winner]
  const staked = myBets.reduce((a, b) => a + b.amount, 0)
  const message =
    result.payout > 0
      ? `You backed ${firstName(winner.name)}. +${result.payout.toFixed(3)} MON`
      : staked > 0
        ? `Your ${staked.toFixed(2)} MON was on the other robot.`
        : 'You had no bet this round.'
  return (
    <div className="panel mt-4 flex flex-wrap items-center justify-between gap-3 p-5">
      <p className="headline text-3xl uppercase" style={{ color: winner.accent }}>
        {winner.name} takes the round
      </p>
      <p className={`font-display text-2xl ${result.payout > 0 ? 'text-green' : 'text-mute'}`}>{message}</p>
    </div>
  )
}
