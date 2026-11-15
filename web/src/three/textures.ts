// Procedural textures drawn on canvases, so the arena needs no image assets.
import * as THREE from 'three'

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  draw(c.getContext('2d')!, size)
  const tex = new THREE.CanvasTexture(c)
  tex.anisotropy = 8
  return tex
}

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

/** Grey speckle used as a roughness map so metal and concrete don't look like plastic. */
export function noiseTexture() {
  const tex = canvasTexture(256, (ctx, s) => {
    const img = ctx.createImageData(s, s)
    const rand = rng(3)
    for (let i = 0; i < s * s; i++) {
      const v = 150 + rand() * 105
      img.data.set([v, v, v, 255], i * 4)
    }
    ctx.putImageData(img, 0, 0)
    // scratches
    ctx.strokeStyle = 'rgb(255 255 255 / 0.5)'
    for (let n = 0; n < 40; n++) {
      ctx.lineWidth = rand() * 1.5
      ctx.beginPath()
      const x = rand() * s
      const y = rand() * s
      ctx.moveTo(x, y)
      ctx.lineTo(x + (rand() - 0.5) * 60, y + (rand() - 0.5) * 20)
      ctx.stroke()
    }
  })
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}

/**
 * Weathering for painted armour: white base (tinted by the material colour)
 * with grime, rust blooms, chipped paint and drip streaks.
 */
export function grimeTexture(seed = 7) {
  const tex = canvasTexture(512, (ctx, s) => {
    const rand = rng(seed)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, s, s)
    // soft grime
    for (let n = 0; n < 60; n++) {
      const x = rand() * s
      const y = rand() * s
      const r = 10 + rand() * 50
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, `rgb(60 50 40 / ${0.12 + rand() * 0.18})`)
      g.addColorStop(1, 'rgb(60 50 40 / 0)')
      ctx.fillStyle = g
      ctx.fillRect(x - r, y - r, r * 2, r * 2)
    }
    // rust blooms
    for (let n = 0; n < 18; n++) {
      const x = rand() * s
      const y = rand() * s
      const r = 4 + rand() * 16
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, `rgb(120 60 25 / ${0.35 + rand() * 0.3})`)
      g.addColorStop(1, 'rgb(120 60 25 / 0)')
      ctx.fillStyle = g
      ctx.fillRect(x - r, y - r, r * 2, r * 2)
    }
    // chipped paint showing bare metal
    for (let n = 0; n < 90; n++) {
      ctx.fillStyle = `rgb(150 150 155 / ${0.3 + rand() * 0.4})`
      ctx.beginPath()
      ctx.ellipse(rand() * s, rand() * s, 1 + rand() * 4, 1 + rand() * 2, rand() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }
    // drip streaks
    for (let n = 0; n < 25; n++) {
      const x = rand() * s
      const y = rand() * s
      const g = ctx.createLinearGradient(x, y, x, y + 40 + rand() * 80)
      g.addColorStop(0, 'rgb(70 55 40 / 0.25)')
      g.addColorStop(1, 'rgb(70 55 40 / 0)')
      ctx.fillStyle = g
      ctx.fillRect(x, y, 1 + rand() * 2, 120)
    }
  })
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}

/** Soft round dot for spark particles and phone flashes. */
export function dotTexture() {
  return canvasTexture(64, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
    g.addColorStop(0, 'rgb(255 255 255 / 1)')
    g.addColorStop(0.35, 'rgb(255 255 255 / 0.6)')
    g.addColorStop(1, 'rgb(255 255 255 / 0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, s, s)
  })
}

/** Championship ring canvas: slate grey with a centre emblem and corner marks. */
export function ringCanvasTexture() {
  const tex = canvasTexture(1024, (ctx, s) => {
    const c = s / 2
    const rand = rng(23)
    ctx.fillStyle = '#4a4f57'
    ctx.fillRect(0, 0, s, s)
    for (let n = 0; n < 7000; n++) {
      ctx.fillStyle = `rgb(${20 + rand() * 40} ${20 + rand() * 40} ${25 + rand() * 40} / ${rand() * 0.07})`
      ctx.fillRect(rand() * s, rand() * s, 2 + rand() * 5, 2 + rand() * 5)
    }
    // darker apron border outside the ropes
    ctx.strokeStyle = '#2a2d33'
    ctx.lineWidth = 70
    ctx.strokeRect(35, 35, s - 70, s - 70)
    ctx.strokeStyle = 'rgb(255 255 255 / 0.18)'
    ctx.lineWidth = 4
    ctx.strokeRect(80, 80, s - 160, s - 160)

    // centre emblem: white disc, red ring, wordmark
    ctx.save()
    ctx.translate(c, c)
    ctx.scale(1.55, 1)
    ctx.beginPath()
    ctx.arc(0, 0, 150, 0, Math.PI * 2)
    ctx.fillStyle = 'rgb(240 236 228 / 0.92)'
    ctx.fill()
    ctx.lineWidth = 16
    ctx.strokeStyle = '#c4262e'
    ctx.stroke()
    ctx.restore()
    ctx.fillStyle = '#c4262e'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = 'italic 800 190px "Barlow Condensed", "Arial Narrow", sans-serif'
    ctx.fillText('WAB', c, c + 4)
    ctx.fillStyle = '#2a2d33'
    ctx.font = '600 32px "Barlow Condensed", sans-serif'
    ctx.fillText('WORLD  AGENT  BOXING', c, c + 96)

    // wear the emblem down
    for (let n = 0; n < 2500; n++) {
      ctx.fillStyle = `rgb(74 79 87 / ${rand() * 0.35})`
      ctx.fillRect(c + (rand() - 0.5) * 520, c + (rand() - 0.5) * 340, 2 + rand() * 6, 1 + rand() * 3)
    }
    // sweat and oil stains
    for (let n = 0; n < 30; n++) {
      const x = c + (rand() - 0.5) * s * 0.8
      const y = c + (rand() - 0.5) * s * 0.8
      const r = 20 + rand() * 70
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, `rgb(20 18 16 / ${0.1 + rand() * 0.15})`)
      g.addColorStop(1, 'rgb(20 18 16 / 0)')
      ctx.fillStyle = g
      ctx.fillRect(x - r, y - r, r * 2, r * 2)
    }
    // boot and foot scuffs
    for (let n = 0; n < 220; n++) {
      ctx.fillStyle = `rgb(15 15 18 / ${0.05 + rand() * 0.1})`
      ctx.beginPath()
      ctx.ellipse(c + (rand() - 0.5) * s * 0.78, c + (rand() - 0.5) * s * 0.78, 4 + rand() * 26, 2 + rand() * 7, rand() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }
    // blood: drops with a few splatter trails
    for (let n = 0; n < 14; n++) {
      const x = c + (rand() - 0.5) * s * 0.55
      const y = c + (rand() - 0.5) * s * 0.55
      for (let k = 0; k < 8; k++) {
        ctx.fillStyle = `rgb(${90 + rand() * 40} 8 10 / ${0.45 + rand() * 0.4})`
        ctx.beginPath()
        ctx.arc(x + (rand() - 0.5) * 40 * k * 0.3, y + (rand() - 0.5) * 20 * k * 0.3, 1 + rand() * (k ? 4 : 9), 0, Math.PI * 2)
        ctx.fill()
      }
    }
    // gaffer tape repairs
    for (let n = 0; n < 5; n++) {
      ctx.save()
      ctx.translate(c + (rand() - 0.5) * s * 0.7, c + (rand() - 0.5) * s * 0.7)
      ctx.rotate(rand() * Math.PI)
      ctx.fillStyle = `rgb(${150 + rand() * 30} ${150 + rand() * 30} ${140 + rand() * 30} / 0.55)`
      ctx.fillRect(-40, -9, 80 + rand() * 60, 18)
      ctx.restore()
    }
    // grime building up toward the ropes
    const edge = ctx.createRadialGradient(c, c, s * 0.25, c, c, s * 0.72)
    edge.addColorStop(0, 'rgb(0 0 0 / 0)')
    edge.addColorStop(1, 'rgb(10 9 8 / 0.55)')
    ctx.fillStyle = edge
    ctx.fillRect(0, 0, s, s)
  })
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** Concentric dashed rings and tick marks, for the holographic floor. */
export function holoRingTexture() {
  const tex = canvasTexture(1024, (ctx, s) => {
    const c = s / 2
    ctx.strokeStyle = '#3fe0ff'
    const rings: [number, number, number[]][] = [
      [0.46, 4, [30, 18]],
      [0.42, 2, [6, 10]],
      [0.36, 3, [120, 40]],
    ]
    for (const [r, w, dash] of rings) {
      ctx.lineWidth = w
      ctx.setLineDash(dash)
      ctx.beginPath()
      ctx.arc(c, c, r * s, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.setLineDash([])
    ctx.lineWidth = 3
    for (let k = 0; k < 48; k++) {
      const a = (k / 48) * Math.PI * 2
      const r0 = 0.47 * s
      const r1 = (k % 4 ? 0.485 : 0.5) * s
      ctx.beginPath()
      ctx.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0)
      ctx.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1)
      ctx.stroke()
    }
  })
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** Yellow/black hazard stripes, worn at the edges. */
export function hazardTexture() {
  const tex = canvasTexture(128, (ctx, s) => {
    ctx.fillStyle = '#d9a514'
    ctx.fillRect(0, 0, s, s)
    ctx.fillStyle = '#141414'
    for (let x = -s; x < s * 2; x += 32) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x + 16, 0)
      ctx.lineTo(x + 16 - s, s)
      ctx.lineTo(x - s, s)
      ctx.closePath()
      ctx.fill()
    }
    const rand = rng(41)
    for (let n = 0; n < 160; n++) {
      ctx.fillStyle = `rgb(90 85 80 / ${0.3 + rand() * 0.5})`
      ctx.fillRect(rand() * s, rand() * s, 1 + rand() * 4, 1 + rand() * 3)
    }
  })
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}

/** Ring skirt banner: stencilled wordmark on dark vinyl, scuffed. */
export function skirtTexture() {
  const tex = canvasTexture(1024, (ctx, s) => {
    ctx.fillStyle = '#121418'
    ctx.fillRect(0, 0, s, s)
    ctx.fillStyle = '#c4262e'
    ctx.fillRect(0, s * 0.12, s, s * 0.06)
    ctx.fillRect(0, s * 0.82, s, s * 0.06)
    ctx.fillStyle = 'rgb(232 228 220 / 0.85)'
    ctx.font = '700 260px "Steel", "Barlow Condensed", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('WAB', s / 2, s * 0.48)
    ctx.font = '600 70px "Barlow Condensed", sans-serif'
    ctx.fillStyle = 'rgb(232 228 220 / 0.5)'
    ctx.fillText('WORLD AGENT BOXING  ·  MONAD TESTNET', s / 2, s * 0.7)
    const rand = rng(13)
    for (let n = 0; n < 1500; n++) {
      ctx.fillStyle = `rgb(18 20 24 / ${rand() * 0.6})`
      ctx.fillRect(rand() * s, rand() * s, 2 + rand() * 10, 1 + rand() * 3)
    }
  })
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** Stadium LED board showing the matchup. */
export function screenTexture(left: string, right: string, leftColor: string, rightColor: string) {
  const tex = canvasTexture(1024, (ctx, s) => {
    ctx.fillStyle = '#05070b'
    ctx.fillRect(0, 0, s, s)
    ctx.font = '700 150px "Barlow Condensed", sans-serif'
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'right'
    ctx.fillStyle = leftColor
    ctx.fillText(left.toUpperCase(), s * 0.44, s * 0.5)
    ctx.textAlign = 'left'
    ctx.fillStyle = rightColor
    ctx.fillText(right.toUpperCase(), s * 0.56, s * 0.5)
    ctx.textAlign = 'center'
    ctx.fillStyle = '#e8e4dc'
    ctx.font = '700 90px "Barlow Condensed", sans-serif'
    ctx.fillText('VS', s / 2, s * 0.5)
    // LED pixel grid
    ctx.fillStyle = 'rgb(0 0 0 / 0.45)'
    for (let y = 0; y < s; y += 6) ctx.fillRect(0, y, s, 2)
    for (let x = 0; x < s; x += 6) ctx.fillRect(x, 0, 2, s)
  })
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** Roughness for wet concrete: mostly rough, with smooth puddles. */
export function puddleTexture() {
  const tex = canvasTexture(512, (ctx, s) => {
    const rand = rng(77)
    const img = ctx.createImageData(s, s)
    for (let i = 0; i < s * s; i++) {
      const v = 190 + rand() * 65
      img.data.set([v, v, v, 255], i * 4)
    }
    ctx.putImageData(img, 0, 0)
    for (let n = 0; n < 26; n++) {
      const x = rand() * s
      const y = rand() * s
      const r = 15 + rand() * 60
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, 'rgb(25 25 25 / 0.95)')
      g.addColorStop(0.7, 'rgb(25 25 25 / 0.8)')
      g.addColorStop(1, 'rgb(25 25 25 / 0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.ellipse(x, y, r * (1 + rand()), r, rand() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }
  })
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}

/** Redraw canvas textures once web fonts (Steel) have loaded. */
export function whenFontsReady(fn: () => void) {
  if (typeof document !== 'undefined' && document.fonts) {
    Promise.all([document.fonts.load('700 64px "Steel"'), document.fonts.load('italic 800 64px "Barlow Condensed"')]).then(fn, fn)
  }
}

/** Fighter number stencilled on the chest plate. */
export function chestTexture(base: string, ink: string, number: number) {
  const tex = canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = base
    ctx.fillRect(0, 0, s, s)
    ctx.fillStyle = ink
    ctx.font = 'bold 150px "Barlow Condensed", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(number).padStart(2, '0'), s / 2, s / 2 + 8)
  })
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** Draws a greyscale height field, then returns it with a tangent-space normal map derived from it. */
function heightAndNormal(size: number, strength: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void) {
  const height = canvasTexture(size, draw)
  const src = (height.image as HTMLCanvasElement).getContext('2d')!.getImageData(0, 0, size, size).data
  const normal = canvasTexture(size, (ctx, s) => {
    const out = ctx.createImageData(s, s)
    const h = (x: number, y: number) => src[(((y + s) % s) * s + ((x + s) % s)) * 4] / 255
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        // canvas rows run down but flipY puts row 0 at v = 1, hence +dy
        const dx = (h(x + 1, y) - h(x - 1, y)) * strength
        const dy = (h(x, y + 1) - h(x, y - 1)) * strength
        const inv = 1 / Math.hypot(dx, dy, 1)
        out.data.set([(-dx * inv * 0.5 + 0.5) * 255, (dy * inv * 0.5 + 0.5) * 255, (inv * 0.5 + 0.5) * 255, 255], (y * s + x) * 4)
      }
    }
    ctx.putImageData(out, 0, 0)
  })
  for (const t of [height, normal]) t.wrapS = t.wrapT = THREE.RepeatWrapping
  return { height, normal }
}

/** Painted armour relief: inset panel seams, fastener heads, a weld bead and scratches, for one box face or cylinder wrap. */
export function panelNormalTexture() {
  return heightAndNormal(512, 6, (ctx, s) => {
    const rand = rng(91)
    ctx.fillStyle = 'rgb(128 128 128)'
    ctx.fillRect(0, 0, s, s)
    // orange peel
    for (let n = 0; n < 9000; n++) {
      const v = 120 + rand() * 16
      ctx.fillStyle = `rgb(${v} ${v} ${v} / 0.5)`
      ctx.fillRect(rand() * s, rand() * s, 2, 2)
    }
    const groove = (x0: number, y0: number, x1: number, y1: number) => {
      for (const [w, v] of [[7, 108], [4, 70], [2, 40]] as const) {
        ctx.strokeStyle = `rgb(${v} ${v} ${v})`
        ctx.lineWidth = w
        ctx.beginPath()
        ctx.moveTo(x0, y0)
        ctx.lineTo(x1, y1)
        ctx.stroke()
      }
    }
    const a = s * 0.14
    const b = s * 0.86
    groove(0, a, s, a)
    groove(0, b, s, b)
    groove(s * 0.62, a, s * 0.62, b)
    // fastener heads where seams cross
    const bolt = (x: number, y: number, r: number) => {
      const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r)
      g.addColorStop(0, 'rgb(205 205 205)')
      g.addColorStop(0.75, 'rgb(150 150 150)')
      g.addColorStop(1, 'rgb(60 60 60)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
    for (const x of [s * 0.06, s * 0.94]) for (const y of [a + 14, b - 14]) bolt(x, y, 6)
    for (let x = s * 0.1; x < s; x += s * 0.2) bolt(x, b + 18, 4)
    // weld bead down the left of the vertical seam
    for (let y = a + 6; y < b - 6; y += 3) {
      const x = s * 0.62 - 12 + (rand() - 0.5) * 2
      const g = ctx.createRadialGradient(x, y, 0, x, y, 5)
      g.addColorStop(0, 'rgb(190 190 190)')
      g.addColorStop(1, 'rgb(128 128 128 / 0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.ellipse(x, y, 5, 3.5, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    // scratches
    for (let n = 0; n < 70; n++) {
      const v = 85 + rand() * 30
      ctx.strokeStyle = `rgb(${v} ${v} ${v} / 0.8)`
      ctx.lineWidth = 0.6 + rand() * 1.2
      const x = rand() * s
      const y = rand() * s
      const ang = rand() * Math.PI
      const len = 8 + rand() * 50
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len)
      ctx.stroke()
    }
  }).normal
}

/** Brushed metal: fine directional streaks; the height doubles as a roughness map. */
export function brushedTextures() {
  const { height, normal } = heightAndNormal(512, 2.5, (ctx, s) => {
    const rand = rng(57)
    ctx.fillStyle = 'rgb(190 190 190)'
    ctx.fillRect(0, 0, s, s)
    for (let n = 0; n < 2600; n++) {
      const v = 140 + rand() * 115
      ctx.fillStyle = `rgb(${v} ${v} ${v} / ${0.25 + rand() * 0.5})`
      const x = rand() * s
      const y = rand() * s
      const len = 30 + rand() * 260
      ctx.fillRect(x, y, len, 1)
      if (x + len > s) ctx.fillRect(x - s, y, len, 1)
    }
    for (let n = 0; n < 30; n++) {
      ctx.strokeStyle = 'rgb(110 110 110 / 0.7)'
      ctx.lineWidth = 0.8
      const x = rand() * s
      const y = rand() * s
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + (rand() - 0.5) * 70, y + (rand() - 0.5) * 70)
      ctx.stroke()
    }
  })
  return { normal, roughness: height }
}

/**
 * Wear thresholds per channel, read by the robot wear shader: brighter means it shows up earlier.
 * R paint chips crowding the face edges, G scuff clusters, B drips running down from the top edge and seams.
 */
export function wearMaskTexture(seed: number) {
  const tex = canvasTexture(512, (ctx, s) => {
    const rand = rng(seed)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, s, s)
    ctx.globalCompositeOperation = 'lighten'
    const chip = (x: number, y: number, r: number, v: number) => {
      ctx.fillStyle = `rgb(${v} 0 0)`
      ctx.beginPath()
      const k = 5 + Math.floor(rand() * 4)
      for (let i = 0; i < k; i++) {
        const ang = (i / k) * Math.PI * 2
        const rr = r * (0.45 + rand() * 0.8)
        ctx.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr)
      }
      ctx.fill()
    }
    const band = s * 0.22
    for (let n = 0; n < 650; n++) {
      const d = rand() ** 2.2 * band
      const along = rand() * s
      const side = Math.floor(rand() * 4)
      const x = side === 0 ? d : side === 1 ? s - d : along
      const y = side === 2 ? d : side === 3 ? s - d : along
      const v = 255 * (1 - d / band) * (0.55 + rand() * 0.45)
      chip(x, y, 2 + rand() * 7, v)
      if (rand() < 0.4) chip(x + (rand() - 0.5) * 16, y + (rand() - 0.5) * 16, 1 + rand() * 3, v * 0.9)
    }
    for (let n = 0; n < 160; n++) chip(rand() * s, rand() * s, 1.5 + rand() * 5, rand() * 150)

    for (let n = 0; n < 45; n++) {
      const cx = rand() * s
      const cy = rand() * s
      const ang = rand() * Math.PI
      const v = 70 + rand() * 185
      ctx.strokeStyle = `rgb(0 ${v} 0)`
      const lines = 5 + Math.floor(rand() * 10)
      for (let i = 0; i < lines; i++) {
        ctx.lineWidth = 0.8 + rand() * 1.8
        const ox = cx + (rand() - 0.5) * 30
        const oy = cy + (rand() - 0.5) * 30
        const len = 10 + rand() * 45
        const a = ang + (rand() - 0.5) * 0.25
        ctx.beginPath()
        ctx.moveTo(ox, oy)
        ctx.lineTo(ox + Math.cos(a) * len, oy + Math.sin(a) * len)
        ctx.stroke()
      }
    }

    for (let n = 0; n < 40; n++) {
      const x = rand() * s
      const y0 = rand() < 0.5 ? rand() * s * 0.08 : s * 0.15 + rand() * 6
      const len = 40 + rand() * 220
      const v = 110 + rand() * 145
      const g = ctx.createLinearGradient(x, y0, x, y0 + len)
      g.addColorStop(0, `rgb(0 0 ${v})`)
      g.addColorStop(1, 'rgb(0 0 0)')
      ctx.fillStyle = g
      ctx.fillRect(x, y0, 2 + rand() * 4, len)
      const pool = ctx.createRadialGradient(x, y0, 0, x, y0, 8 + rand() * 10)
      pool.addColorStop(0, `rgb(0 0 ${v})`)
      pool.addColorStop(1, 'rgb(0 0 0)')
      ctx.fillStyle = pool
      ctx.fillRect(x - 20, y0 - 20, 40, 40)
    }
  })
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}
