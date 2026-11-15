// Chest emblems drawn in white on transparent. The shader paints them in each shirt's ink colour.
import * as THREE from 'three'

/** Pattern ids 0..4 are procedural lines, 5..7 are emblems from this atlas. */
export const LINE_PATTERNS = 5
export const EMBLEMS = 3
export const PATTERNS = LINE_PATTERNS + EMBLEMS
const S = 128

type Ctx = CanvasRenderingContext2D

function star(c: Ctx, x: number, y: number, r: number) {
  c.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? r * 0.45 : r
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
  }
  c.closePath()
  c.fill()
}

/** Emblem centres in uv, so the shader can scale each around its own middle. */
export const EMBLEM_CENTRE: [number, number][] = [
  [0.5, 0.6],
  [0.5, 0.6],
  [0.5, 0.6],
]

const DRAW: ((c: Ctx) => void)[] = [
  (c) => {
    c.lineWidth = 6
    c.strokeStyle = '#fff'
    c.beginPath()
    c.arc(64, 51, 30, 0, Math.PI * 2)
    c.stroke()
    star(c, 64, 51, 20)
  },
  (c) => {
    c.fillRect(48, 36, 32, 32)
    c.fillRect(48, 74, 32, 6)
  },
  (c) => {
    c.beginPath()
    c.moveTo(74, 14)
    c.lineTo(40, 62)
    c.lineTo(60, 62)
    c.lineTo(48, 108)
    c.lineTo(92, 50)
    c.lineTo(70, 50)
    c.lineTo(84, 14)
    c.closePath()
    c.fill()
  },
]

export function patternAtlas() {
  const canvas = document.createElement('canvas')
  canvas.width = EMBLEMS * S
  canvas.height = S
  const c = canvas.getContext('2d')!
  DRAW.forEach((draw, i) => {
    c.save()
    c.translate(i * S, 0)
    c.beginPath()
    c.rect(0, 0, S, S)
    c.clip()
    c.fillStyle = '#fff'
    draw(c)
    c.restore()
  })
  const tex = new THREE.CanvasTexture(canvas)
  tex.anisotropy = 4
  return tex
}
