import { STATUS_TTL_SEC, type FighterLive } from '../game/fightStream'

interface Props {
  name: string
  nameColor: string
  glow: string
  right: boolean
  live: FighterLive | null
  wins: number
}

export function FighterHud({ name, nameColor, glow, right, live, wins }: Props) {
  const side = right ? 'ml-auto text-right' : ''
  const pct = live ? (live.finished ? 1 : Math.min(1, live.tokens / live.budget)) * 100 : 0
  return (
    <div className={`w-[42%] max-w-sm ${right ? 'text-right' : ''}`}>
      <p className="headline text-xl uppercase leading-none sm:text-3xl" style={{ color: nameColor }}>
        {name}
      </p>
      <p className={`mt-1.5 flex gap-1 ${right ? 'justify-end' : ''}`} aria-label={`${wins} rounds won`}>
        {[0, 1].map((k) => (
          <span key={k} className="h-2 w-5 skew-x-[-20deg]" style={{ background: k < wins ? glow : 'rgb(255 255 255 / 0.15)' }} />
        ))}
      </p>
      {live && (
        <>
          <div
            className={`mt-2 h-1.5 skew-x-[-20deg] bg-white/10 ${right ? 'ml-auto' : ''}`}
            role="progressbar"
            aria-label={`${name} task progress`}
            aria-valuenow={Math.round(pct)}
          >
            <div
              className={`h-full transition-[width] duration-500 ${right ? 'ml-auto' : ''}`}
              style={{ width: `${pct}%`, background: glow, boxShadow: `0 0 ${live.finished ? 16 : 10}px ${glow}` }}
            />
          </div>
          <ul aria-live="polite" className={`mt-1.5 flex flex-col gap-0.5 ${side}`}>
            {live.feed.map((item) => (
              <li
                key={item.key}
                className="status-life label flex items-center gap-1.5 text-[10px] text-ink sm:text-[11px]"
                style={{ animationDuration: `${STATUS_TTL_SEC}s`, justifyContent: right ? 'flex-end' : undefined }}
              >
                <span aria-hidden style={{ color: glow }}>◆</span>
                {item.text}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
