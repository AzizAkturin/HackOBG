import { leaderboard } from '../data/mock'
import { Panel } from './Panel'

export function TopFighters() {
  return (
    <Panel title="Top fighters" titleId="top-title" aside={<span className="label shrink-0 text-[11px] text-mute">ELO</span>}>
      <ol className="space-y-1">
        {leaderboard.map((f) => (
          <li key={f.name} className="flex items-center gap-3 text-lg">
            <span className={`w-5 font-display ${f.rank === 1 ? 'text-gold' : 'text-mute'}`}>{f.rank}</span>
            <span className="h-3 w-3 shrink-0" style={{ background: f.accent }} aria-hidden />
            <span className="min-w-0 flex-1 truncate">{f.name}</span>
            <span className="text-mute">{f.weightClass}</span>
            <span className="w-12 text-right tabular-nums text-mute">{f.record}</span>
            <span className="w-12 text-right tabular-nums">{f.elo}</span>
          </li>
        ))}
      </ol>
    </Panel>
  )
}
