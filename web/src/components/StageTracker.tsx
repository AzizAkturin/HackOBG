import { formatClock, mainEvent } from '../data/mock'
import { ROUNDS } from '../data/matchContent'
import type { Match } from '../game/useMatch'

const CORNER = ['var(--color-red)', 'var(--color-blue)'] as const

const phaseLabel = (m: Match) =>
  m.phase === 'fighting' ? 'Fighting' : m.phase === 'voting' ? 'Voting' : m.phase === 'final' ? 'Final' : 'Trading'

/** Five-stage progress: Start, three voted rounds, Result. Says what's happening now and who won what. */
export function StageTracker({ match }: { match: Match }) {
  const { stage, results, wins, phase, secondsLeft } = match
  const decidedEarly = phase === 'final' && results.length === 2
  const steps = [
    { n: 1, name: 'Start', short: 'Start' },
    ...ROUNDS.map((r, i) => ({ n: i + 2, name: r.name, short: r.short })),
    { n: 5, name: 'Result', short: 'Result' },
  ]

  return (
    <nav aria-label="Match progress" className="panel px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {/* scoreline */}
        <p className="flex shrink-0 items-center gap-3 font-display text-2xl font-bold tabular-nums" aria-label={`Score: ${mainEvent.fighters[0].name} ${wins[0]}, ${mainEvent.fighters[1].name} ${wins[1]}`}>
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ background: CORNER[0] }} aria-hidden />
            <span className="uppercase">{mainEvent.fighters[0].name}</span>
          </span>
          <span className="bg-ink px-2 text-white">
            {wins[0]}–{wins[1]}
          </span>
          <span className="flex items-center gap-2">
            <span className="uppercase">{mainEvent.fighters[1].name}</span>
            <span className="h-3 w-3 rounded-full" style={{ background: CORNER[1] }} aria-hidden />
          </span>
        </p>

        <ol className="grid w-full min-w-0 grid-cols-5 gap-1 sm:w-auto sm:flex-1">
          {steps.map((s) => {
            const result = s.n >= 2 && s.n <= 4 ? results[s.n - 2] : undefined
            const skipped = decidedEarly && s.n === 4
            const current = s.n === stage
            const done = s.n < stage || (s.n === 5 && phase === 'final')
            const winner = result ? mainEvent.fighters[result.winner] : null
            return (
              <li
                key={s.n}
                aria-current={current ? 'step' : undefined}
                className={`relative border-t-4 pt-1.5 ${current ? 'border-ink' : done ? 'border-mute' : 'border-line'}`}
                style={result ? { borderTopColor: CORNER[result.winner] } : undefined}
              >
                <p className={`label truncate text-[10px] ${current ? 'text-ink' : 'text-mute'}`}>
                  <span className="hidden sm:inline">{s.n}. {s.name}</span>
                  <span className="sm:hidden">{s.short}</span>
                </p>
                <p className="truncate text-xs leading-tight sm:text-sm">
                  {skipped ? (
                    <span className="text-mute">Not needed</span>
                  ) : winner ? (
                    <span className="font-semibold" style={{ color: CORNER[result!.winner] }}>
                      {winner.name} ✓
                    </span>
                  ) : s.n === 1 && done ? (
                    <span className="text-mute">Opened {mainEvent.fighters[0].name} {Math.round(match.openingPriceA * 100)}%</span>
                  ) : current ? (
                    <span className="font-semibold text-ink">
                      {phaseLabel(match)}
                      {phase !== 'final' && <span className="tabular-nums text-mute"> · {formatClock(secondsLeft)}</span>}
                    </span>
                  ) : (
                    <span className="text-mute">{s.n === 5 ? 'First to 2' : 'Upcoming'}</span>
                  )}
                </p>
              </li>
            )
          })}
        </ol>
      </div>
    </nav>
  )
}
