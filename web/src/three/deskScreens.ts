// Broadcast graphics drawn onto the ringside desk monitors.
import * as THREE from 'three'
import { brands } from '../data/brands'
import { mainEvent, RAKE } from '../data/mock'

export const SCREEN_W = 640
export const SCREEN_H = 384

export type ScreenKind = 'red' | 'blue' | 'pool' | 'task' | 'stream' | 'cam'

export const ANIMATED: ReadonlySet<ScreenKind> = new Set(['stream', 'cam'])

type Ctx = CanvasRenderingContext2D

const BG = '#060a10'
const DIM = '#6f7d8c'
const TEXT = '#e8edf2'
const CYAN = '#3fe0ff'
const DISPLAY = '700 {s}px "Barlow Condensed", sans-serif'
const MONO = '{s}px ui-monospace, Menlo, Consolas, monospace'
const font = (tpl: string, size: number) => tpl.replace('{s}', String(size))

function frame(c: Ctx, title: string, accent: string, t: number) {
  c.fillStyle = BG
  c.fillRect(0, 0, SCREEN_W, SCREEN_H)
  c.fillStyle = accent
  c.globalAlpha = 0.16
  c.fillRect(0, 0, SCREEN_W, 52)
  c.globalAlpha = 1
  c.fillStyle = accent
  c.fillRect(0, 50, SCREEN_W, 3)
  c.textBaseline = 'middle'
  c.textAlign = 'left'
  c.font = font(DISPLAY, 34)
  c.fillStyle = TEXT
  c.fillText(title, 22, 27)
  c.textAlign = 'right'
  c.font = font(DISPLAY, 26)
  c.fillStyle = DIM
  c.fillText(`R${mainEvent.roundId}  ·  ${mainEvent.weightClass.toUpperCase()}`, SCREEN_W - 56, 27)
  const live = Math.floor(t * 1.4) % 2 === 0
  c.fillStyle = live ? '#ff3b30' : '#5a1814'
  c.beginPath()
  c.arc(SCREEN_W - 28, 27, 8, 0, Math.PI * 2)
  c.fill()
}

function scanlines(c: Ctx) {
  c.fillStyle = 'rgb(0 0 0 / 0.28)'
  for (let y = 0; y < SCREEN_H; y += 4) c.fillRect(0, y, SCREEN_W, 1.5)
}

function wrap(c: Ctx, text: string, maxW: number) {
  const lines: string[] = []
  for (const para of text.split('\n')) {
    let line = ''
    for (const word of para.split(' ')) {
      const next = line ? `${line} ${word}` : word
      if (c.measureText(next).width > maxW && line) {
        lines.push(line)
        line = word
      } else line = next
    }
    lines.push(line)
  }
  return lines
}

function bar(c: Ctx, x: number, y: number, w: number, h: number, frac: number, color: string) {
  c.fillStyle = 'rgb(255 255 255 / 0.1)'
  c.fillRect(x, y, w, h)
  c.fillStyle = color
  c.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h)
}

function stat(c: Ctx, label: string, value: string, x: number, y: number, color = TEXT) {
  c.textAlign = 'left'
  c.font = font(DISPLAY, 22)
  c.fillStyle = DIM
  c.fillText(label, x, y)
  c.font = font(DISPLAY, 46)
  c.fillStyle = color
  c.fillText(value, x, y + 38)
}

function fighterCard(c: Ctx, index: 0 | 1, t: number) {
  const f = mainEvent.fighters[index]
  const b = brands[f.brand]
  frame(c, index === 0 ? 'RED CORNER' : 'BLUE CORNER', index === 0 ? '#ff3b30' : '#3b7bff', t)
  c.textAlign = 'left'
  c.textBaseline = 'middle'
  const name = f.name.toUpperCase()
  let size = 112
  c.font = font(DISPLAY, size)
  while (c.measureText(name).width > SCREEN_W - 44 && size > 40) c.font = font(DISPLAY, (size -= 4))
  c.fillStyle = b.ui
  c.fillText(name, 22, 124)
  c.font = font(DISPLAY, 28)
  c.fillStyle = DIM
  c.fillText(b.label.toUpperCase(), 24, 188)

  stat(c, 'RECORD', `${f.record[0]}-${f.record[1]}`, 24, 232)
  stat(c, 'ELO', String(f.elo), 190, 232)
  stat(c, f.streak > 0 ? 'WIN STREAK' : 'LOSS STREAK', String(Math.abs(f.streak)), 330, 232, f.streak > 0 ? '#5fd08a' : '#ff5a4a')
  stat(c, 'AVG FINISH', `${f.avgFinish}s`, 490, 232)

  c.textAlign = 'left'
  c.font = font(DISPLAY, 22)
  c.fillStyle = DIM
  c.fillText('CROWD VOTE SHARE', 24, 330)
  bar(c, 24, 346, 480, 14, f.voteShare, b.glow)
  c.textAlign = 'right'
  c.font = font(DISPLAY, 30)
  c.fillStyle = TEXT
  c.fillText(`${Math.round(f.voteShare * 100)}%`, SCREEN_W - 24, 350)
  scanlines(c)
}

function poolScreen(c: Ctx, t: number) {
  frame(c, 'BETTING POOL', '#ffc83d', t)
  const [a, b] = mainEvent.fighters
  const total = a.pool + b.pool
  c.textAlign = 'left'
  c.textBaseline = 'middle'
  c.font = font(DISPLAY, 24)
  c.fillStyle = DIM
  c.fillText('TOTAL POOL', 24, 92)
  c.font = font(DISPLAY, 120)
  c.fillStyle = '#ffc83d'
  c.fillText(total.toFixed(2), 20, 160)
  c.font = font(DISPLAY, 40)
  c.fillStyle = DIM
  c.fillText('MON', 20 + c.measureText(total.toFixed(2)).width + 16, 176)

  const split = a.pool / total
  c.fillStyle = '#ff3b30'
  c.fillRect(24, 232, (SCREEN_W - 48) * split, 18)
  c.fillStyle = '#3b7bff'
  c.fillRect(24 + (SCREEN_W - 48) * split, 232, (SCREEN_W - 48) * (1 - split), 18)

  ;[a, b].forEach((f, i) => {
    const x = i === 0 ? 24 : SCREEN_W - 24
    c.textAlign = i === 0 ? 'left' : 'right'
    c.font = font(DISPLAY, 40)
    c.fillStyle = brands[f.brand].ui
    c.fillText(f.name.toUpperCase(), x, 282)
    c.font = font(DISPLAY, 52)
    c.fillStyle = TEXT
    c.fillText(`${((total * (1 - RAKE)) / f.pool).toFixed(2)}x`, x, 334)
    c.font = font(DISPLAY, 22)
    c.fillStyle = DIM
    c.fillText(`${f.pool.toFixed(2)} MON  ·  ${f.backers} BACKERS`, x, 366)
  })
  scanlines(c)
}

function taskScreen(c: Ctx, t: number) {
  frame(c, 'THE TASK', CYAN, t)
  c.textAlign = 'left'
  c.textBaseline = 'top'
  c.font = font(DISPLAY, 58)
  c.fillStyle = TEXT
  wrap(c, mainEvent.task, SCREEN_W - 48).forEach((line, i) => c.fillText(line, 24, 78 + i * 62))
  c.textBaseline = 'middle'
  const rows: [string, string][] = [
    ['JUDGE', 'PENDING'],
    ['FORMAT', mainEvent.outputs[0].kind === 'image' ? 'IMAGE' : '~250 WORDS'],
    ['LOCKS IN', '90s'],
  ]
  rows.forEach(([k, v], i) => {
    const y = 296 + i * 28
    c.textAlign = 'left'
    c.font = font(DISPLAY, 22)
    c.fillStyle = DIM
    c.fillText(k, 24, y)
    c.textAlign = 'right'
    c.fillStyle = CYAN
    c.fillText(v, SCREEN_W - 24, y)
  })
  scanlines(c)
}

const STREAM_SCRIPT = [
  'planning approach',
  'drafting outline',
  'SpinCycle turns idle laundromats into neighborhood micro-fulfillment hubs.',
  'Most laundromats sit 70% empty outside weekend peaks. We install smart lockers so local shops can rent drop-off space by the hour.',
  'Revenue: locker rentals, a 15% cut of wash-and-fold, and a SaaS fee for owners.',
].join('\n')

function streamScreen(c: Ctx, t: number) {
  frame(c, 'AGENT STREAM', '#5fd08a', t)
  const cols = mainEvent.fighters.map((f) => ({ name: f.name, color: brands[f.brand].ui }))
  c.textBaseline = 'top'
  const colW = (SCREEN_W - 60) / 2
  cols.forEach((col, i) => {
    const x = 20 + i * (colW + 20)
    c.textAlign = 'left'
    c.font = font(DISPLAY, 28)
    c.fillStyle = col.color
    c.fillText(col.name.toUpperCase(), x, 68)
    c.fillStyle = 'rgb(255 255 255 / 0.18)'
    c.fillRect(x, 102, colW, 2)

    const speed = i === 0 ? 34 : 29
    const total = STREAM_SCRIPT.length
    const shown = Math.floor((t * speed) % (total + 60))
    c.font = font(MONO, 15)
    const lines = wrap(c, STREAM_SCRIPT.slice(0, Math.min(shown, total)), colW)
    const rows = 14
    lines.slice(-rows).forEach((line, r) => {
      c.fillStyle = r === Math.min(lines.length, rows) - 1 ? TEXT : '#aeb9c4'
      c.fillText(line, x, 114 + r * 18)
    })
    if (Math.floor(t * 2.5) % 2 === 0) {
      const last = lines[Math.min(lines.length, rows) - 1] ?? ''
      c.fillStyle = col.color
      c.fillRect(x + c.measureText(last).width + 2, 114 + (Math.min(lines.length, rows) - 1) * 18, 8, 15)
    }
    c.textAlign = 'left'
    c.font = font(DISPLAY, 22)
    c.fillStyle = DIM
    c.fillText(`${Math.min(shown, total) * 3} TOKENS`, x, 362)
  })
  scanlines(c)
}

function camScreen(c: Ctx, t: number) {
  frame(c, 'RING CAM 1', '#ff8a4c', t)
  const cx = SCREEN_W / 2
  const cy = 218
  const half = 130
  c.strokeStyle = 'rgb(255 255 255 / 0.55)'
  c.lineWidth = 3
  c.strokeRect(cx - half * 1.5, cy - half * 0.82, half * 3, half * 1.64)
  c.strokeStyle = 'rgb(255 255 255 / 0.18)'
  c.lineWidth = 1
  for (let k = 1; k < 4; k++) {
    c.beginPath()
    c.moveTo(cx - half * 1.5, cy - half * 0.82 + (half * 1.64 * k) / 4)
    c.lineTo(cx + half * 1.5, cy - half * 0.82 + (half * 1.64 * k) / 4)
    c.stroke()
  }
  c.beginPath()
  c.arc(cx, cy, 36, 0, Math.PI * 2)
  c.stroke()
  mainEvent.fighters.forEach((f, i) => {
    const side = i === 0 ? -1 : 1
    const x = cx + side * (48 + Math.sin(t * 1.3 + i * 2) * 14)
    const y = cy + Math.cos(t * 0.9 + i * 3) * 30
    c.fillStyle = brands[f.brand].ui
    c.shadowColor = brands[f.brand].glow
    c.shadowBlur = 18
    c.beginPath()
    c.arc(x, y, 14, 0, Math.PI * 2)
    c.fill()
    c.shadowBlur = 0
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.font = font(DISPLAY, 20)
    c.fillStyle = TEXT
    c.fillText(f.name.toUpperCase(), x, y - 28)
  })
  c.textAlign = 'left'
  c.font = font(MONO, 14)
  c.fillStyle = DIM
  c.fillText('CAM 1  ·  TOP  ·  25 FPS', 22, 362)
  c.textAlign = 'right'
  c.fillText('WAB LIVE', SCREEN_W - 22, 362)
  scanlines(c)
}

export function drawScreen(kind: ScreenKind, c: Ctx, t: number) {
  c.save()
  switch (kind) {
    case 'red':
      fighterCard(c, 0, t)
      break
    case 'blue':
      fighterCard(c, 1, t)
      break
    case 'pool':
      poolScreen(c, t)
      break
    case 'task':
      taskScreen(c, t)
      break
    case 'stream':
      streamScreen(c, t)
      break
    case 'cam':
      camScreen(c, t)
      break
  }
  c.restore()
}

export function createScreen() {
  const canvas = document.createElement('canvas')
  canvas.width = SCREEN_W
  canvas.height = SCREEN_H
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return { canvas, ctx: canvas.getContext('2d')!, texture }
}
