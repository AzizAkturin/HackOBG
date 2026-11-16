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
import { APPLAUSE, HOST_APPLAUSE, HOST_IDLE, HOST_IDLE_CALM, HOST_LOOK, HOST_REACTIONS, HOST_ROAR, IDLE, IDLE_CALM, Mood, MOOD_COUNT, pick, POSES, REACTIONS, ROAR, type Allegiance, type MoodId, type Reaction } from './moods'

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


const REST = POSES[Mood.Neutral]
const TEX_W = 1024
const STATIC_STRIDE = 12
const STATE_STRIDE = 16

function dataTexture(texels: number) {
  const h = Math.ceil(texels / TEX_W)
  const tex = new THREE.DataTexture(new Float32Array(TEX_W * h * 4), TEX_W, h, THREE.RGBAFormat, THREE.FloatType)
  tex.minFilter = tex.magFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  tex.needsUpdate = true
  return tex
}

const armActive = (s: Seat, a: number) => s.arms === 0 || (s.arms === 1 && a === 1) || (s.arms === 2 && a === 0)
const ease = (from: number, target: number, k: number, dt: number) => target + (from - target) * Math.exp(-k * Math.max(dt, 0))

/** Seat constants plus per-seat easing state. The shader evaluates every body part's transform from these and the clock. */
const gpu = (() => {
  const staticTex = dataTexture(seats.length * 3)
  const sd = staticTex.image.data as Float32Array
  seats.forEach((s, i) => sd.set([s.x, s.y, s.z, s.host ? Math.PI : s.yaw, s.h, s.w, s.headScale, s.phase, s.host ? 1 : 0, s.arms, s.hair, 0], i * STATIC_STRIDE))
  const stateTex = dataTexture(seats.length * 4)
  return {
    staticTex,
    stateTex,
    state: stateTex.image.data as Float32Array,
    uniforms: {
      uTime: { value: 0 },
      uFrame: { value: 0 },
      uReduced: { value: 0 },
      uStatic: { value: staticTex },
      uState: { value: stateTex },
      uPoseA: { value: Array.from({ length: MOOD_COUNT }, (_, m) => new THREE.Vector4(POSES[m as MoodId].out, POSES[m as MoodId].fwd, POSES[m as MoodId].bend, POSES[m as MoodId].bounce)) },
      uPoseB: { value: Array.from({ length: MOOD_COUNT }, (_, m) => new THREE.Vector2(POSES[m as MoodId].rate, POSES[m as MoodId].wave)) },
    },
  }
})()

function resetState() {
  gpu.state.fill(0)
  for (let i = 0; i < seats.length; i++) for (let a = 0; a < 2; a++) gpu.state.set([REST.out, REST.fwd, REST.bend], i * STATE_STRIDE + 4 + a * 4)
  gpu.stateTex.needsUpdate = true
}

/** Freezes the easing at the moment of a mood change so the shader can continue from there. */
function setPose(i: number, prev: number, mood: MoodId, t: number, reduced: boolean) {
  const d = gpu.state
  const o = i * STATE_STRIDE
  if (prev !== 255) {
    const old = POSES[prev as MoodId]
    const dt = t - d[o + 1]
    d[o + 2] = ease(d[o + 2], reduced ? 0 : old.bounce, 6, dt)
    for (let a = 0; a < 2; a++) {
      const pose = armActive(seats[i], a) ? old : REST
      const k = o + 4 + a * 4
      d[k] = reduced ? pose.out : ease(d[k], pose.out, 9, dt)
      d[k + 1] = reduced ? pose.fwd : ease(d[k + 1], pose.fwd, 9, dt)
      d[k + 2] = reduced ? pose.bend : ease(d[k + 2], pose.bend, 9, dt)
    }
  }
  d[o] = mood
  d[o + 1] = t
}

const CROWD_GLSL = /* glsl */ `
uniform sampler2D uStatic;
uniform sampler2D uState;
uniform float uTime;
uniform float uFrame;
uniform float uReduced;
uniform vec4 uPoseA[${MOOD_COUNT}];
uniform vec2 uPoseB[${MOOD_COUNT}];
attribute vec3 aCrowd;

vec4 crowdTex(sampler2D tex, int i) { return texelFetch(tex, ivec2(i & ${TEX_W - 1}, i >> ${Math.log2(TEX_W)}), 0); }
float crowdEase(float from, float target, float k, float dt) { return target + (from - target) * exp(-k * max(dt, 0.0)); }

mat4 crowdLocal(mat4 parent, vec3 p, vec3 r, vec3 s, bool zxy) {
  float a = cos(r.x), b = sin(r.x), c = cos(r.y), d = sin(r.y), e = cos(r.z), f = sin(r.z);
  float m0, m1, m2, m4, m5, m6, m8, m9, m10;
  if (zxy) {
    float ce = c * e, cf = c * f, de = d * e, df = d * f;
    m0 = ce - df * b; m4 = -a * f; m8 = de + cf * b;
    m1 = cf + de * b; m5 = a * e; m9 = df - ce * b;
    m2 = -a * d; m6 = b; m10 = a * c;
  } else {
    float ae = a * e, af = a * f, be = b * e, bf = b * f;
    m0 = c * e; m4 = -c * f; m8 = d;
    m1 = af + be * d; m5 = ae - bf * d; m9 = -b * c;
    m2 = bf - ae * d; m6 = be + af * d; m10 = a * c;
  }
  mat4 m = mat4(m0, m1, m2, 0.0, m4, m5, m6, 0.0, m8, m9, m10, 0.0, 0.0, 0.0, 0.0, 1.0);
  m[0] *= s.x;
  m[1] *= s.y;
  m[2] *= s.z;
  m[3] = vec4(p, 1.0);
  return parent * m;
}

// parts: 1 body, 2 upper arm, 3 forearm, 4 hand, 5 head (and anything riding it), 6 hair cap, 7 headset cup, 8 phone flash
mat4 crowdMatrix(int seat, int part, int side) {
  vec4 s0 = crowdTex(uStatic, seat * 3);
  vec4 s1 = crowdTex(uStatic, seat * 3 + 1);
  vec4 s2 = crowdTex(uStatic, seat * 3 + 2);
  float t = uTime;
  float h = s1.x, w = s1.y, phase = s1.w;
  bool host = s2.x > 0.5;

  if (part == 8) {
    float r = fract(sin(dot(vec2(float(seat), mod(uFrame, 4096.0)), vec2(12.9898, 78.233))) * 43758.5453);
    float on = (uReduced < 0.5 && !host && r < 0.008) ? 1.0 : 0.0;
    return crowdLocal(mat4(1.0), vec3(s0.x, s0.y + 1.7 * h, s0.z), vec3(0.0), vec3(on), false);
  }

  vec4 m0 = crowdTex(uState, seat * 4);
  vec4 tn = crowdTex(uState, seat * 4 + 3);
  int mood = int(m0.x + 0.5);
  float dtc = t - m0.y;
  float calm = 1.0 - uReduced;
  float ex = host ? 1.8 : 1.0;
  float e = crowdEase(m0.z, uReduced > 0.5 ? 0.0 : uPoseA[mood].w, 6.0, dtc);
  float turn = crowdEase(tn.x, tn.y, 7.0, t - tn.z);
  float yaw = host ? 3.14159265 * (1.0 - turn) : s0.w;
  float beat = sin(t * 5.5 + phase);
  float lean = host ? min(1.0, e * 9.0) * 0.14 * beat * calm * cos(yaw) : 0.0;
  vec3 pos = vec3(s0.x, s0.y + abs(beat) * e * ex + sin(t * 1.4 + phase) * 0.006 * calm, s0.z);
  mat4 base = crowdLocal(mat4(1.0), pos, vec3(lean, yaw + sin(t * 0.6 + phase) * 0.07 * calm, 0.0), vec3(1.0), false);

  if (part == 1) return crowdLocal(base, vec3(0.0, 0.5 * h, 0.0), vec3(0.0), vec3(1.2 * w, h, 0.75 * w), false);

  if (part >= 5) {
    float nod = min(1.0, e * 10.0) * 0.16 * ex * beat * calm;
    mat4 head = crowdLocal(base, vec3(0.0, 1.15 * h, 0.0), vec3(nod, sin(t * 0.5 + phase) * 0.3 * calm, sin(t * 0.9 + phase) * 0.05 * calm), vec3(s1.z), false);
    if (part == 5) return head;
    if (part == 6) {
      int hair = int(s2.z + 0.5);
      return crowdLocal(head, vec3(0.0), vec3(0.0), vec3((hair == 4 || hair == 5) ? 1.05 : 1.0), false);
    }
    return crowdLocal(head, vec3(side == 1 ? 0.225 : -0.225, -0.01, 0.0), vec3(0.0), vec3(1.0), false);
  }

  float sd = side == 0 ? -1.0 : 1.0;
  int cfg = int(s2.y + 0.5);
  bool armLive = cfg == 0 || (cfg == 1 && side == 1) || (cfg == 2 && side == 0);
  vec4 pose = armLive ? uPoseA[mood] : uPoseA[0];
  vec4 af = crowdTex(uState, seat * 4 + 1 + side);
  float aOut = pose.x, aFwd = pose.y, aBend = pose.z;
  if (uReduced < 0.5) {
    aOut = crowdEase(af.x, pose.x, 9.0, dtc);
    aFwd = crowdEase(af.y, pose.y, 9.0, dtc);
    aBend = crowdEase(af.z, pose.z, 9.0, dtc);
  }
  float wave = (uReduced > 0.5 || !armLive) ? 0.0 : sin(t * uPoseB[mood].x + phase + sd * 1.7) * uPoseB[mood].y * ex;
  mat4 joint = crowdLocal(base, vec3(sd * 0.25 * w, 0.8 * h, 0.0), vec3(0.0), vec3(1.0), false);
  mat4 upper = crowdLocal(joint, vec3(0.0), vec3(aFwd + wave * 0.15, 0.0, sd * (aOut + wave * 0.35)), vec3(1.0), true);
  if (part == 2) return upper;
  mat4 elbow = crowdLocal(upper, vec3(0.0, -${UPPER.toFixed(3)}, 0.0), vec3(aBend + wave * 0.5, 0.0, 0.0), vec3(1.0), false);
  if (part == 3) return elbow;
  return crowdLocal(elbow, vec3(0.0, -${FORE.toFixed(3)}, 0.0), vec3(0.0), vec3(1.0), false);
}
`

interface CrowdShader {
  uniforms: Record<string, { value: unknown }>
  vertexShader: string
}

function applyCrowd(shader: CrowdShader) {
  Object.assign(shader.uniforms, gpu.uniforms)
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\n${CROWD_GLSL}`)
    .replace('void main() {', 'void main() {\nmat4 crowdM = aCrowd.y > 0.5 ? crowdMatrix(int(aCrowd.x + 0.5), int(aCrowd.y + 0.5), int(aCrowd.z + 0.5)) : mat4(1.0);')
    .replace(
      '#include <beginnormal_vertex>',
      `#include <beginnormal_vertex>
{
  mat3 cm = mat3(crowdM);
  objectNormal = cm * (objectNormal / max(vec3(dot(cm[0], cm[0]), dot(cm[1], cm[1]), dot(cm[2], cm[2])), 1e-8));
}`,
    )
    .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed = (crowdM * vec4(transformed, 1.0)).xyz;')
}

/** Spectator transforms come from the shader, so anything that draws them with its own material has to run this too. */
function crowdPatch<M extends THREE.Material>(mat: M, key: string): M {
  const prev = mat.onBeforeCompile
  mat.onBeforeCompile = (shader, renderer) => {
    prev.call(mat, shader, renderer)
    applyCrowd(shader)
  }
  mat.customProgramCacheKey = () => `crowd-${key}`
  return mat
}

/** The SSAO normal pass draws the scene with one override material, so it needs the crowd animation too. */
export function patchCrowdNormals(mat: THREE.Material) {
  mat.onBeforeCompile = (shader) => applyCrowd(shader)
  mat.customProgramCacheKey = () => 'crowd-normals'
  mat.needsUpdate = true
}

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
  return crowdPatch(mat, 'face')
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
  return crowdPatch(mat, 'shirt')
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
  return crowdPatch(new THREE.MeshStandardMaterial({ color: '#0a0a0c', roughness: 0.45, metalness: 0.35 }), 'std')
}

function build() {
  const n = seats.length
  const std = () => crowdPatch(new THREE.MeshStandardMaterial({ roughness: 1 }), 'std')
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
    flash: instanced(new THREE.SphereGeometry(0.05, 6, 4), crowdPatch(new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), 'basic'), n),
  }

  const hostSeats = seats.flatMap((s, i) => (s.host ? [i] : []))
  const identity = new THREE.Matrix4()
  const tag = (m: THREE.InstancedMesh, part: number, seat: (k: number) => number, side: (k: number) => number = () => 0) => {
    const a = new Float32Array(Math.max(1, m.count) * 3)
    for (let k = 0; k < m.count; k++) {
      a.set([seat(k), part, side(k)], k * 3)
      m.setMatrixAt(k, identity)
    }
    m.geometry.setAttribute('aCrowd', new THREE.InstancedBufferAttribute(a, 3))
  }
  const own = (k: number) => k
  const pair = (k: number) => k >> 1
  const odd = (k: number) => k & 1
  tag(meshes.body, 1, own)
  tag(meshes.upper, 2, pair, odd)
  tag(meshes.fore, 3, pair, odd)
  tag(meshes.hand, 4, pair, odd)
  tag(meshes.head, 5, own)
  tag(meshes.face, 5, own)
  tag(meshes.short, 6, (k) => slots.short[k])
  tag(meshes.afro, 5, (k) => slots.afro[k])
  tag(meshes.long, 5, (k) => slots.long[k])
  tag(meshes.brim, 5, (k) => slots.brim[k])
  tag(meshes.band, 5, (k) => hostSeats[k])
  tag(meshes.cup, 7, (k) => hostSeats[k >> 1], odd)
  tag(meshes.boom, 5, (k) => hostSeats[k])
  tag(meshes.flash, 8, own)

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

  return { meshes, atlas, patterns }
}

const HOST_LOOK_HOLD = [1.2, 1]
const HOST_LOOK_EVERY = [60, 120]

const PRIORITY = { block: 1, slip: 1, duck: 1, taunt: 2, hit: 2, knockdown: 3 }

export function Crowd({ director, reduced }: { director: FightDirector; reduced: boolean }) {
  const { meshes, atlas, patterns } = useMemo(() => build(), [])
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
      nextLook: new Float32Array(n),
      lookUntil: new Float32Array(n),
      lastSeq: 0,
      lastPhase: director.phase,
      shown: new Uint8Array(n).fill(255),
    }),
    [n, director],
  )

  useLayoutEffect(() => {
    resetState()
    st.shown.fill(255)
    gpu.uniforms.uReduced.value = reduced ? 1 : 0
    for (let i = 0; i < n; i++) {
      st.base[i] = st.mood[i] = pick(seats[i].host ? HOST_IDLE_CALM : IDLE_CALM, Math.random())
      st.nextRoll[i] = Math.random() * 6
      st.nextLook[i] = 20 + Math.random() * 80
    }
  }, [n, st, reduced])

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

  const place = (t: number) => {
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

    const state = gpu.state
    const faceAttr = meshes.face.geometry.getAttribute('aFace') as THREE.InstancedBufferAttribute
    let faceDirty = false
    let stateDirty = false

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
      if (s.host) {
        if (!reduced && t >= st.nextLook[i]) {
          st.lookUntil[i] = t + HOST_LOOK_HOLD[0] + Math.random() * HOST_LOOK_HOLD[1]
          st.nextLook[i] = st.lookUntil[i] + HOST_LOOK_EVERY[0] + Math.random() * HOST_LOOK_EVERY[1]
          st.mood[i] = pick(HOST_LOOK, Math.random())
          st.until[i] = st.lookUntil[i]
          st.prio[i] = 3
        }
        const o = i * STATE_STRIDE
        const target = t < st.lookUntil[i] ? 1 : 0
        if (state[o + 13] !== target) {
          state[o + 12] = ease(state[o + 12], state[o + 13], 7, t - state[o + 14])
          state[o + 13] = target
          state[o + 14] = t
          stateDirty = true
        }
      }
      const mood = st.mood[i] as MoodId
      if (st.shown[i] !== mood) {
        setPose(i, st.shown[i], mood, t, reduced)
        st.shown[i] = mood
        faceAttr.array[i] = mood
        faceDirty = true
        stateDirty = true
      }
    }

    if (faceDirty) faceAttr.needsUpdate = true
    if (stateDirty) gpu.stateTex.needsUpdate = true
  }

  useLayoutEffect(() => place(0), [st, reduced])
  useFrame(({ clock }) => {
    gpu.uniforms.uTime.value = clock.elapsedTime
    gpu.uniforms.uFrame.value = (gpu.uniforms.uFrame.value + 1) % 4096
    place(clock.elapsedTime)
  })

  return (
    <group>
      {Object.entries(meshes).map(([k, m]) => (
        <primitive key={k} object={m} />
      ))}
    </group>
  )
}
