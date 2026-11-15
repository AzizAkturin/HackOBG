import { useEffect, useState } from 'react'
import { classColor, formatClock, mainEvent, otherFights, type FightStatus, type WeightClass } from '../data/mock'
import { Panel } from './Panel'

interface Row {
  roundId: number
  weightClass: WeightClass
  task: string
  fighters: number
  status: FightStatus | 'betting'
  clock?: number
  current?: boolean
}

const statusText: Record<Row['status'], { label: string; color: string; action: string }> = {
  betting: { label: 'Betting', color: 'text-gold', action: 'Bet' },
  fighting: { label: 'Fighting', color: 'text-red', action: 'Watch' },
  voting: { label: 'Voting', color: 'text-blue', action: 'Watch' },
  upcoming: { label: 'Starts', color: 'text-mute', action: 'Bet' },
}

export function FightCard({ secondsLeft, locked }: { secondsLeft: number; locked: boolean }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const rows: Row[] = [
    {
      roundId: mainEvent.roundId,
      weightClass: mainEvent.weightClass,
      task: mainEvent.task,
      fighters: mainEvent.fighters.length,
      status: locked ? 'fighting' : 'betting',
      clock: locked ? undefined : secondsLeft,
      current: true,
    },
    ...otherFights.map((f) => ({ ...f, clock: f.startsInSec === undefined ? undefined : f.startsInSec - elapsed })),
  ]

  return (
    <Panel title="Fight card" titleId="card-title" aside={<span className="label shrink-0 text-[11px] text-mute">{rows.length} live</span>}>
      <ul className="divide-y-2 divide-dashed divide-line">
        {rows.map((r) => {
          const st = statusText[r.status]
          return (
            <li key={r.roundId} className={`flex items-center gap-3 py-3 ${r.current ? '-mx-2 bg-well px-2' : ''}`}>
              <span className="w-14 shrink-0 font-pixel text-xl tracking-widest" style={{ color: classColor[r.weightClass] }}>
                R{String(r.roundId).padStart(3, '0')}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg leading-tight">{r.task}</p>
                <p className="label truncate text-[10px] text-mute" style={{ letterSpacing: '0.15em' }}>
                  <span className={st.color}>
                    {st.label}
                    {r.clock !== undefined && ` ${formatClock(r.clock)}`}
                  </span>{' '}
                  · {r.fighters} fighters
                </p>
              </div>
              <a
                href={r.current ? '/' : `#round-${r.roundId}`}
                className={`label flex min-h-11 shrink-0 items-center text-[11px] hover:underline ${r.status === 'fighting' ? 'text-red' : 'text-gold'}`}
                aria-label={`${st.action} round ${r.roundId}`}
              >
                {st.action} ▸
              </a>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
