// Per-frame scene effects driven by the fight director: the director tick,
// impact sparks with a flash of light, the cinematic camera, and floor haze.
import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { Phase } from '../game/arenaPhase'
import { MAT_Y, type Burst, type FightDirector } from './director'
import { dotTexture } from './textures'

/** Advances the director. Mount it first so robots read fresh state. */
export function DirectorTick({ director, phase }: { director: FightDirector; phase: Phase }) {
  useFrame(({ clock }, delta) => director.update(clock.elapsedTime, Math.min(delta, 0.05), phase))
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

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime
    const dt = Math.min(delta, 0.05)
    const az = reduced ? 0 : Math.sin(t * 0.08) * 0.28
    // high aerial over the arena before the bell, ringside once it starts
    const radius = locked ? 10 : phase === 'rest' ? 13 : 16.5
    const height = locked ? 5.6 : phase === 'rest' ? 7.5 : 11.5
    const target = new THREE.Vector3(Math.sin(az) * radius, height, Math.cos(az) * radius)
    pos.current.lerp(target, 1 - Math.exp(-1.6 * dt))

    const mid = new THREE.Vector3((director.base[0].x + director.base[1].x) / 2, locked ? 3.1 : 1.8, (director.base[0].z + director.base[1].z) / 2)
    look.current.lerp(mid, 1 - Math.exp(-3 * dt))

    const shake = reduced ? 0 : director.shake * 0.12
    camera.position.set(
      pos.current.x + (Math.random() - 0.5) * shake,
      pos.current.y + (Math.random() - 0.5) * shake,
      pos.current.z,
    )
    camera.lookAt(look.current)
  })
  return null
}
