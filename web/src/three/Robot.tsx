import { useCursor } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import type { Brand } from '../data/brands'
import { MAT_Y, ROBOT_SCALE, type FightDirector } from './director'
import { blendPose, GUARD, type Pose } from './moves'
import { ARM_UPPER, TORSO_Y, type Chassis, type Finish } from './robots/chassis'
import { firmwareMaterial, type Firmware } from './robots/firmware'
import { mergeParts, type MatKey, type Merged } from './robots/parts'
import { applyWear, markHits, type WearUniforms } from './robots/wear'
import { brushedTextures, chestTexture, dotTexture, grimeTexture, hazardTexture, noiseTexture, panelNormalTexture, wearMaskTexture } from './textures'

export type RobotDriver = Pick<FightDirector, 'base' | 'speed' | 'pose' | 'hurt' | 'damage'>

export interface RobotProps {
  index: number
  brand: Brand
  chassis: Chassis
  firmware: Firmware
  number: number
  director: RobotDriver
  selected: boolean
  locked: boolean
  reduced: boolean
  onSelect: () => void
}

type V3 = [number, number, number]

interface Built {
  pelvis: Merged
  torso: Merged
  head: Merged
  shoulder: [Merged, Merged]
  elbow: [Merged, Merged]
  thigh: Merged
  knee: Merged
  foot: Merged
  wheel: Merged
  core: Core
}

interface Core {
  p: THREE.Vector3
  q: THREE.Quaternion
  r: number
}

const UNLIT = new Set<MatKey>(['eye', 'fw', 'pip1', 'pip2', 'pip3'])

// sits the core on whatever torso surface faces forward at chest height
function findCore(torso: Merged): Core {
  const meshes = torso.filter(([k]) => !UNLIT.has(k)).map(([, g]) => new THREE.Mesh(g))
  const box = new THREE.Box3()
  for (const m of meshes) box.expandByObject(m)
  const size = box.getSize(new THREE.Vector3())
  const y = box.min.y + size.y * 0.6
  const hit = new THREE.Raycaster(new THREE.Vector3(0, y, box.max.z + 1), new THREE.Vector3(0, 0, -1)).intersectObjects(meshes)[0]
  const normal = hit?.face?.normal.clone() ?? new THREE.Vector3(0, 0, 1)
  return {
    p: hit ? hit.point : new THREE.Vector3(0, y, box.max.z),
    q: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal),
    r: THREE.MathUtils.clamp(size.x * 0.085, 0.045, 0.085),
  }
}

const built = new WeakMap<Chassis, Built>()

function geometryFor(c: Chassis): Built {
  let b = built.get(c)
  if (!b) {
    const rear = c.rearArm ?? c.arm
    const lead = mergeParts(c.arm.shoulder)
    const leadElbow = mergeParts(c.arm.elbow)
    const torso = mergeParts(c.torso)
    b = {
      pelvis: mergeParts(c.pelvis),
      torso,
      head: mergeParts(c.head),
      shoulder: [lead, c.rearArm ? mergeParts(rear.shoulder) : lead],
      elbow: [leadElbow, c.rearArm ? mergeParts(rear.elbow) : leadElbow],
      thigh: mergeParts(c.leg?.thigh ?? []),
      knee: mergeParts(c.leg?.knee ?? []),
      foot: mergeParts(c.leg?.foot ?? []),
      wheel: mergeParts(c.wheel ?? []),
      core: findCore(torso),
    }
    const none = () => 0
    for (const g of [b.pelvis, b.thigh, b.knee, b.foot, b.wheel, ...b.shoulder]) markHits(g, none)
    markHits(b.head, (_, n) => 0.6 + 0.4 * n.z)
    markHits(b.torso, (_, n) => n.z)
    for (const g of b.elbow) markHits(g, (p) => THREE.MathUtils.smoothstep(-p.y, 0.6, 0.75))
    built.set(c, b)
  }
  return b
}

const PIP_OFF = new THREE.MeshStandardMaterial({ color: '#151619', metalness: 0.3, roughness: 0.25 })
const MIRROR: V3 = [-1, 1, 1]
const CORE_LIGHT = 0.35

let shared: { noise: THREE.Texture; hazard: THREE.Texture; panel: THREE.Texture; brushed: ReturnType<typeof brushedTextures> } | undefined

function paint(brand: Brand, finish: Finish, number: number, seed: number) {
  shared ??= { noise: noiseTexture(), hazard: hazardTexture(), panel: panelNormalTexture(), brushed: brushedTextures() }
  const { noise, hazard, panel, brushed } = shared
  const grime = finish.grime ? grimeTexture(seed) : null
  const wearMask = wearMaskTexture(seed * 7 + 3)
  const wear: WearUniforms = { uDamage: { value: 0 }, uBase: { value: finish.grime ? 0.3 : 0.12 }, uRust: { value: finish.grime ? 1 : 0 } }
  const coat = (color: string, extra: number, clearcoat: number) => {
    const m = new THREE.MeshPhysicalMaterial({
      color,
      map: grime,
      metalness: finish.metalness,
      roughness: THREE.MathUtils.clamp(brand.roughness + finish.roughness + extra, 0.05, 1),
      roughnessMap: noise,
      normalMap: panel,
      normalScale: new THREE.Vector2(0.7, 0.7),
      clearcoat,
      clearcoatRoughness: 0.06,
      clearcoatNormalMap: panel,
      clearcoatNormalScale: new THREE.Vector2(0.3, 0.3),
    })
    applyWear(m, wearMask, wear, { chip: 1, scuff: 1, drip: 0.8 })
    return m
  }
  const metal = (color: string, metalness: number, roughness: number) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness, roughnessMap: brushed.roughness, normalMap: brushed.normal, normalScale: new THREE.Vector2(0.5, 0.5) })
  const mech = metal(brand.gear, 0.92, 0.5)
  mech.map = grime
  applyWear(mech, wearMask, wear, { chip: 0, scuff: 0.7, drip: 1.6 })
  return {
    armor: coat(brand.primary, 0, finish.clearcoat),
    trim: coat(brand.secondary, 0.06, finish.clearcoat * 0.6),
    mech,
    chrome: metal('#c9ccd2', 1, 0.2),
    dark: new THREE.MeshStandardMaterial({ color: '#0c0c0e', metalness: 0.5, roughness: 0.55, normalMap: panel, normalScale: new THREE.Vector2(0.4, 0.4) }),
    rubber: new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.85 }),
    hazard: new THREE.MeshStandardMaterial({ map: hazard, metalness: 0.3, roughness: 0.7 }),
    rivet: metal('#8d9096', 1, 0.4),
    eye: new THREE.MeshStandardMaterial({ color: brand.glow, emissive: brand.glow, emissiveIntensity: 2.4, toneMapped: false }),
    chest: new THREE.MeshPhysicalMaterial({
      map: chestTexture(brand.secondary, brand.primary, number),
      metalness: 0.4,
      roughness: brand.roughness + 0.05,
      clearcoat: 0.5,
      clearcoatRoughness: 0.08,
    }),
    core: new THREE.MeshStandardMaterial({ color: '#000', emissive: brand.glow, emissiveIntensity: 3, toneMapped: false }),
    grime,
    wearMask,
    wear,
  }
}

function Slot({ geo, mats }: { geo: Merged; mats: Record<MatKey, THREE.Material> }) {
  return geo.map(([k, g]) => <mesh key={k} geometry={g} material={mats[k]} castShadow={!UNLIT.has(k)} receiveShadow={!UNLIT.has(k)} />)
}

export function Robot({ index, brand, chassis, firmware, number, director, selected, locked, reduced, onSelect }: RobotProps) {
  const [hovered, setHovered] = useState(false)
  useCursor(hovered && !locked)

  const root = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const upper = useRef<THREE.Group>(null)
  const torso = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const wheel = useRef<THREE.Group>(null)
  const thighs = useRef<(THREE.Group | null)[]>([])
  const knees = useRef<(THREE.Group | null)[]>([])
  const feet = useRef<(THREE.Group | null)[]>([])
  const shoulders = useRef<(THREE.Group | null)[]>([])
  const elbows = useRef<(THREE.Group | null)[]>([])
  const ring = useRef<THREE.Mesh>(null)
  const coreLight = useRef<THREE.PointLight>(null)
  const halo = useRef<THREE.Mesh>(null)
  const glow = useRef(0)
  const haloMap = useMemo(() => dotTexture(), [])
  const pose = useRef<Pose>({ ...GUARD })
  const stride = useRef(0)

  const { rig } = chassis
  const geo = geometryFor(chassis)

  const coat = useMemo(() => paint(brand, chassis.finish, number, index * 31 + 7), [brand, chassis.finish, number, index])
  const lights = useMemo(() => firmwareMaterial(firmware), [firmware])
  useEffect(
    () => () => {
      const { grime, wearMask, wear: _, ...mats } = coat
      for (const m of Object.values(mats)) m.dispose()
      grime?.dispose()
      wearMask.dispose()
      coat.chest.map?.dispose()
    },
    [coat],
  )
  useEffect(() => () => lights.dispose(), [lights])

  const mats = useMemo<Record<MatKey, THREE.Material>>(() => {
    const { grime: _g, wearMask: _m, wear: _w, core: _c, ...paints } = coat
    return {
      ...paints,
      fw: lights,
      pip1: lights,
      pip2: firmware.pips >= 2 ? lights : PIP_OFF,
      pip3: firmware.pips >= 3 ? lights : PIP_OFF,
    }
  }, [coat, lights, firmware.pips])

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime
    lights.userData.time.value = t
    lights.color.lerpColors(lights.userData.base, lights.userData.flash, director.hurt[index])
    const damage = director.damage[index]
    coat.wear.uDamage.value = damage
    // the core browns out on a hit and stutters more as damage builds
    const flicker = Math.sin(Math.floor(t * 14) * 12.9898 + index) * 0.5 + 0.5
    const brownout = director.hurt[index] > 0.4 || flicker < damage * 0.35 ? 0.2 : 1
    const power = (0.85 + 0.15 * Math.sin(t * 2.4 + index * 2)) * brownout
    coat.core.emissiveIntensity = 3 * power
    if (coreLight.current) coreLight.current.intensity = CORE_LIGHT * power
    const r = root.current
    if (!r) return
    const base = director.base[index]
    r.position.set(base.x, MAT_Y, base.z)
    r.rotation.y = base.rotY

    // ease toward the director's pose so moves blend into each other
    const target = director.pose(index, t)
    pose.current = blendPose(pose.current, target, 1 - Math.exp(-(reduced ? 6 : 16) * delta))
    const p = pose.current
    const bob = reduced ? 0 : Math.sin(t * 3.2 + index * 1.7) * 0.025
    const sway = reduced ? 0 : Math.sin(t * 3.2 + index) * 0.05

    const drop = Math.max(0, p.drop + bob)
    if (body.current) {
      body.current.position.set(p.side, 0, p.fwd)
      body.current.rotation.x = p.fall
    }
    const speed = director.speed[index]
    if (rig.wheel) {
      if (upper.current) upper.current.position.y = rig.hip - drop * 0.4
      stride.current += (speed * delta) / (rig.wheel * ROBOT_SCALE * rig.scale)
      wheel.current?.rotation.set(stride.current, 0, 0)
    } else {
      if (upper.current) upper.current.position.y = rig.hip - drop
      // keep feet planted: thigh forward, shin back, foot flat
      const k = Math.acos(THREE.MathUtils.clamp(1 - drop / rig.hip, -1, 1))
      stride.current += speed * delta * 3.2
      const amount = Math.min(1, speed / 1.5) * 0.45
      for (const leg of [0, 1]) {
        const swing = Math.sin(stride.current + leg * Math.PI) * amount
        const lift = Math.max(0, -swing) * 1.4
        thighs.current[leg]?.position.setY(rig.hip - drop)
        thighs.current[leg]?.rotation.set(-k + swing, 0, 0)
        knees.current[leg]?.rotation.set(2 * k + lift, 0, 0)
        feet.current[leg]?.rotation.set(-k - swing - lift, 0, 0)
      }
    }
    torso.current?.rotation.set(p.pitch, p.yaw, p.roll)
    head.current?.rotation.set(p.headPitch, p.headYaw - p.yaw * 0.6, 0)

    const arms: [V3, number][] = [
      [p.lead, p.leadElbow],
      [p.rear, p.rearElbow],
    ]
    arms.forEach(([s, e], a) => {
      // rear arm is the mirror image of the lead arm
      const mirror = a === 0 ? 1 : -1
      shoulders.current[a]?.rotation.set(s[0] + sway * (a ? -1 : 1), s[1] * mirror, s[2] * mirror)
      elbows.current[a]?.rotation.set(e - sway, 0, 0)
    })

    const glowTarget = selected ? 0.7 + Math.sin(t * 4) * 0.3 : hovered && !locked ? 1 : 0
    glow.current = THREE.MathUtils.damp(glow.current, glowTarget, 10, delta)
    if (ring.current) (ring.current.material as THREE.MeshBasicMaterial).opacity = Math.min(1, glow.current * 0.9)
    if (halo.current) (halo.current.material as THREE.MeshBasicMaterial).opacity = glow.current * 0.55
  })

  const pointer = {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      setHovered(true)
    },
    onPointerOut: () => setHovered(false),
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      if (!locked) onSelect()
    },
  }

  // rear limbs reuse the lead geometry under a negative x scale
  const leg = (i: 0 | 1): ReactNode => (
    <group key={i} ref={(g) => { thighs.current[i] = g }} position={[i === 0 ? rig.hipX : -rig.hipX, rig.hip, i === 0 ? 0.14 : -0.14]}>
      <group scale={i === 0 ? 1 : MIRROR}>
        <Slot geo={geo.thigh} mats={mats} />
        <group ref={(g) => { knees.current[i] = g }} position={[0, -rig.thigh, 0]}>
          <Slot geo={geo.knee} mats={mats} />
          <group ref={(g) => { feet.current[i] = g }} position={[0, rig.thigh - rig.hip, 0]}>
            <Slot geo={geo.foot} mats={mats} />
          </group>
        </group>
      </group>
    </group>
  )

  const arm = (a: 0 | 1): ReactNode => {
    const [x, y, z] = rig.shoulder
    return (
      <group key={a} ref={(g) => { shoulders.current[a] = g }} position={[a === 0 ? x : -x, y, z]}>
        <group scale={a === 0 ? 1 : MIRROR}>
          <Slot geo={geo.shoulder[a]} mats={mats} />
          <group ref={(g) => { elbows.current[a] = g }} position={[0, -ARM_UPPER, 0]}>
            <Slot geo={geo.elbow[a]} mats={mats} />
          </group>
        </group>
      </group>
    )
  }

  return (
    <group ref={root} {...pointer}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <ringGeometry args={[0.95, 1.1, 48]} />
        <meshBasicMaterial color={brand.glow} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={halo} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <planeGeometry args={[3.4, 3.4]} />
        <meshBasicMaterial map={haloMap} color={brand.glow} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>

      <group scale={ROBOT_SCALE * rig.scale}>
        <group ref={body}>
          {rig.wheel ? (
            <group ref={wheel} position={[0, rig.wheel, 0]}>
              <Slot geo={geo.wheel} mats={mats} />
            </group>
          ) : (
            <>
              {leg(0)}
              {leg(1)}
            </>
          )}
          <group ref={upper} position={[0, rig.hip, 0]}>
            <Slot geo={geo.pelvis} mats={mats} />
            <group ref={torso} position={[0, TORSO_Y, 0]}>
              <Slot geo={geo.torso} mats={mats} />
              <group position={geo.core.p} quaternion={geo.core.q}>
                <mesh rotation-x={Math.PI / 2} material={coat.core}>
                  <cylinderGeometry args={[geo.core.r * 0.72, geo.core.r * 0.72, 0.03, 24]} />
                </mesh>
                <mesh material={coat.dark} castShadow>
                  <torusGeometry args={[geo.core.r * 0.85, geo.core.r * 0.22, 10, 28]} />
                </mesh>
                <pointLight ref={coreLight} color={brand.glow} intensity={CORE_LIGHT} distance={2.5} decay={2} position={[0, 0, 0.3]} />
              </group>
              <group ref={head} position={rig.neck}>
                <Slot geo={geo.head} mats={mats} />
              </group>
              {arm(0)}
              {arm(1)}
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}
