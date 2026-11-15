import { NavLink } from 'react-router'
import { mainEvent } from '../data/mock'

const links = [
  { to: '/', label: 'Fight' },
  { to: '/stats', label: 'Stats' },
]

export function TopBar({ balance }: { balance: number }) {
  return (
    <header className="relative z-40 mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-3 px-4">
      <div className="flex items-center gap-6">
        <NavLink to="/" className="chroma font-pixel text-lg font-bold uppercase tracking-wider" aria-label="Fight Club home">
          Fight Club
        </NavLink>
        <nav aria-label="Main" className="flex gap-4">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end
              className={({ isActive }) =>
                `label flex min-h-11 items-center text-[11px] ${isActive ? 'text-gold underline underline-offset-8' : 'text-mute hover:text-ink'}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <span className="hidden items-center gap-2 text-lg text-mute md:flex">
          <span className="blink h-2 w-2 bg-red" aria-hidden />
          {mainEvent.watching.toLocaleString()} ringside
        </span>
        <span className="hidden border-2 border-line px-3 py-1 font-pixel tabular-nums sm:inline">
          <span className="text-gold">◆</span> {balance.toFixed(2)} <span className="text-mute">MON</span>
        </span>
        <button
          type="button"
          className="btn-pixel min-h-11 cursor-pointer bg-ink px-4 font-pixel font-bold uppercase tracking-widest text-night hover:bg-gold"
        >
          Sign in
        </button>
      </div>
    </header>
  )
}
