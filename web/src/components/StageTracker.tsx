import { mainEvent } from '../data/mock'
import { ROUNDS } from '../data/matchContent'
import type { Match } from '../game/useMatch'

const CORNER = ['var(--color-red)', 'var(--color-blue)'] as const

const phaseLabel = (m: Match) =>
  m.phase === 'fighting' ? 'Fighting' : m.phase === 'voting' ? 'Voting' : m.phase === 'final' ? 'Final' : 'Trading'

/** Five-stage progress: Start, three voted rounds, Result. Says what's happening now and who won what. */
export function StageTracker({ match }: { match: Match }) {
  const { stage, results, phase } = match
  const decidedEarly = phase === 'final' && results.length === 2
  const steps = [
    { n: 1, name: 'Start', short: 'Start' },
    ...ROUNDS.map((r, i) => ({ n: i + 2, name: r.name, short: r.short })),
    { n: 5, name: 'Result', short: 'Result' },
  ]

  return (
    <nav aria-label="Match progress" className="panel px-4 py-3">
      <div>
        <ol className="grid w-full min-w-0 grid-cols-5 gap-1">
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
