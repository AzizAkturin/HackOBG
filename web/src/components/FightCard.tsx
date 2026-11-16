import { Link } from 'react-router'
import { formatClock, matchLabel } from '../data/fighters'
import { ROUNDS } from '../data/matchContent'
import type { Match } from '../game/useMatch'
import { Panel } from './Panel'

/** Status of the live main event in plain words, e.g. "Round 2 · Aspects · voting". */
export function matchStatus(m: Match): { text: string; tone: string } {
  const r = ROUNDS[m.roundIndex]!
  if (m.phase === 'final') return { text: 'Final', tone: 'text-ink' }
  if (m.phase === 'fighting') return { text: `Round ${m.roundIndex + 1} · ${r.short} · live`, tone: 'text-red' }
  if (m.phase === 'voting') return { text: `Round ${m.roundIndex + 1} · ${r.short} · voting`, tone: 'text-blue' }
  return { text: `Trading open · ${formatClock(m.secondsLeft)}`, tone: 'text-ink' }
}

export function FightCard({ match }: { match: Match }) {
  const status = matchStatus(match)
  const [red, blue] = match.fighters

  return (
    <Panel title="Now fighting" titleId="card-title">
      <ul className="divide-y divide-line">
        <li className="-mx-2 flex items-center gap-3 bg-well px-2 py-3">
          <span className="w-14 shrink-0 font-display text-xl tracking-widest text-ink">{matchLabel(match.matchNo)}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg leading-tight">{match.setup.task || 'Waiting for a prompt'}</p>
            <p className="label truncate text-[10px] text-mute" style={{ letterSpacing: '0.15em' }}>
              <span className={status.tone}>{status.text}</span> · {red.name} {match.wins[0]}–{match.wins[1]} {blue.name}
            </p>
          </div>
          <Link to="/" className="label flex min-h-11 shrink-0 items-center text-[11px] text-blue hover:underline">
            {match.tradingOpen ? 'Trade' : 'Watch'} ▸
          </Link>
        </li>
      </ul>
    </Panel>
  )
}
