// Broadcast graphics drawn onto the ringside desk monitors.
import * as THREE from 'three'
import { brands } from '../data/brands'
import { coefficient } from '@wab/shared'
import type { Broadcast } from './broadcast'

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

function frame(c: Ctx, title: string, accent: string, t: number, b: Broadcast) {
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
  c.fillText(`${b.matchLabel}  ·  ${b.weightClass.toUpperCase()}`, SCREEN_W - 56, 27)
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

function fighterCard(c: Ctx, index: 0 | 1, t: number, bc: Broadcast) {
  const f = bc.fighters[index]!
  const b = brands[f.brand]
  frame(c, index === 0 ? 'RED CORNER' : 'BLUE CORNER', index === 0 ? '#ff3b30' : '#3b7bff', t, bc)
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
  c.fillText(f.label.toUpperCase(), 24, 188)

  stat(c, 'ROUNDS WON', String(bc.wins[index]), 24, 232)
  stat(c, 'CLASS', f.weightClass.toUpperCase(), 220, 232)
  stat(c, 'TOKENS', String(bc.tokens[index]), 470, 232)

  c.textAlign = 'left'
  c.font = font(DISPLAY, 22)
  c.fillStyle = DIM
  c.fillText(bc.finished[index] ? 'FINISHED' : 'TOKEN BUDGET', 24, 330)
  const frac = bc.budget ? bc.tokens[index] / bc.budget : 0
  bar(c, 24, 346, 480, 14, bc.finished[index] ? 1 : frac, b.glow)
  c.textAlign = 'right'
  c.font = font(DISPLAY, 30)
  c.fillStyle = TEXT
  c.fillText(`${Math.round(Math.min(1, frac) * 100)}%`, SCREEN_W - 24, 350)
  scanlines(c)
}

function marketScreen(c: Ctx, t: number, bc: Broadcast) {
  frame(c, 'MARKET', '#ffc83d', t, bc)
  const prices = [bc.priceA, 1 - bc.priceA]
  c.textBaseline = 'middle'
  c.fillStyle = '#ff3b30'
  c.fillRect(24, 200, (SCREEN_W - 48) * bc.priceA, 18)
  c.fillStyle = '#3b7bff'
  c.fillRect(24 + (SCREEN_W - 48) * bc.priceA, 200, (SCREEN_W - 48) * (1 - bc.priceA), 18)
  bc.fighters.forEach((f, i) => {
    const x = i === 0 ? 24 : SCREEN_W - 24
    c.textAlign = i === 0 ? 'left' : 'right'
    c.font = font(DISPLAY, 36)
    c.fillStyle = brands[f.brand].ui
    c.fillText(f.name.toUpperCase(), x, 96)
    c.font = font(DISPLAY, 72)
    c.fillStyle = TEXT
    c.fillText(`${Math.round(prices[i]! * 100)}%`, x, 150)
    c.font = font(DISPLAY, 44)
    c.fillStyle = '#ffc83d'
    const k = coefficient(prices[i]!)
    c.fillText(k >= 100 ? '99x+' : `${k.toFixed(2)}x`, x, 270)
  })
  c.textAlign = 'left'
  c.font = font(DISPLAY, 22)
  c.fillStyle = DIM
  c.fillText('CHANCE TO WIN  ·  PAYOUT PER MON', 24, 340)
  scanlines(c)
}

function taskScreen(c: Ctx, t: number, bc: Broadcast) {
  frame(c, 'THE TASK', CYAN, t, bc)
  c.textAlign = 'left'
  c.textBaseline = 'top'
  let size = 58
  c.font = font(DISPLAY, size)
  let lines = wrap(c, bc.task || 'Waiting for a prompt', SCREEN_W - 48)
  while (lines.length * size * 1.07 > 200 && size > 26) {
    c.font = font(DISPLAY, (size -= 4))
    lines = wrap(c, bc.task || 'Waiting for a prompt', SCREEN_W - 48)
  }
  c.fillStyle = TEXT
  lines.slice(0, Math.floor(200 / (size * 1.07))).forEach((line, i) => c.fillText(line, 24, 74 + i * size * 1.07))
  c.textBaseline = 'middle'
  const rows: [string, string][] = [
    ['ROUND', bc.round.toUpperCase()],
    ['TOKEN CAP', bc.budget ? String(bc.budget) : '—'],
    ['TIME LIMIT', bc.fightSeconds ? `${bc.fightSeconds}s` : '—'],
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

function streamScreen(c: Ctx, t: number, bc: Broadcast) {
  frame(c, 'AGENT STREAM', '#5fd08a', t, bc)
  c.textBaseline = 'top'
  const colW = (SCREEN_W - 60) / 2
  bc.fighters.forEach((f, i) => {
    const color = brands[f.brand].ui
    const x = 20 + i * (colW + 20)
    c.textAlign = 'left'
    c.font = font(DISPLAY, 28)
    c.fillStyle = color
    c.fillText(f.name.toUpperCase(), x, 68)
    c.fillStyle = 'rgb(255 255 255 / 0.18)'
    c.fillRect(x, 102, colW, 2)

    c.font = font(MONO, 15)
    const text = bc.texts[i as 0 | 1]
    const lines = text ? wrap(c, text.slice(-1200), colW) : ['waiting for the bell']
    const rows = 14
    const shown = lines.slice(-rows)
    shown.forEach((line, r) => {
      c.fillStyle = !text ? DIM : r === shown.length - 1 ? TEXT : '#aeb9c4'
      c.fillText(line, x, 114 + r * 18)
    })
    if (text && !bc.finished[i as 0 | 1] && Math.floor(t * 2.5) % 2 === 0) {
      const last = shown[shown.length - 1] ?? ''
      c.fillStyle = color
      c.fillRect(x + c.measureText(last).width + 2, 114 + (shown.length - 1) * 18, 8, 15)
    }
    c.textAlign = 'left'
    c.font = font(DISPLAY, 22)
    c.fillStyle = DIM
    c.fillText(`${bc.tokens[i as 0 | 1]} TOKENS`, x, 362)
  })
  scanlines(c)
}

function camScreen(c: Ctx, t: number, bc: Broadcast) {
  frame(c, 'RING CAM 1', '#ff8a4c', t, bc)
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
  bc.fighters.forEach((f, i) => {
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

export function drawScreen(kind: ScreenKind, c: Ctx, t: number, b: Broadcast) {
  c.save()
  switch (kind) {
    case 'red':
      fighterCard(c, 0, t, b)
      break
    case 'blue':
      fighterCard(c, 1, t, b)
      break
    case 'pool':
      marketScreen(c, t, b)
      break
    case 'task':
      taskScreen(c, t, b)
      break
    case 'stream':
      streamScreen(c, t, b)
      break
    case 'cam':
      camScreen(c, t, b)
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
