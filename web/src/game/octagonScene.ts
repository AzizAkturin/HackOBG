// Pixel-art underground octagon, drawn at a tiny native resolution and scaled
// up with `image-rendering: pixelated`. Static layers are pre-rendered once;
// fighters, dust, flashes and the light flicker are drawn per frame.

import { drawSprite, SPRITE_H, SPRITE_W, type SpriteColors } from './sprites'

export const W = 160
export const H = 80

const CX = 80
const CY = 60
const RX = 70
const RY = 15
const FENCE_H = 22
/** Front walls are cut away so the fighters stay visible, like a game camera. */
const FRONT_FENCE_H = 6

const OUTLINE = '#070605'
const MAT = '#b7ae9f'
const MAT_SHADE = '#a1978a'
const APRON = '#1a1512'

/** Idle: squared up at their corners. Fight: in range, trading. */
export const IDLE_SPOTS: [number, number][] = [
  [56, 66],
  [104, 66],
]
export const FIGHT_SPOTS: [number, number][] = [
  [73, 66],
  [87, 66],
]

type Pt = [number, number]

function octagon(scale: number, cx = CX, cy = CY): Pt[] {
  return Array.from({ length: 8 }, (_, k) => {
    const a = Math.PI / 8 + (k * Math.PI) / 4
    return [cx + RX * scale * Math.cos(a), cy + RY * scale * Math.sin(a)]
  })
}

function fillPoly(ctx: CanvasRenderingContext2D, pts: Pt[], fill: string) {
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
}

/** Tiny deterministic PRNG so the scene looks the same every render. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

function canvas() {
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  return c
}

const VERTS = octagon(1)
// Edge k joins vertex k and k+1. Edges 0..2 face the viewer.
const isFrontEdge = (k: number) => k <= 2

function drawFence(ctx: CanvasRenderingContext2D, k: number, front: boolean) {
  const fh = front ? FRONT_FENCE_H : FENCE_H
  const [x1, y1] = VERTS[k]
  const [x2, y2] = VERTS[(k + 1) % 8]
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.lineTo(x2, y2 - fh)
  ctx.lineTo(x1, y1 - fh)
  ctx.closePath()
  ctx.fillStyle = front ? 'rgb(8 6 5 / 0.25)' : 'rgb(8 6 5 / 0.55)'
  ctx.fill()
  ctx.clip()

  // chain-link: diamond lattice of single pixels
  ctx.fillStyle = front ? 'rgb(200 190 170 / 0.25)' : 'rgb(170 160 140 / 0.35)'
  const minX = Math.floor(Math.min(x1, x2))
  const maxX = Math.ceil(Math.max(x1, x2))
  const minY = Math.floor(Math.min(y1, y2) - fh)
  const maxY = Math.ceil(Math.max(y1, y2))
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if ((x + y) % 3 === 0 || (x - y + 999) % 3 === 0) ctx.fillRect(x, y, 1, 1)
    }
  }
  ctx.restore()

  // padded top rail
  ctx.strokeStyle = OUTLINE
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x1, y1 - fh)
  ctx.lineTo(x2, y2 - fh)
  ctx.stroke()
}

function drawPost(ctx: CanvasRenderingContext2D, k: number, fh = FENCE_H) {
  const [x, y] = VERTS[k].map(Math.round) as Pt
  ctx.fillStyle = OUTLINE
  ctx.fillRect(x - 1, y - fh - 2, 3, fh + 2)
  // red and blue corners, the rest bare
  ctx.fillStyle = k === 3 ? '#ff4d4d' : k === 0 ? '#4da3ff' : '#2a241f'
  ctx.fillRect(x - 1, y - fh - 3, 3, 3)
}

function drawWall(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#211b16'
  ctx.fillRect(0, 0, W, H)
  // brick courses
  ctx.fillStyle = '#2a221c'
  for (let y = 0; y < 34; y += 4) {
    const offset = (y / 4) % 2 ? 4 : 0
    for (let x = -offset; x < W; x += 8) ctx.fillRect(x + 1, y + 1, 7, 3)
  }
  // pipes
  ctx.fillStyle = '#2b2520'
  ctx.fillRect(0, 9, W, 2)
  ctx.fillRect(24, 0, 2, 11)
  ctx.fillRect(134, 0, 2, 11)
  ctx.fillStyle = '#3a322b'
  ctx.fillRect(0, 9, W, 1)
  // faded spray tag
  ctx.fillStyle = 'rgb(200 50 50 / 0.35)'
  for (const [x, y] of [[140, 15], [141, 14], [142, 15], [143, 16], [144, 15], [145, 14], [146, 15], [142, 17], [144, 17]]) {
    ctx.fillRect(x, y, 1, 1)
  }
}

function drawCrowd(ctx: CanvasRenderingContext2D, top: number, rows: number, tones: string[], seed: number) {
  const rand = rng(seed)
  for (let row = 0; row < rows; row++) {
    const y = top + row * 5
    for (let x = -3; x < W; x += 3 + Math.floor(rand() * 3)) {
      ctx.fillStyle = tones[Math.floor(rand() * tones.length)]
      ctx.fillRect(x + 1, y, 2, 2) // head
      ctx.fillRect(x, y + 2, 4, 4) // shoulders
      if (rand() < 0.08) ctx.fillRect(x + (rand() < 0.5 ? -1 : 4), y - 3, 1, 4) // fist up
    }
  }
}

function drawLightRig(ctx: CanvasRenderingContext2D) {
  // chains
  ctx.fillStyle = '#2b2520'
  ctx.fillRect(52, 0, 1, 5)
  ctx.fillRect(107, 0, 1, 5)
  // truss
  ctx.fillStyle = OUTLINE
  ctx.fillRect(46, 5, 68, 3)
  ctx.fillStyle = '#2b2520'
  for (let x = 47; x < 113; x += 3) ctx.fillRect(x, 6, 1, 1)
  // lamps
  for (const lx of [54, 70, 89, 105]) {
    ctx.fillStyle = '#ffe2a8'
    ctx.fillRect(lx, 8, 2, 1)
  }
}

export function renderBackLayer() {
  const c = canvas()
  const ctx = c.getContext('2d')!

  drawWall(ctx)
  drawCrowd(ctx, 14, 6, ['#0a0807', '#0d0b09', '#110e0b', '#070605'], 7)

  // a soft beam from each lamp on the rig
  for (const lx of [55, 71, 90, 106]) {
    const beam = ctx.createLinearGradient(0, 8, 0, CY + RY)
    beam.addColorStop(0, 'rgb(255 205 130 / 0.16)')
    beam.addColorStop(1, 'rgb(255 205 130 / 0)')
    ctx.fillStyle = beam
    ctx.beginPath()
    ctx.moveTo(lx - 1, 8)
    ctx.lineTo(lx + 2, 8)
    ctx.lineTo(lx + 16, CY + RY)
    ctx.lineTo(lx - 15, CY + RY)
    ctx.closePath()
    ctx.fill()
  }

  // apron and worn canvas mat
  fillPoly(ctx, octagon(1.07, CX, CY + 1), APRON)
  fillPoly(ctx, VERTS, MAT)
  fillPoly(ctx, octagon(0.9), MAT_SHADE)
  fillPoly(ctx, octagon(0.86), MAT)
  fillPoly(ctx, octagon(0.24), 'rgb(130 30 30 / 0.75)')
  fillPoly(ctx, octagon(0.17), MAT)
  fillPoly(ctx, octagon(0.1), 'rgb(130 30 30 / 0.75)')

  // scuffs and blood on the canvas
  const rand = rng(99)
  for (let n = 0; n < 40; n++) {
    const a = rand() * Math.PI * 2
    const r = Math.sqrt(rand()) * 0.8
    const x = Math.round(CX + Math.cos(a) * RX * r)
    const y = Math.round(CY + Math.sin(a) * RY * r)
    ctx.fillStyle = n < 8 ? 'rgb(140 20 20 / 0.7)' : 'rgb(60 50 40 / 0.25)'
    ctx.fillRect(x, y, n < 8 ? 1 : 2, 1)
  }

  // back fence and posts sit behind the fighters
  for (let k = 0; k < 8; k++) if (!isFrontEdge(k)) drawFence(ctx, k, false)
  for (const k of [3, 4, 5, 6, 7, 0]) drawPost(ctx, k)

  drawLightRig(ctx)
  return c
}

export function renderFrontLayer() {
  const c = canvas()
  const ctx = c.getContext('2d')!
  for (let k = 0; k < 3; k++) drawFence(ctx, k, true)
  for (const k of [1, 2]) drawPost(ctx, k, FRONT_FENCE_H)

  // foreground crowd, cropped by the frame
  drawCrowd(ctx, 74, 2, ['#050404', '#080706'], 13)

  // vignette
  const v = ctx.createRadialGradient(CX, CY - 10, 30, CX, CY - 10, 110)
  v.addColorStop(0, 'rgb(0 0 0 / 0)')
  v.addColorStop(1, 'rgb(0 0 0 / 0.75)')
  ctx.fillStyle = v
  ctx.fillRect(0, 0, W, H)
  return c
}

export interface FrameState {
  tick: number
  locked: boolean
  selected: number | null
  hovered: number | null
  fighters: SpriteColors[]
}

export function spotFor(i: number, locked: boolean) {
  return (locked ? FIGHT_SPOTS : IDLE_SPOTS)[i] ?? IDLE_SPOTS[0]
}

/** Sprite bounding box in native pixels, for hit testing. */
export function spriteBox(i: number, locked: boolean) {
  const [x, y] = spotFor(i, locked)
  return { x: x - SPRITE_W / 2, y: y - SPRITE_H, w: SPRITE_W, h: SPRITE_H }
}

function arrow(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = OUTLINE
  ctx.fillRect(x - 3, y - 1, 7, 1)
  ctx.fillStyle = color
  ctx.fillRect(x - 2, y, 5, 1)
  ctx.fillRect(x - 1, y + 1, 3, 1)
  ctx.fillRect(x, y + 2, 1, 1)
}

/** Dust motes drifting through the light, positions derived from the tick. */
function drawDust(ctx: CanvasRenderingContext2D, tick: number) {
  const rand = rng(5)
  ctx.fillStyle = 'rgb(255 220 160 / 0.45)'
  for (let n = 0; n < 14; n++) {
    const x0 = 50 + rand() * 60
    const y0 = rand() * 50
    const speed = 0.15 + rand() * 0.2
    const y = Math.floor((y0 + tick * speed) % 52) + 8
    const x = Math.floor(x0 + Math.sin((tick + n * 9) / 6) * 2)
    ctx.fillRect(x, y, 1, 1)
  }
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  back: HTMLCanvasElement,
  front: HTMLCanvasElement,
  s: FrameState,
) {
  ctx.clearRect(0, 0, W, H)
  ctx.drawImage(back, 0, 0)

  // phone flashes in the crowd
  const rand = rng(s.tick * 7919 + 1)
  if (s.tick % 3 === 0) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(Math.floor(rand() * W), 14 + Math.floor(rand() * 26), 1, 1)
  }

  s.fighters.forEach((col, i) => {
    const [x, y] = spotFor(i, s.locked)

    ctx.fillStyle = 'rgb(0 0 0 / 0.35)'
    ctx.fillRect(x - 6, y - 1, 12, 2)

    if (s.selected === i) {
      ctx.fillStyle = col.accent
      ctx.fillRect(x - 6, y - 3, 12, 1)
      ctx.fillRect(x - 6, y + 1, 12, 1)
      ctx.fillRect(x - 8, y - 2, 2, 3)
      ctx.fillRect(x + 6, y - 2, 2, 3)
    }

    let dx = 0
    let dy = 0
    if (s.locked) {
      // trade jabs on alternating beats
      const attacker = Math.floor(s.tick / 2) % 2 === i
      if (attacker && s.tick % 2 === 0) dx = i === 0 ? 2 : -2
    } else {
      dy = (Math.floor(s.tick / 2) + i) % 2 // idle bounce
    }
    drawSprite(ctx, col, x - SPRITE_W / 2 + dx, y - SPRITE_H + dy)
  })

  if (s.locked && s.tick % 2 === 0) {
    const mx = Math.round((FIGHT_SPOTS[0][0] + FIGHT_SPOTS[1][0]) / 2)
    const my = FIGHT_SPOTS[0][1] - 12
    ctx.fillStyle = '#fff6c8'
    ctx.fillRect(mx, my - 2, 1, 5)
    ctx.fillRect(mx - 2, my, 5, 1)
    ctx.fillStyle = '#ffcf4a'
    ctx.fillRect(mx - 1, my - 1, 1, 1)
    ctx.fillRect(mx + 1, my + 1, 1, 1)
  }

  drawDust(ctx, s.tick)
  ctx.drawImage(front, 0, 0)

  // a bulb on the rig sputters now and then
  if (s.tick % 41 === 0) {
    ctx.fillStyle = 'rgb(0 0 0 / 0.25)'
    ctx.fillRect(0, 0, W, H)
  }

  s.fighters.forEach((col, i) => {
    const [x, y] = spotFor(i, s.locked)
    const top = y - SPRITE_H - 5
    if (s.selected === i) arrow(ctx, x, top - (s.tick % 2), col.accent)
    else if (s.hovered === i) arrow(ctx, x, top, '#f2f0fa')
  })
}
