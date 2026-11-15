// Per-frame scene effects driven by the fight director: the director tick,
// impact sparks with a flash of light, the cinematic camera, and floor haze.
import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { Phase } from '../game/useRound'
import { MAT_Y, type Burst, type FightDirector } from './director'
import { dotTexture } from './textures'

/** Advances the director. Mount it first so robots read fresh state. */
export function DirectorTick({ director, phase }: { director: FightDirector; phase: Phase }) {
  useFrame((_, delta) => director.tick(delta, phase))
  return null
}

const MAX_SPARKS = 400

/** Ring buffer of spark particles with simple ballistic physics. */
class SparkField {
  readonly geo = new THREE.BufferGeometry()
  readonly tex = dotTexture()
  private pos = new Float32Array(MAX_SPARKS * 3).fill(-100)
  private col = new Float32Array(MAX_SPARKS * 3)
  private vel = new Float32Array(MAX_SPARKS * 3)
  private life = new Float32Array(MAX_SPARKS)
  private cursor = 0

  constructor() {
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3))
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3))
  }

  spawn(b: Burst) {
    const n = Math.round(40 * b.strength)
    for (let k = 0; k < n; k++) {
      const i = this.cursor
      this.cursor = (this.cursor + 1) % MAX_SPARKS
      this.pos.set([b.pos.x, b.pos.y, b.pos.z], i * 3)
      // spray forward from the punch, plus a wide random cone
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.9, Math.random() - 0.5)
        .normalize()
        .multiplyScalar(2 + Math.random() * 5 * b.strength)
        .addScaledVector(b.dir, 2.5)
      this.vel.set([v.x, v.y, v.z], i * 3)
      this.life[i] = 0.35 + Math.random() * 0.45
    }
  }

  step(dt: number) {
    for (let i = 0; i < MAX_SPARKS; i++) {
      if (this.life[i] <= 0) continue
      this.life[i] -= dt
      const j = i * 3
      this.vel[j + 1] -= 9.8 * dt
      this.pos[j] += this.vel[j] * dt
      this.pos[j + 1] += this.vel[j + 1] * dt
      this.pos[j + 2] += this.vel[j + 2] * dt
      if (this.pos[j + 1] < MAT_Y) {
        this.pos[j + 1] = MAT_Y
        this.vel[j + 1] *= -0.3
      }
      // white-hot fading to orange; values above 1 feed the bloom
      const heat = Math.max(0, this.life[i]) * 2.5
      this.col.set([1.8 * heat, 1 * heat, 0.35 * heat], j)
      if (this.life[i] <= 0) this.pos[j + 1] = -100
    }
    this.geo.attributes.position.needsUpdate = true
    this.geo.attributes.color.needsUpdate = true
  }
}

/** Fades a point light out after each impact flash. */
class ImpactFlash {
  private light: THREE.PointLight | null = null
  attach(l: THREE.PointLight | null) {
    this.light = l
  }
  fire(b: Burst) {
    if (!this.light) return
    this.light.position.copy(b.pos)
    this.light.intensity = 18 * b.strength
  }
  step(dt: number) {
    if (this.light) this.light.intensity *= Math.exp(-14 * dt)
  }
}

export function Sparks({ director }: { director: FightDirector }) {
  const field = useMemo(() => new SparkField(), [])
  const flash = useMemo(() => new ImpactFlash(), [])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    for (const b of director.bursts.splice(0)) {
      field.spawn(b)
      flash.fire(b)
    }
    field.step(dt)
    flash.step(dt)
  })

  return (
    <>
      <points geometry={field.geo} frustumCulled={false}>
        <pointsMaterial
          size={0.09}
          map={field.tex}
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>
      <pointLight ref={(l) => flash.attach(l)} color="#ffb060" intensity={0} distance={7} decay={2} />
    </>
  )
}

/** Slow broadcast drift; pushes in when the fight starts; shakes on impact. */
export function CameraRig({ director, phase, reduced }: { director: FightDirector; phase: Phase; reduced: boolean }) {
  const locked = phase === 'fighting'
  const camera = useThree((s) => s.camera)
  const look = useRef(new THREE.Vector3(0, 1.8, 0))
  const pos = useRef(new THREE.Vector3(0, 12, 17))
  const axisAz = useRef(0)

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime
    const dt = Math.min(delta, 0.05)
    const [a, b] = director.base
    const drift = reduced ? 0 : Math.sin(t * 0.08) * 0.28
    // during the fight, swing round so the fighters stay side-on instead of lined up along the lens
    if (locked) {
      let nx = -(b.z - a.z)
      let nz = b.x - a.x
      if (nz < 0) [nx, nz] = [-nx, -nz]
      const side = THREE.MathUtils.clamp(Math.atan2(nx, nz), -0.7, 0.7)
      if (Math.abs(side - axisAz.current) > 0.15) axisAz.current = THREE.MathUtils.damp(axisAz.current, side, 0.6, dt)
    } else axisAz.current = THREE.MathUtils.damp(axisAz.current, 0, 0.6, dt)
    const az = reduced ? 0 : axisAz.current * 0.85 + drift * (locked ? 0.4 : 1)
    const sep = Math.hypot(b.x - a.x, b.z - a.z)
    // high aerial over the arena before the bell, ringside once it starts
    const radius = locked ? 10 + THREE.MathUtils.clamp(sep - 2, 0, 1.5) : phase === 'rest' ? 13 : 16.5
    const height = locked ? 5.6 : phase === 'rest' ? 7.5 : 11.5
    const centre = locked ? 0.4 : 0
    const target = new THREE.Vector3(Math.sin(az) * radius + ((a.x + b.x) / 2) * centre, height, Math.cos(az) * radius + ((a.z + b.z) / 2) * centre)
    pos.current.lerp(target, 1 - Math.exp(-1.6 * dt))

    const mid = new THREE.Vector3((a.x + b.x) / 2, locked ? 3.1 : 1.8, (a.z + b.z) / 2)
    const punch = reduced ? 0 : director.punch
    mid.lerp(director.focus, punch * 0.5)
    look.current.lerp(mid, 1 - Math.exp(-3 * dt))

    // shake runs along the punch direction plus smooth noise, so it reads the same at any frame rate
    const shake = reduced ? 0 : director.shake * 0.12
    const along = Math.sin(t * 2 * Math.PI * 30) * shake * 0.6
    const nx = (Math.sin(t * 37.1) + Math.sin(t * 61.7 + 1.3)) * 0.25 * shake
    const ny = (Math.sin(t * 43.3 + 2.1) + Math.sin(t * 71.9)) * 0.25 * shake
    const toLook = new THREE.Vector3().subVectors(look.current, pos.current).normalize()
    camera.position.set(
      pos.current.x + director.kickDir.x * along + nx + toLook.x * punch * 1.4,
      pos.current.y + ny + toLook.y * punch * 1.4,
      pos.current.z + director.kickDir.z * along + toLook.z * punch * 1.4,
    )
    camera.lookAt(look.current)
  })
  return null
}
