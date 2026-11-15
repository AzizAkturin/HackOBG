// One canvas holding all 12 spectator faces, wrapped on the head by atlas cell.
import * as THREE from 'three'
import { Mood, MOOD_COUNT, type MoodId } from './moods'

export const COLS = 4
export const ROWS = 3
const W = 160
const H = 128
const EYE_Y = 56
const EYE_DX = 32
const MOUTH_Y = 94

const WHITE = '#f4f1ea'
const INK = '#150e0c'
const MOUTH = '#3a0d12'
const TONGUE = '#b8484f'

type Ctx = CanvasRenderingContext2D

function line(c: Ctx, pts: [number, number][], width = 8) {
  c.strokeStyle = INK
  c.lineWidth = width
  c.lineCap = 'round'
  c.lineJoin = 'round'
  c.beginPath()
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)))
  c.stroke()
}

function brow(c: Ctx, side: -1 | 1, inner: number, outer: number, arch = 0) {
  const cx = W / 2 + side * EYE_DX
  const ix = cx - side * 14
  const ox = cx + side * 16
  c.strokeStyle = INK
  c.lineWidth = 9
  c.lineCap = 'round'
  c.beginPath()
  c.moveTo(ix, inner)
  c.quadraticCurveTo((ix + ox) / 2, Math.min(inner, outer) - arch, ox, outer)
  c.stroke()
}

interface EyeOpts {
  rx?: number
  ry?: number
  px?: number
  py?: number
  pr?: number
  lid?: number
  slant?: number
  shine?: boolean
}

function eye(c: Ctx, side: -1 | 1, o: EyeOpts = {}) {
  const { rx = 15, ry = 19, px = 0, py = 0, pr = 7, lid = 0, slant = 0, shine = false } = o
  const x = W / 2 + side * EYE_DX
  c.save()
  if (lid > 0) {
    // cut the top of the eye off along a (possibly slanted) lid line
    const top = EYE_Y - ry + lid * ry * 2
    const tilt = slant * side
    c.beginPath()
    c.moveTo(x - rx - 6, top - tilt)
    c.lineTo(x + rx + 6, top + tilt)
    c.lineTo(x + rx + 6, EYE_Y + ry + 6)
    c.lineTo(x - rx - 6, EYE_Y + ry + 6)
    c.closePath()
    c.clip()
  }
  c.fillStyle = WHITE
  c.beginPath()
  c.ellipse(x, EYE_Y, rx, ry, 0, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = INK
  c.beginPath()
  c.arc(x + px, EYE_Y + py, pr, 0, Math.PI * 2)
  c.fill()
  if (shine) {
    c.fillStyle = WHITE
    c.beginPath()
    c.arc(x + px - pr * 0.3, EYE_Y + py - pr * 0.35, pr * 0.32, 0, Math.PI * 2)
    c.fill()
  }
  c.restore()
  if (lid > 0) {
    const top = EYE_Y - ry + lid * ry * 2
    const tilt = slant * side
    line(c, [[x - rx - 3, top - tilt], [x + rx + 3, top + tilt]], 6)
  }
}

function squeezedEye(c: Ctx, side: -1 | 1) {
  const x = W / 2 + side * EYE_DX
  // chevron pointing at the nose, like > <
  line(c, [[x - side * 14, EYE_Y - 14], [x + side * 10, EYE_Y], [x - side * 14, EYE_Y + 14]], 8)
}

function happyEye(c: Ctx, side: -1 | 1) {
  const x = W / 2 + side * EYE_DX
  c.strokeStyle = INK
  c.lineWidth = 8
  c.lineCap = 'round'
  c.beginPath()
  c.arc(x, EYE_Y + 8, 14, Math.PI * 1.1, Math.PI * 1.9)
  c.stroke()
}

function fillMouth(c: Ctx, path: () => void, interior = MOUTH) {
  c.beginPath()
  path()
  c.fillStyle = interior
  c.fill()
  c.strokeStyle = INK
  c.lineWidth = 6
  c.lineJoin = 'round'
  c.stroke()
}

function teethBar(c: Ctx, x: number, y: number, w: number, h: number, cuts = 3) {
  c.fillStyle = WHITE
  c.fillRect(x, y, w, h)
  c.strokeStyle = INK
  c.lineWidth = 3
  c.beginPath()
  for (let i = 1; i <= cuts; i++) {
    c.moveTo(x + (w * i) / (cuts + 1), y)
    c.lineTo(x + (w * i) / (cuts + 1), y + h)
  }
  c.stroke()
  c.strokeRect(x, y, w, h)
}

const cx = W / 2

const DRAW: Record<MoodId, (c: Ctx) => void> = {
  [Mood.Neutral]: (c) => {
    eye(c, -1)
    eye(c, 1)
    brow(c, -1, 32, 30)
    brow(c, 1, 32, 30)
    line(c, [[cx - 14, MOUTH_Y], [cx + 14, MOUTH_Y]], 7)
  },
  [Mood.Cheer]: (c) => {
    eye(c, -1, { shine: true })
    eye(c, 1, { shine: true })
    brow(c, -1, 26, 24, 5)
    brow(c, 1, 26, 24, 5)
    fillMouth(c, () => {
      c.moveTo(cx - 34, MOUTH_Y - 8)
      c.quadraticCurveTo(cx, MOUTH_Y + 8, cx + 34, MOUTH_Y - 8)
      c.quadraticCurveTo(cx, MOUTH_Y + 46, cx - 34, MOUTH_Y - 8)
    })
    teethBar(c, cx - 28, MOUTH_Y - 4, 56, 8, 3)
  },
  [Mood.Angry]: (c) => {
    eye(c, -1, { lid: 0.32, slant: -9, pr: 6 })
    eye(c, 1, { lid: 0.32, slant: -9, pr: 6 })
    brow(c, -1, 46, 24)
    brow(c, 1, 46, 24)
    fillMouth(c, () => {
      c.moveTo(cx - 28, MOUTH_Y + 14)
      c.quadraticCurveTo(cx, MOUTH_Y - 12, cx + 28, MOUTH_Y + 14)
      c.quadraticCurveTo(cx, MOUTH_Y + 2, cx - 28, MOUTH_Y + 14)
    })
    teethBar(c, cx - 20, MOUTH_Y - 2, 40, 9, 4)
  },
  [Mood.Shocked]: (c) => {
    eye(c, -1, { rx: 18, ry: 23, pr: 4 })
    eye(c, 1, { rx: 18, ry: 23, pr: 4 })
    brow(c, -1, 18, 18, 10)
    brow(c, 1, 18, 18, 10)
    fillMouth(c, () => c.ellipse(cx, MOUTH_Y + 4, 11, 15, 0, 0, Math.PI * 2))
  },
  [Mood.Scream]: (c) => {
    squeezedEye(c, -1)
    squeezedEye(c, 1)
    brow(c, -1, 40, 24)
    brow(c, 1, 40, 24)
    fillMouth(c, () => c.ellipse(cx, MOUTH_Y + 6, 30, 26, 0, 0, Math.PI * 2))
    c.fillStyle = TONGUE
    c.beginPath()
    c.ellipse(cx, MOUTH_Y + 22, 18, 9, 0, 0, Math.PI * 2)
    c.fill()
    teethBar(c, cx - 22, MOUTH_Y - 16, 44, 8, 3)
  },
  [Mood.Wince]: (c) => {
    squeezedEye(c, -1)
    squeezedEye(c, 1)
    brow(c, -1, 24, 38)
    brow(c, 1, 24, 38)
    fillMouth(c, () => {
      c.moveTo(cx - 30, MOUTH_Y + 8)
      c.quadraticCurveTo(cx, MOUTH_Y - 10, cx + 30, MOUTH_Y + 8)
      c.quadraticCurveTo(cx, MOUTH_Y + 24, cx - 30, MOUTH_Y + 8)
    })
    teethBar(c, cx - 22, MOUTH_Y - 2, 44, 12, 5)
  },
  [Mood.Laugh]: (c) => {
    happyEye(c, -1)
    happyEye(c, 1)
    brow(c, -1, 26, 24, 6)
    brow(c, 1, 26, 24, 6)
    fillMouth(c, () => {
      c.moveTo(cx - 38, MOUTH_Y - 12)
      c.lineTo(cx + 38, MOUTH_Y - 12)
      c.quadraticCurveTo(cx + 34, MOUTH_Y + 40, cx, MOUTH_Y + 40)
      c.quadraticCurveTo(cx - 34, MOUTH_Y + 40, cx - 38, MOUTH_Y - 12)
    })
    teethBar(c, cx - 34, MOUTH_Y - 10, 68, 10, 3)
    c.fillStyle = TONGUE
    c.beginPath()
    c.ellipse(cx, MOUTH_Y + 30, 16, 7, 0, 0, Math.PI * 2)
    c.fill()
  },
  [Mood.Worried]: (c) => {
    eye(c, -1, { px: -5, py: -5 })
    eye(c, 1, { px: -5, py: -5 })
    brow(c, -1, 22, 36)
    brow(c, 1, 22, 36)
    line(c, [[cx - 22, MOUTH_Y + 4], [cx - 11, MOUTH_Y - 4], [cx, MOUTH_Y + 4], [cx + 11, MOUTH_Y - 4], [cx + 22, MOUTH_Y + 4]], 6)
  },
  [Mood.Bored]: (c) => {
    eye(c, -1, { lid: 0.5, px: 6, py: 4 })
    eye(c, 1, { lid: 0.5, px: 6, py: 4 })
    brow(c, -1, 36, 34)
    brow(c, 1, 36, 34)
    line(c, [[cx - 14, MOUTH_Y + 4], [cx + 14, MOUTH_Y]], 7)
  },
  [Mood.Hyped]: (c) => {
    eye(c, -1, { rx: 17, ry: 22, pr: 10, shine: true })
    eye(c, 1, { rx: 17, ry: 22, pr: 10, shine: true })
    brow(c, -1, 20, 18, 9)
    brow(c, 1, 20, 18, 9)
    fillMouth(c, () => {
      c.moveTo(cx - 38, MOUTH_Y - 12)
      c.lineTo(cx + 38, MOUTH_Y - 12)
      c.quadraticCurveTo(cx + 34, MOUTH_Y + 34, cx, MOUTH_Y + 34)
      c.quadraticCurveTo(cx - 34, MOUTH_Y + 34, cx - 38, MOUTH_Y - 12)
    })
    teethBar(c, cx - 34, MOUTH_Y - 10, 68, 16, 5)
  },
  [Mood.Smirk]: (c) => {
    eye(c, -1, { lid: 0.2, px: 5 })
    eye(c, 1, { lid: 0.2, px: 5 })
    brow(c, -1, 20, 14, 8)
    brow(c, 1, 34, 34)
    c.strokeStyle = INK
    c.lineWidth = 7
    c.lineCap = 'round'
    c.beginPath()
    c.moveTo(cx - 20, MOUTH_Y + 6)
    c.quadraticCurveTo(cx + 6, MOUTH_Y + 12, cx + 26, MOUTH_Y - 8)
    c.stroke()
  },
  [Mood.Horrified]: (c) => {
    eye(c, -1, { rx: 20, ry: 26, pr: 3 })
    eye(c, 1, { rx: 20, ry: 26, pr: 3 })
    brow(c, -1, 12, 24, 8)
    brow(c, 1, 12, 24, 8)
    fillMouth(c, () => c.ellipse(cx, MOUTH_Y + 8, 22, 26, 0, 0, Math.PI * 2))
    teethBar(c, cx - 18, MOUTH_Y - 14, 36, 9, 3)
  },
}

export function faceAtlas() {
  const canvas = document.createElement('canvas')
  canvas.width = COLS * W
  canvas.height = ROWS * H
  const c = canvas.getContext('2d')!
  for (let m = 0; m < MOOD_COUNT; m++) {
    c.save()
    c.translate((m % COLS) * W, Math.floor(m / COLS) * H)
    c.beginPath()
    c.rect(0, 0, W, H)
    c.clip()
    c.translate(W / 2, 60)
    c.scale(0.92, 0.92)
    c.translate(-W / 2, -H / 2)
    DRAW[m as MoodId](c)
    c.restore()
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return { tex, canvas }
}
