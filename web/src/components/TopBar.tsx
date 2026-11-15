import { NavLink } from 'react-router'
import { formatClock, mainEvent, otherFights, roundLabel, type FightStatus } from '../data/mock'

const links = [
  { to: '/', label: 'Fightcenter' },
  { to: '/stats', label: 'Rankings' },
]

const statusLabel: Record<FightStatus, string> = {
  fighting: 'Live',
  voting: 'Voting',
  upcoming: 'Upcoming',
}

const scores = [
  {
    roundId: mainEvent.roundId,
    meta: mainEvent.weightClass,
    status: 'Live',
    live: true,
    rows: mainEvent.fighters.map((f) => ({ name: f.name, record: `${f.record[0]}-${f.record[1]}` })),
  },
  ...otherFights.map((f) => ({
    roundId: f.roundId,
    meta: f.weightClass,
    status: f.status === 'upcoming' && f.startsInSec ? `In ${formatClock(f.startsInSec)}` : statusLabel[f.status],
    live: f.status === 'fighting',
    rows: [{ name: f.task, record: '' }],
  })),
]

export function TopBar({ balance }: { balance: number }) {
  return (
    <header className="relative z-40">
      <div className="flex h-[56px] border-b border-[#d4d4d4] bg-[#f2f2f2] text-[#121212]">
        <div className="flex min-w-0 flex-1 overflow-x-auto" tabIndex={0} aria-label="Scoreboard">
          {scores.map((s) => (
            <div
              key={s.roundId}
              className="flex w-[160px] shrink-0 flex-col justify-center border-r border-[#d4d4d4] px-3 text-[11px] leading-[14px]"
            >
              <span className="flex justify-between text-[#6c6c6c]">
                <span>{roundLabel(s.roundId)} · {s.meta}</span>
                <span className={s.live ? 'font-bold text-[#d00]' : ''}>{s.status}</span>
              </span>
              {s.rows.map((r) => (
                <span key={r.name} className="flex justify-between gap-2 font-semibold">
                  <span className="truncate">{r.name}</span>
                  <span className="font-normal text-[#6c6c6c]">{r.record}</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex h-[34px] items-center bg-[#121212] px-4">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between">
          <div className="flex items-center gap-6">
            <NavLink
              to="/"
              aria-label="WAB, World Agent Boxing, home"
              className="-ml-4 flex h-[34px] w-[88px] items-center justify-center bg-[#d00] font-display text-[26px] font-extrabold italic tracking-tight text-white"
            >
              WAB
            </NavLink>
            <nav aria-label="Main" className="flex gap-5 font-display text-[15px] font-semibold text-white">
              {links.map((l) => (
                <NavLink key={l.to} to={l.to} end className={({ isActive }) => (isActive ? 'text-white' : 'text-[#ccc] hover:text-white')}>
                  {l.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-5 font-display text-[15px] font-semibold text-white">
            <span className="hidden items-center gap-2 md:flex">
              <span className="blink h-2 w-2 rounded-full bg-[#d00]" aria-hidden />
              {mainEvent.watching.toLocaleString()} watching
            </span>
            <span className="hidden tabular-nums sm:inline">
              <span className="text-[#ffc94a]">◆</span> {balance.toFixed(2)} MON
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
