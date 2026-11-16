import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { formatClock, mainEvent, otherFights, roundLabel } from '../data/mock'
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
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [])
  const status = matchStatus(match)
  const [red, blue] = mainEvent.fighters

  return (
    <Panel title="Fight card" titleId="card-title" aside={<span className="label shrink-0 text-[11px] text-mute">{otherFights.length + 1} matches</span>}>
      <ul className="divide-y divide-line">
        <li className="-mx-2 flex items-center gap-3 bg-well px-2 py-3">
          <span className="w-14 shrink-0 font-display text-xl tracking-widest text-ink">{roundLabel(mainEvent.roundId)}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg leading-tight">{mainEvent.task}</p>
            <p className="label truncate text-[10px] text-mute" style={{ letterSpacing: '0.15em' }}>
              <span className={status.tone}>{status.text}</span> · {red.name} {match.wins[0]}–{match.wins[1]} {blue.name}
            </p>
          </div>
          <Link to="/" className="label flex min-h-11 shrink-0 items-center text-[11px] text-blue hover:underline">
            {match.tradingOpen ? 'Trade' : 'Watch'} ▸
          </Link>
        </li>
        {otherFights.map((f) => {
          const clock = f.startsInSec === undefined ? undefined : f.startsInSec - elapsed
          const text = f.status === 'upcoming' ? `Starts ${formatClock(clock ?? 0)}` : f.status === 'voting' ? 'Voting' : 'Live'
          const tone = f.status === 'fighting' ? 'text-red' : f.status === 'voting' ? 'text-blue' : 'text-mute'
          return (
            <li key={f.roundId} className="flex items-center gap-3 py-3">
              <span className="w-14 shrink-0 font-display text-xl tracking-widest text-ink">{roundLabel(f.roundId)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg leading-tight">{f.task}</p>
                <p className="label truncate text-[10px] text-mute" style={{ letterSpacing: '0.15em' }}>
                  <span className={tone}>{text}</span> · {f.weightClass}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
