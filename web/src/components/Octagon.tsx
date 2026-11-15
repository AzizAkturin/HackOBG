import { useEffect, useRef, useState } from 'react'
import { formatClock, mainEvent } from '../data/mock'
import { drawFrame, H, renderBackLayer, renderFrontLayer, spriteBox, W } from '../game/octagonScene'
import type { Round } from '../game/useRound'

interface Props {
  round: Round
  selected: number | null
  onSelect: (i: number) => void
}

const FRAME_MS = 140
const SEGMENTS = 40

export function Octagon({ round, selected, onSelect }: Props) {
  const { locked, secondsLeft, total } = round
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  const stateRef = useRef({ locked, selected, hovered })
  useEffect(() => {
    stateRef.current = { locked, selected, hovered }
  }, [locked, selected, hovered])

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingEnabled = false
    const back = renderBackLayer()
    const front = renderFrontLayer()
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let tick = 0
    let last = 0
    let raf = 0
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop)
      if (t - last < FRAME_MS) return
      last = t
      if (!reduced) tick++
      drawFrame(ctx, back, front, { tick, ...stateRef.current, fighters: mainEvent.fighters })
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const hitTest = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * W
    const y = ((e.clientY - r.top) / r.height) * H
    const hit = mainEvent.fighters.findIndex((_, i) => {
      const b = spriteBox(i, locked)
      return x >= b.x - 2 && x <= b.x + b.w + 2 && y >= b.y - 3 && y <= b.y + b.h + 2
    })
    return hit === -1 ? null : hit
  }

  const filled = Math.ceil((Math.max(0, secondsLeft) / mainEvent.locksInSec) * SEGMENTS)
  const urgent = !locked && secondsLeft <= 15
  const [red, blue] = mainEvent.fighters

  return (
    <section aria-labelledby="octagon-title">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <p className="label flex flex-wrap items-center gap-x-3 text-[11px] text-mute" style={{ letterSpacing: '0.2em' }}>
            <span className="bg-red px-1.5 text-night">Main event</span>
            <span className="text-blue">{mainEvent.weightClass}</span>
            <span>R{String(mainEvent.roundId).padStart(3, '0')} · {mainEvent.arena}</span>
          </p>
          <h1 id="octagon-title" className="mt-2 text-2xl leading-none sm:text-3xl">
            <span style={{ color: red.accent }}>{red.name}</span>
            <span className="text-mute"> vs </span>
            <span style={{ color: blue.accent }}>{blue.name}</span>
            <span className="text-mute"> · </span>
            {mainEvent.task}
          </h1>
        </div>
        <dl className="flex shrink-0 gap-6 font-pixel">
          <div>
            <dt className="label text-[10px] text-mute">{locked ? 'Status' : 'Bell in'}</dt>
            <dd className={`text-2xl tabular-nums ${locked || urgent ? 'text-red' : 'text-ink'}`}>
              {locked ? 'LIVE' : formatClock(secondsLeft)}
            </dd>
          </div>
          <div>
            <dt className="label text-[10px] text-mute">Pool</dt>
            <dd className="text-2xl tabular-nums text-gold">{total.toFixed(2)}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-3 flex gap-[3px]" aria-hidden>
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span key={i} className={`h-1.5 flex-1 ${i < filled ? (urgent ? 'bg-red' : 'bg-gold') : 'bg-well'}`} />
        ))}
      </div>

      <div className="panel relative mx-auto mt-3 overflow-hidden p-0" style={{ width: 'min(100%, calc((100vh - 230px) * 2))' }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          role="img"
          aria-label={`The octagon: ${red.name} in the red corner, ${blue.name} in the blue corner`}
          onClick={(e) => {
            const i = hitTest(e)
            if (i !== null && !locked) onSelect(i)
          }}
          onMouseMove={(e) => setHovered(locked ? null : hitTest(e))}
          onMouseLeave={() => setHovered(null)}
          className={`pixelated block aspect-[2/1] w-full ${hovered !== null ? 'cursor-pointer' : ''}`}
        />
        {locked && (
          <p className="pop chroma pointer-events-none absolute left-1/2 top-[8%] font-pixel text-4xl font-bold uppercase text-ink sm:text-7xl">
            Fight!
          </p>
        )}
      </div>
    </section>
  )
}
