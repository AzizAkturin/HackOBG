// The audience: every spectator has a body, two jointed arms, a head with a
// moving face, and their own hair, skin and clothes. They react to the fight.
import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { FightDirector } from '../director'
import { CHAIR_H, COMMENTATORS, FIRST_ROW, ROW_DEPTH, ROW_RISE, STAGE_Y, TIERS } from '../stadium'
import { COLS, faceAtlas, ROWS } from './faceAtlas'
import { EMBLEMS, LINE_PATTERNS, PATTERNS, patternAtlas } from './patternAtlas'
import { APPLAUSE, HOST_APPLAUSE, HOST_IDLE, HOST_IDLE_CALM, HOST_LOOK, HOST_REACTIONS, HOST_ROAR, IDLE, IDLE_CALM, Mood, pick, POSES, REACTIONS, ROAR, type Allegiance, type MoodId, type Reaction } from './moods'

const Hair = { Bald: 0, Short: 1, Afro: 2, Long: 3, Beanie: 4, Cap: 5 } as const
type HairStyle = (typeof Hair)[keyof typeof Hair]

const HEAD_R = 0.21
const HAT_COUNT = 6
const PATTERN_SHARE = 0.3
const UPPER = 0.3
const FORE = 0.28
const SKIN = ['#f1c9a5', '#e0ac82', '#c68863', '#a96b45', '#8a5836', '#6b4429']
const HAIR: [string, number][] = [
  ['#0d0b0a', 34],
  ['#1e1510', 30],
  ['#3b2616', 24],
  ['#6b4423', 8],
  ['#c9a45c', 2],
  ['#a8451f', 1],
  ['#9a9a9a', 3],
]
const BRIGHT_HAIR = ['#3b6fd6', '#d65a9a', '#3fb86a']
const HAIR_STYLES: [HairStyle, number][] = [
  [Hair.Bald, 12],
  [Hair.Short, 36],
  [Hair.Afro, 12],
  [Hair.Long, 16],
]

const CLOTHES: [string, number][] = [
  ['#17181b', 30],
  ['#2d2f34', 18],
  ['#d9d8d3', 3.5],
  ['#a3a5a9', 4],
  ['#62656b', 10],
  ['#212b45', 9],
  ['#41597a', 7],
  ['#4b4e38', 4],
  ['#aa9a7e', 4],
  ['#4b392b', 3],
  ['#6e2a2f', 2.5],
  ['#c42a30', 4.5],
  ['#2d4a3b', 1.5],
  ['#a2832f', 0.8],
]

function clothing(rand: () => number) {
  const c = new THREE.Color(weighted(rand, CLOTHES))
  const hsl = { h: 0, s: 0, l: 0 }
  c.getHSL(hsl)
  return c.setHSL(hsl.h, hsl.s * (0.8 + rand() * 0.3), Math.min(0.9, hsl.l * (0.85 + rand() * 0.3)))
}

interface Seat {
  x: number
  y: number
  z: number
  yaw: number
  h: number
  w: number
  headScale: number
  phase: number
  tier: number
  fan: Allegiance
  host: boolean
  hair: HairStyle
  arms: 0 | 1 | 2
  tee: boolean
  skin: THREE.Color
  hairColor: THREE.Color
  shirt: THREE.Color
  hat: THREE.Color
  pattern: number
  /** Line spacing and thickness, or emblem size. */
  param: [number, number]
  ink: THREE.Color
}

function weighted<T>(rand: () => number, items: [T, number][]): T {
  let x = rand() * items.reduce((a, [, w]) => a + w, 0)
  for (const [v, w] of items) if ((x -= w) < 0) return v
  return items[0][0]
}

/** Seats along the four sides of each tier, like an arena bowl. */
const seats: Seat[] = (() => {
  let seed = 21
  const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)
  const out: Seat[] = []
  for (let k = 0; k < TIERS; k++) {
    const d = FIRST_ROW + k * ROW_DEPTH
    const y = 0.2 + k * ROW_RISE
    for (let side = 0; side < 4; side++) {
      for (let s = -d; s < d; s += 0.62) {
        if (rand() < 0.07) continue
        const along = s + (rand() - 0.5) * 0.15
        const [x, z] = [
          [along, -d],
          [d, along],
          [-along, d],
          [-d, -along],
        ][side]
        const r = rand()
        const fan: Allegiance = r < 0.4 ? 0 : r < 0.8 ? 1 : 2
        const shirt = clothing(rand)
        const hat = clothing(rand)
        out.push({
          x,
          y,
          z,
          yaw: Math.atan2(-x, -z),
          h: 0.88 + rand() * 0.22,
          w: 0.9 + rand() * 0.25,
          headScale: 0.92 + rand() * 0.2,
          phase: rand() * 10,
          tier: k,
          fan,
          host: false,
          hair: weighted(rand, HAIR_STYLES),
          arms: rand() < 0.6 ? 0 : rand() < 0.5 ? 1 : 2,
          tee: rand() < 0.35,
          skin: new THREE.Color(SKIN[Math.floor(rand() * SKIN.length)]),
          hairColor: new THREE.Color(weighted(rand, HAIR)),
          shirt,
          hat,
          pattern: -1,
          param: [1, 0],
          ink: new THREE.Color(),
        })
      }
    }
  }
  const bright = new Set<number>()
  while (bright.size < BRIGHT_HAIR.length) bright.add(Math.floor(rand() * out.length))
  ;[...bright].forEach((i, k) => {
    out[i].hairColor = new THREE.Color(BRIGHT_HAIR[k])
    if (out[i].hair === Hair.Bald) out[i].hair = Hair.Short
  })
  const taken = new Set(bright)
  for (const color of ['#2f6fd6', '#2fa65a']) {
    let i = Math.floor(rand() * out.length)
    while (taken.has(i)) i = Math.floor(rand() * out.length)
    taken.add(i)
    out[i].shirt = new THREE.Color(color)
  }
  const hats = new Set<number>()
  while (hats.size < HAT_COUNT) hats.add(Math.floor(rand() * out.length))
  hats.forEach((i) => (out[i].hair = rand() < 0.5 ? Hair.Cap : Hair.Beanie))
  let ps = 4099
  const prand = () => ((ps = (ps * 1664525 + 1013904223) % 4294967296) / 4294967296)
  const hsl = { h: 0, s: 0, l: 0 }
  const OTHER = ['#8e2a2f', '#2a4670', '#a2832f', '#2f6b52', '#6a3f6e', '#b5651d']
  for (const seat of out) {
    if (prand() >= PATTERN_SHARE) continue
    const id = Math.floor(prand() * PATTERNS)
    seat.pattern = id
    const thin = prand() ** 1.6
    seat.param =
      id === 0 || id === 1 ? [0.03 + thin * 0.08, 0.15 + prand() * 0.4]
      : id === 2 ? [0.05 + thin * 0.07, 0.15 + prand() * 0.35]
      : id === 3 ? [0.06 + thin * 0.08, 0.08 + prand() * 0.16]
      : id === 4 ? [0.03 + thin * 0.07, 0.5]
      : [0.55 + prand() * 0.7, 0]

    const light = seat.shirt.getHSL(hsl).l > 0.45
    const r = prand()
    if (r < 0.6) {
      const k = 0.55 + prand() * 0.2
      seat.ink.setHSL(hsl.h, hsl.s, light ? hsl.l * k : Math.min(0.8, hsl.l + 0.1 + prand() * 0.14))
    } else if (r < 0.85) {
      seat.ink.set(light ? '#1a1b1f' : prand() < 0.5 ? '#cfcfca' : '#7d8087')
    } else {
      seat.ink.set(OTHER[Math.floor(prand() * OTHER.length)])
    }
  }
  let hs = 733
  const hostRand = () => ((hs = (hs * 1664525 + 1013904223) % 4294967296) / 4294967296)
  const HOST_HAIR: HairStyle[] = [Hair.Short, Hair.Bald, Hair.Long, Hair.Short]
  COMMENTATORS.forEach(([x, z], k) => {
    out.push({
      x,
      y: STAGE_Y + CHAIR_H,
      z,
      yaw: Math.PI,
      h: 1,
      w: 1.05,
      headScale: 1.05,
      phase: hostRand() * 10,
      tier: 0,
      fan: 2,
      host: true,
      hair: HOST_HAIR[k % HOST_HAIR.length],
      arms: 0,
      tee: false,
      skin: new THREE.Color(SKIN[Math.floor(hostRand() * SKIN.length)]),
      hairColor: new THREE.Color(weighted(hostRand, HAIR)),
      shirt: new THREE.Color('#0b0c0f'),
      hat: new THREE.Color('#0b0c0f'),
      pattern: -1,
      param: [1, 0],
      ink: new THREE.Color(),
    })
  })
  return out
})()

function instanced(geo: THREE.BufferGeometry, mat: THREE.Material, count: number) {
  const m = new THREE.InstancedMesh(geo, mat, Math.max(1, count))
  m.count = count
  m.frustumCulled = false
  return m
}

function faceGeometry(count: number) {
  const g = new THREE.SphereGeometry(HEAD_R * 1.012, 20, 14, Math.PI / 2 - 1, 2, Math.PI / 2 - 0.8, 1.6)
  const uv = g.attributes.uv
  for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i))
  g.setAttribute('aFace', new THREE.InstancedBufferAttribute(new Float32Array(count), 1))
  return g
}

function faceMaterial(map: THREE.Texture) {
  const mat = new THREE.MeshStandardMaterial({ map, alphaTest: 0.4, roughness: 1 })
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aFace;')
      .replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
#ifdef USE_MAP
vMapUv = (vMapUv + vec2(mod(aFace, ${COLS}.0), ${ROWS - 1}.0 - floor(aFace / ${COLS}.0))) / vec2(${COLS}.0, ${ROWS}.0);
#endif`,
      )
  }
  return mat
}

function shirtMaterial(map: THREE.Texture) {
  const mat = new THREE.MeshStandardMaterial({ roughness: 1 })
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.patMap = { value: map }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aPat;\nattribute vec2 aPatParam;\nattribute vec3 aInk;\nvarying vec2 vPatUv;\nvarying float vPat;\nvarying vec2 vParam;\nvarying vec3 vInk;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
vPat = aPat;
vParam = aPatParam;
vInk = aInk;
vPatUv = vec2(position.x / 0.2 * 0.5 + 0.5, position.y / 0.9 + 0.5);`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform sampler2D patMap;
varying vec2 vPatUv;
varying float vPat;
varying vec2 vParam;
varying vec3 vInk;
float pulse(float x, float duty) {
  float f = fract(x);
  float w = min(fwidth(x) * 0.75, 0.5);
  return smoothstep(0.0, w, f) * (1.0 - smoothstep(duty, duty + w, f));
}`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
if (vPat > -0.5) {
  vec2 p = vec2(vPatUv.x * 0.4, vPatUv.y * 0.9);
  float period = vParam.x;
  float duty = vParam.y;
  float a = 0.0;
  if (vPat < 0.5) a = pulse(p.y / period, duty);
  else if (vPat < 1.5) a = pulse(p.x / period, duty);
  else if (vPat < 2.5) a = pulse((p.y + abs(p.x - 0.2) * 0.9) / period, duty);
  else if (vPat < 3.5) a = max(pulse(p.x / period, duty), pulse(p.y / period, duty)) * 0.8;
  else if (vPat < 4.5) a = max(step(abs(p.y - 0.58), period * 0.5), step(abs(p.y - 0.58 + period * 0.9), period * 0.12));
  else {
    float cell = vPat - ${LINE_PATTERNS}.0;
    vec2 e = (vPatUv - vec2(0.5, 0.6)) / duty_scale_placeholder + vec2(0.5, 0.6);
    if (e.x > 0.01 && e.x < 0.99 && e.y > 0.01 && e.y < 0.99) a = texture2D(patMap, vec2((e.x + cell) / ${EMBLEMS}.0, e.y)).a;
  }
  diffuseColor.rgb = mix(diffuseColor.rgb, vInk, a * 0.92);
}`.replace('duty_scale_placeholder', 'period'),
      )
  }
  return mat
}

function bodyGeometry() {
  const g = new THREE.CapsuleGeometry(0.2, 0.5, 4, 10)
  const pat = new Float32Array(seats.length)
  const ink = new Float32Array(seats.length * 3)
  const param = new Float32Array(seats.length * 2)
  seats.forEach((s, i) => {
    pat[i] = s.pattern
    param.set(s.param, i * 2)
    ink.set([s.ink.r, s.ink.g, s.ink.b], i * 3)
  })
  g.setAttribute('aPat', new THREE.InstancedBufferAttribute(pat, 1))
  g.setAttribute('aPatParam', new THREE.InstancedBufferAttribute(param, 2))
  g.setAttribute('aInk', new THREE.InstancedBufferAttribute(ink, 3))
  return g
}

function boomGeometry() {
  const from = new THREE.Vector3(0.235, -0.02, 0.03)
  const to = new THREE.Vector3(0.07, -0.09, 0.19)
  const dir = to.clone().sub(from)
  const rod = new THREE.CylinderGeometry(0.007, 0.007, dir.length(), 6)
  rod.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()))
  rod.translate(...from.clone().addScaledVector(dir, 0.5).toArray())
  const tip = new THREE.SphereGeometry(0.024, 8, 6).translate(to.x, to.y, to.z)
  return mergeGeometries([rod, tip])!
}

function headsetMaterial() {
  return new THREE.MeshStandardMaterial({ color: '#0a0a0c', roughness: 0.45, metalness: 0.35 })
}

function build() {
  const n = seats.length
  const std = () => new THREE.MeshStandardMaterial({ roughness: 1 })
  const atlas = faceAtlas()
  const patterns = patternAtlas()

  const upperGeo = new THREE.CapsuleGeometry(0.065, UPPER - 0.13, 3, 8).translate(0, -UPPER / 2, 0)
  const foreGeo = new THREE.CapsuleGeometry(0.058, FORE - 0.116, 3, 8).translate(0, -FORE / 2, 0)

  // hair slots: which seats need which hair mesh, and where in it they sit
  const slots = { short: [] as number[], afro: [] as number[], long: [] as number[], brim: [] as number[] }
  const slotOf = new Int32Array(n * 4).fill(-1)
  seats.forEach((s, i) => {
    if (s.hair === Hair.Short || s.hair === Hair.Long || s.hair === Hair.Beanie || s.hair === Hair.Cap) {
      slotOf[i * 4] = slots.short.length
      slots.short.push(i)
    }
    if (s.hair === Hair.Afro) {
      slotOf[i * 4 + 1] = slots.afro.length
      slots.afro.push(i)
    }
    if (s.hair === Hair.Long) {
      slotOf[i * 4 + 2] = slots.long.length
      slots.long.push(i)
    }
    if (s.hair === Hair.Cap) {
      slotOf[i * 4 + 3] = slots.brim.length
      slots.brim.push(i)
    }
  })

  const hostSlot = new Int32Array(n).fill(-1)
  let hostCount = 0
  seats.forEach((s, i) => {
    if (s.host) hostSlot[i] = hostCount++
  })

  const hairCap = new THREE.SphereGeometry(HEAD_R * 1.07, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5).rotateX(-0.45)
  const afro = new THREE.SphereGeometry(0.28, 12, 10).translate(0, 0.1, -0.09)
  const longHair = new THREE.CapsuleGeometry(0.16, 0.3, 3, 8).translate(0, -0.14, -0.1)
  const brim = new THREE.BoxGeometry(0.3, 0.025, 0.17).translate(0, 0.1, 0.2).rotateX(0.12)

  const meshes = {
    body: instanced(bodyGeometry(), shirtMaterial(patterns), n),
    upper: instanced(upperGeo, std(), n * 2),
    fore: instanced(foreGeo, std(), n * 2),
    hand: instanced(new THREE.SphereGeometry(0.072, 8, 6), std(), n * 2),
    head: instanced(new THREE.SphereGeometry(HEAD_R, 16, 12), std(), n),
    face: instanced(faceGeometry(n), faceMaterial(atlas.tex), n),
    short: instanced(hairCap, std(), slots.short.length),
    afro: instanced(afro, std(), slots.afro.length),
    long: instanced(longHair, std(), slots.long.length),
    brim: instanced(brim, std(), slots.brim.length),
    band: instanced(new THREE.TorusGeometry(0.235, 0.012, 6, 24, Math.PI), headsetMaterial(), hostCount),
    cup: instanced(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 14).rotateZ(Math.PI / 2), headsetMaterial(), hostCount * 2),
    boom: instanced(boomGeometry(), headsetMaterial(), hostCount),
    flash: instanced(new THREE.SphereGeometry(0.05, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), n),
  }

  const c = new THREE.Color()
  seats.forEach((s, i) => {
    meshes.body.setColorAt(i, s.shirt)
    meshes.head.setColorAt(i, s.skin)
    for (let a = 0; a < 2; a++) {
      meshes.upper.setColorAt(i * 2 + a, s.shirt)
      meshes.fore.setColorAt(i * 2 + a, s.tee ? s.skin : s.shirt)
      meshes.hand.setColorAt(i * 2 + a, s.skin)
    }
    const sh = slotOf[i * 4]
    if (sh >= 0) meshes.short.setColorAt(sh, s.hair === Hair.Beanie || s.hair === Hair.Cap ? s.hat : s.hairColor)
    const af = slotOf[i * 4 + 1]
    if (af >= 0) meshes.afro.setColorAt(af, s.hairColor)
    const lg = slotOf[i * 4 + 2]
    if (lg >= 0) meshes.long.setColorAt(lg, s.hairColor)
    const br = slotOf[i * 4 + 3]
    if (br >= 0) meshes.brim.setColorAt(br, c.copy(s.hat).multiplyScalar(0.8))
  })

  return { meshes, slotOf, hostSlot, atlas, patterns }
}

const REST = POSES[Mood.Neutral]
const tmp = new THREE.Matrix4()
const pos = new THREE.Vector3()
const quat = new THREE.Quaternion()
const scl = new THREE.Vector3()
const eul = new THREE.Euler()
const base = new THREE.Matrix4()
const head = new THREE.Matrix4()
const joint = new THREE.Matrix4()
const upper = new THREE.Matrix4()
const elbow = new THREE.Matrix4()
const out = new THREE.Matrix4()
const dummy = new THREE.Object3D()

function local(dst: THREE.Matrix4, parent: THREE.Matrix4, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, s = 1, sx = s, sy = s, sz = s, order: THREE.EulerOrder = 'XYZ') {
  eul.set(rx, ry, rz, order)
  tmp.compose(pos.set(x, y, z), quat.setFromEuler(eul), scl.set(sx, sy, sz))
  dst.multiplyMatrices(parent, tmp)
}

const HOST_LOOK_HOLD = [1.2, 1]
const HOST_LOOK_EVERY = [60, 120]

const PRIORITY = { block: 1, slip: 1, duck: 1, taunt: 2, hit: 2, knockdown: 3 }

export function Crowd({ director, reduced }: { director: FightDirector; reduced: boolean }) {
  const { meshes, slotOf, hostSlot, atlas, patterns } = useMemo(() => build(), [])
  const n = seats.length

  const st = useMemo(
    () => ({
      mood: new Uint8Array(n),
      base: new Uint8Array(n),
      pend: new Uint8Array(n),
      pendAt: new Float32Array(n).fill(-1),
      holdFor: new Float32Array(n),
      until: new Float32Array(n),
      prio: new Uint8Array(n),
      nextRoll: new Float32Array(n),
      energy: new Float32Array(n),
      arm: new Float32Array(n * 6),
      turn: new Float32Array(n),
      lookUntil: new Float32Array(n),
      nextLook: new Float32Array(n),
      lastSeq: 0,
      lastPhase: director.phase,
      shown: new Uint8Array(n).fill(255),
    }),
    [n, director],
  )

  useLayoutEffect(() => {
    for (let i = 0; i < n; i++) {
      st.base[i] = st.mood[i] = pick(seats[i].host ? HOST_IDLE_CALM : IDLE_CALM, Math.random())
      st.nextRoll[i] = Math.random() * 6
      st.nextLook[i] = 20 + Math.random() * 80
      for (let a = 0; a < 2; a++) st.arm.set([REST.out, REST.fwd, REST.bend], (i * 2 + a) * 3)
    }
  }, [n, st])

  useEffect(
    () => () => {
      for (const m of Object.values(meshes)) {
        m.geometry.dispose()
        ;(m.material as THREE.Material).dispose()
        m.dispose()
      }
      atlas.tex.dispose()
      patterns.dispose()
    },
    [meshes, atlas, patterns],
  )

  const trigger = (crowdR: Reaction, hostR: Reaction, who: number, t: number, prio: number) => {
    for (let i = 0; i < n; i++) {
      const s = seats[i]
      const r = s.host ? hostR : crowdR
      if (Math.random() > r.odds) continue
      if (t < st.until[i] && st.prio[i] > prio) continue
      const table = s.fan === 2 ? r.neutral : s.fan === who ? r.mine : r.theirs
      st.pend[i] = pick(table, Math.random())
      st.pendAt[i] = t + (s.host ? Math.random() * 0.06 : s.tier * 0.02 + Math.random() * 0.25)
      st.holdFor[i] = r.hold[0] + Math.random() * r.hold[1]
      st.prio[i] = prio
    }
  }

  const place = (t: number, dt: number) => {
    const fighting = director.phase === 'fighting'

    if (director.phase !== st.lastPhase) {
      if (director.phase === 'fighting') trigger(ROAR, HOST_ROAR, 0, t, 3)
      else if (st.lastPhase === 'fighting') trigger(APPLAUSE, HOST_APPLAUSE, 0, t, 3)
      st.lastPhase = director.phase
    }
    if (director.crowd.seq !== st.lastSeq) {
      st.lastSeq = director.crowd.seq
      const { kind, who } = director.crowd
      trigger(REACTIONS[kind], HOST_REACTIONS[kind], who, t, PRIORITY[kind])
    }

    const kEnergy = 1 - Math.exp(-6 * dt)
    const kTurn = 1 - Math.exp(-7 * dt)
    const kArm = reduced ? 1 : 1 - Math.exp(-9 * dt)
    const faceAttr = meshes.face.geometry.getAttribute('aFace') as THREE.InstancedBufferAttribute
    let faceDirty = false

    for (let i = 0; i < n; i++) {
      const s = seats[i]

      if (st.pendAt[i] >= 0 && t >= st.pendAt[i]) {
        st.mood[i] = st.pend[i]
        st.until[i] = t + st.holdFor[i]
        st.pendAt[i] = -1
      }
      if (t >= st.until[i]) st.mood[i] = st.base[i]
      if (t >= st.nextRoll[i]) {
        st.base[i] = pick(s.host ? (fighting ? HOST_IDLE : HOST_IDLE_CALM) : fighting ? IDLE : IDLE_CALM, Math.random())
        st.nextRoll[i] = t + (s.host ? 1.5 + Math.random() * 3 : 4 + Math.random() * 8)
      }
      let yaw = s.yaw
      if (s.host && !reduced) {
        if (t >= st.nextLook[i]) {
          st.lookUntil[i] = t + HOST_LOOK_HOLD[0] + Math.random() * HOST_LOOK_HOLD[1]
          st.nextLook[i] = st.lookUntil[i] + HOST_LOOK_EVERY[0] + Math.random() * HOST_LOOK_EVERY[1]
          st.mood[i] = pick(HOST_LOOK, Math.random())
          st.until[i] = st.lookUntil[i]
          st.prio[i] = 3
        }
        st.turn[i] += ((t < st.lookUntil[i] ? 1 : 0) - st.turn[i]) * kTurn
        yaw = Math.PI * (1 - st.turn[i])
      }
      const mood = st.mood[i] as MoodId
      if (st.shown[i] !== mood) {
        st.shown[i] = mood
        faceAttr.array[i] = mood
        faceDirty = true
      }

      const def = POSES[mood]
      st.energy[i] += ((reduced ? 0 : def.bounce) - st.energy[i]) * kEnergy
      const e = st.energy[i]
      const ex = s.host ? 1.8 : 1
      const bounce = Math.abs(Math.sin(t * 5.5 + s.phase)) * e * ex
      const calm = reduced ? 0 : 1

      dummy.position.set(s.x, s.y + bounce + Math.sin(t * 1.4 + s.phase) * 0.006 * calm, s.z)
      const lean = s.host ? Math.min(1, e * 9) * 0.14 * Math.sin(t * 5.5 + s.phase) * calm * Math.cos(yaw) : 0
      dummy.rotation.set(lean, yaw + Math.sin(t * 0.6 + s.phase) * 0.07 * calm, 0)
      dummy.updateMatrix()
      base.copy(dummy.matrix)

      local(out, base, 0, 0.5 * s.h, 0, 0, 0, 0, 1, 1.2 * s.w, s.h, 0.75 * s.w)
      meshes.body.setMatrixAt(i, out)

      const nod = Math.min(1, e * 10) * 0.16 * ex * Math.sin(t * 5.5 + s.phase) * calm
      local(head, base, 0, 1.15 * s.h, 0, nod, Math.sin(t * 0.5 + s.phase) * 0.3 * calm, Math.sin(t * 0.9 + s.phase) * 0.05 * calm, s.headScale)
      meshes.face.setMatrixAt(i, head)
      meshes.head.setMatrixAt(i, head)

      const ht = hostSlot[i]
      if (ht >= 0) {
        meshes.band.setMatrixAt(ht, head)
        meshes.boom.setMatrixAt(ht, head)
        for (let side = 0; side < 2; side++) {
          local(out, head, side ? 0.225 : -0.225, -0.01, 0)
          meshes.cup.setMatrixAt(ht * 2 + side, out)
        }
      }

      const hs = slotOf[i * 4]
      if (hs >= 0) {
        const big = s.hair === Hair.Beanie || s.hair === Hair.Cap ? 1.05 : 1
        local(out, head, 0, 0, 0, 0, 0, 0, big)
        meshes.short.setMatrixAt(hs, out)
      }
      const af = slotOf[i * 4 + 1]
      if (af >= 0) meshes.afro.setMatrixAt(af, head)
      const lg = slotOf[i * 4 + 2]
      if (lg >= 0) meshes.long.setMatrixAt(lg, head)
      const br = slotOf[i * 4 + 3]
      if (br >= 0) meshes.brim.setMatrixAt(br, head)

      for (let a = 0; a < 2; a++) {
        const side = a === 0 ? -1 : 1
        const active = s.arms === 0 || (s.arms === 1 && side === 1) || (s.arms === 2 && side === -1)
        const pose = active ? def : REST
        const j = (i * 2 + a) * 3
        st.arm[j] += (pose.out - st.arm[j]) * kArm
        st.arm[j + 1] += (pose.fwd - st.arm[j + 1]) * kArm
        st.arm[j + 2] += (pose.bend - st.arm[j + 2]) * kArm
        const wave = reduced || !active ? 0 : Math.sin(t * pose.rate + s.phase + side * 1.7) * pose.wave * ex

        local(joint, base, side * 0.25 * s.w, 0.8 * s.h, 0)
        local(upper, joint, 0, 0, 0, st.arm[j + 1] + wave * 0.15, 0, side * (st.arm[j] + wave * 0.35), 1, 1, 1, 1, 'ZXY')
        meshes.upper.setMatrixAt(i * 2 + a, upper)
        local(elbow, upper, 0, -UPPER, 0, st.arm[j + 2] + wave * 0.5)
        meshes.fore.setMatrixAt(i * 2 + a, elbow)
        local(out, elbow, 0, -FORE, 0)
        meshes.hand.setMatrixAt(i * 2 + a, out)
      }

      const on = !reduced && !s.host && Math.random() < 0.004
      dummy.position.set(s.x, s.y + 1.7 * s.h, s.z)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.setScalar(on ? 1 : 0)
      dummy.updateMatrix()
      dummy.scale.setScalar(1)
      meshes.flash.setMatrixAt(i, dummy.matrix)
    }

    if (faceDirty) faceAttr.needsUpdate = true
    for (const m of Object.values(meshes)) m.instanceMatrix.needsUpdate = true
  }

  useLayoutEffect(() => place(0, 0.016))
  useFrame(({ clock }, delta) => place(clock.elapsedTime, Math.min(delta, 0.05)))

  return (
    <group>
      {Object.entries(meshes).map(([k, m]) => (
        <primitive key={k} object={m} />
      ))}
    </group>
  )
}
