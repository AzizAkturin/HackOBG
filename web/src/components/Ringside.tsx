import { firstName, mainEvent } from '../data/mock'
import type { FeedItem } from '../game/useRound'
import { Panel } from './Panel'

export function Ringside({ feed }: { feed: FeedItem[] }) {
  return (
    <Panel
      title="Ringside"
      titleId="ringside-title"
      aside={
        <span className="label flex shrink-0 items-center gap-2 text-[11px] text-red">
          <span className="blink h-2 w-2 bg-red" aria-hidden /> Live bets
        </span>
      }
    >
      {feed.length === 0 ? (
        <p className="text-lg text-mute">Waiting for the crowd…</p>
      ) : (
        <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {feed.slice(0, 6).map((item) => {
            const f = mainEvent.fighters[item.fighter]
            return (
              <li key={item.key} className="feed-in flex justify-between gap-2 text-lg">
                <span className="min-w-0 truncate">
                  <span className={item.mine ? 'text-gold' : 'text-mute'}>{item.who}</span>
                  <span className="text-mute"> → </span>
                  <span style={{ color: f.accent }}>{firstName(f.name)}</span>
                </span>
                <span className="shrink-0 tabular-nums">{item.amount.toFixed(2)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
