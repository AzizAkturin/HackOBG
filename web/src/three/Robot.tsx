// An original heavyweight boxing robot, built from primitives and painted in
// its model's brand colours. A full rig (hips, knees, torso, head, shoulders,
// elbows) is posed every frame from the fight director's move library.
import { RoundedBox, useCursor } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import type { Brand } from '../data/brands'
import type { RobotBuild } from './builds'
import { MAT_Y, ROBOT_SCALE, type FightDirector } from './director'
import { blendPose, GUARD, type Pose } from './moves'
import { chestTexture, grimeTexture, hazardTexture, noiseTexture } from './textures'

export interface RobotProps {
  index: number
  brand: Brand
  build: RobotBuild
  number: number
  director: FightDirector
  selected: boolean
  locked: boolean
  reduced: boolean
  onSelect: () => void
}

const HIP_H = 1.45
const THIGH = 0.72
const SHIN = 0.73

type V3 = [number, number, number]
type Mat = THREE.Material

function Box({ size, r = 0.06, p, rot, m }: { size: V3; r?: number; p?: V3; rot?: V3; m: Mat }) {
  return <RoundedBox args={size} radius={r} smoothness={4} position={p} rotation={rot} material={m} castShadow receiveShadow />
}

function Cyl({ r, h, p, rot, m, seg = 24, r2 }: { r: number; h: number; p?: V3; rot?: V3; m: Mat; seg?: number; r2?: number }) {
  return (
    <mesh position={p} rotation={rot} material={m} castShadow receiveShadow>
      <cylinderGeometry args={[r2 ?? r, r, h, seg]} />
    </mesh>
  )
}

function Ball({ r, p, s, m }: { r: number; p?: V3; s?: V3; m: Mat }) {
  return (
    <mesh position={p} scale={s} material={m} castShadow receiveShadow>
      <sphereGeometry args={[r, 32, 20]} />
    </mesh>
  )
}

function Ring({ r, tube, p, rot, m }: { r: number; tube: number; p?: V3; rot?: V3; m: Mat }) {
  return (
    <mesh position={p} rotation={rot} material={m} castShadow>
      <torusGeometry args={[r, tube, 12, 32]} />
    </mesh>
  )
}

/** A hose between two points, sagging slightly. */
function Cable({ from, to, m, sag = 0.08 }: { from: V3; to: V3; m: Mat; sag?: number }) {
  const geo = useMemo(() => {
    const a = new THREE.Vector3(...from)
    const b = new THREE.Vector3(...to)
    const mid = a.clone().add(b).multiplyScalar(0.5)
    mid.y -= sag
    return new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 12, 0.025, 8)
  }, [from, to, sag])
  return <mesh geometry={geo} material={m} castShadow />
}

export function Robot({ index, brand, build, number, director, selected, locked, reduced, onSelect }: RobotProps) {
  const [hovered, setHovered] = useState(false)
  useCursor(hovered && !locked)

  const root = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const upper = useRef<THREE.Group>(null)
  const torso = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const thighs = useRef<(THREE.Group | null)[]>([])
  const knees = useRef<(THREE.Group | null)[]>([])
  const feet = useRef<(THREE.Group | null)[]>([])
  const shoulders = useRef<(THREE.Group | null)[]>([])
  const elbows = useRef<(THREE.Group | null)[]>([])
  const ring = useRef<THREE.Mesh>(null)
  const pose = useRef<Pose>({ ...GUARD })
  const stride = useRef(0)

  const m = useMemo(() => {
    const rough = noiseTexture()
    const grime = grimeTexture(index * 31 + 7)
    const paint = (color: string, extra = 0) =>
      new THREE.MeshPhysicalMaterial({
        color,
        map: grime,
        metalness: 0.5,
        roughness: brand.roughness + extra,
        roughnessMap: rough,
        clearcoat: 0.6,
        clearcoatRoughness: 0.3,
      })
    return {
      armor: paint(brand.primary),
      trim: paint(brand.secondary, 0.06),
      mech: new THREE.MeshStandardMaterial({ color: '#2b2c30', map: grime, metalness: 0.92, roughness: 0.45, roughnessMap: rough }),
      chrome: new THREE.MeshStandardMaterial({ color: '#c9ccd2', metalness: 1, roughness: 0.16 }),
      dark: new THREE.MeshStandardMaterial({ color: '#0c0c0e', metalness: 0.5, roughness: 0.55 }),
      rubber: new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.85 }),
      hazard: new THREE.MeshStandardMaterial({ map: hazardTexture(), metalness: 0.3, roughness: 0.7 }),
      rivet: new THREE.MeshStandardMaterial({ color: '#8d9096', metalness: 1, roughness: 0.35 }),
      glow: new THREE.MeshStandardMaterial({ color: brand.glow, emissive: brand.glow, emissiveIntensity: 2.4, toneMapped: false }),
      chest: new THREE.MeshPhysicalMaterial({
        map: chestTexture(brand.secondary, brand.primary, number),
        metalness: 0.4,
        roughness: brand.roughness + 0.05,
        clearcoat: 0.5,
      }),
    }
  }, [brand, number, index])

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime
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
    if (upper.current) upper.current.position.y = HIP_H - drop
    // keep feet planted: thigh forward, shin back, foot flat
    const k = Math.acos(THREE.MathUtils.clamp(1 - drop / HIP_H, -1, 1))
    // walk cycle: legs swing in opposition, scaled by ground speed
    const speed = director.speed[index]
    stride.current += speed * delta * 3.2
    const amount = Math.min(1, speed / 1.5) * 0.45
    for (const leg of [0, 1]) {
      const swing = Math.sin(stride.current + leg * Math.PI) * amount
      const lift = Math.max(0, -swing) * 1.4
      thighs.current[leg]?.position.setY(HIP_H - drop)
      thighs.current[leg]?.rotation.set(-k + swing, 0, 0)
      knees.current[leg]?.rotation.set(2 * k + lift, 0, 0)
      feet.current[leg]?.rotation.set(-k - swing - lift, 0, 0)
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

    if (ring.current) {
      const mat = ring.current.material as THREE.MeshBasicMaterial
      mat.opacity = selected ? 0.6 + Math.sin(t * 4) * 0.25 : hovered && !locked ? 0.3 : 0
    }
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

  const leg = (i: 0 | 1): ReactNode => {
    const x = (i === 0 ? 0.36 : -0.36) * Math.sqrt(build.bulk)
    const z = i === 0 ? 0.14 : -0.14 // lead leg forward
    const out = i === 0 ? 1 : -1
    return (
      <group key={i} ref={(g) => { thighs.current[i] = g }} position={[x, HIP_H, z]}>
        <Ball r={0.19} m={m.mech} />
        <Cyl r={0.15} h={0.62} p={[0, -0.36, 0]} m={m.mech} />
        <Box size={[0.46, 0.52, 0.52]} r={0.17} p={[0, -0.32, 0.03]} m={m.armor} />
        <Box size={[0.48, 0.07, 0.54]} r={0.03} p={[0, -0.1, 0.03]} m={m.trim} />
        <Cyl r={0.035} h={0.55} p={[0.24 * out, -0.36, -0.16]} m={m.chrome} seg={10} />
        <Cyl r={0.06} h={0.18} p={[0.24 * out, -0.15, -0.16]} m={m.mech} seg={10} />
        <group ref={(g) => { knees.current[i] = g }} position={[0, -THIGH, 0]}>
          <Ball r={0.18} m={m.mech} />
          <Box size={[0.32, 0.28, 0.16]} r={0.07} p={[0, 0.02, 0.2]} m={m.trim} />
          <Box size={[0.46, 0.64, 0.5]} r={0.17} p={[0, -0.37, 0.02]} m={m.armor} />
          <Box size={[0.3, 0.3, 0.03]} r={0.01} p={[0, -0.36, 0.27]} m={m.hazard} />
          {[-0.17, -0.55].map((y) => (
            <Box key={y} size={[0.34, 0.04, 0.04]} r={0.015} p={[0, y, 0.27]} m={m.dark} />
          ))}
          {[-1, 1].map((sx) => (
            <Cyl key={sx} r={0.018} h={0.02} p={[0.19 * sx, -0.2, 0.26]} rot={[Math.PI / 2, 0, 0]} m={m.rivet} seg={6} />
          ))}
          <Cyl r={0.13} h={0.18} p={[0, -0.66, 0]} m={m.mech} />
          <group ref={(g) => { feet.current[i] = g }} position={[0, -SHIN, 0]}>
            <Box size={[0.5, 0.18, 0.76]} r={0.06} p={[0, 0.09, 0.1]} m={m.mech} />
            <Box size={[0.48, 0.12, 0.26]} r={0.05} p={[0, 0.17, 0.38]} m={m.armor} />
            <Box size={[0.52, 0.05, 0.8]} r={0.02} p={[0, 0.02, 0.1]} m={m.rubber} />
          </group>
        </group>
      </group>
    )
  }

  const pauldron = (out: number): ReactNode => {
    switch (build.shoulders) {
      case 'blade':
        // flat plates sweeping up and back
        return (
          <>
            <Box size={[0.42, 0.12, 0.62]} r={0.04} p={[0.1 * out, 0.26, -0.02]} rot={[0.2, 0, -0.45 * out]} m={m.armor} />
            <Box size={[0.36, 0.08, 0.5]} r={0.03} p={[0.2 * out, 0.36, -0.12]} rot={[0.35, 0, -0.7 * out]} m={m.trim} />
            <Box size={[0.06, 0.5, 0.06]} r={0.02} p={[0.24 * out, 0.4, -0.3]} rot={[-0.5, 0, -0.3 * out]} m={m.armor} />
            <Box size={[0.3, 0.02, 0.4]} r={0.01} p={[0.1 * out, 0.33, 0.02]} rot={[0.2, 0, -0.45 * out]} m={m.glow} />
          </>
        )
      case 'spiked':
        return (
          <>
            <Ball r={0.46} p={[0.08 * out, 0.1, 0]} s={[1.1, 0.85, 1.15]} m={m.armor} />
            {[
              [0.25, 0.42, 0.18],
              [0.3, 0.4, -0.18],
              [0.45, 0.22, 0],
            ].map(([x, y, z], n) => (
              <mesh key={n} position={[x * out, y, z]} rotation={[0, 0, -0.6 * out]} material={m.chrome} castShadow>
                <coneGeometry args={[0.07, 0.26, 12]} />
              </mesh>
            ))}
          </>
        )
      case 'frame':
        // stripped: small cap and exposed pistons
        return (
          <>
            <Box size={[0.32, 0.12, 0.36]} r={0.04} p={[0.06 * out, 0.22, 0]} m={m.armor} />
            {[-0.12, 0.12].map((z) => (
              <Cyl key={z} r={0.03} h={0.5} p={[0.14 * out, 0, z]} rot={[0, 0, 0.3 * out]} m={m.chrome} seg={10} />
            ))}
            <Ring r={0.17} tube={0.03} p={[0.02 * out, 0, 0]} rot={[0, Math.PI / 2, 0]} m={m.mech} />
          </>
        )
      default:
        // round layered pauldron
        return (
          <>
            <Ball r={0.4} p={[0.06 * out, 0.1, 0]} s={[1.05, 0.82, 1.12]} m={m.armor} />
            <Ball r={0.3} p={[0.14 * out, 0.2, 0]} s={[1, 0.7, 1.05]} m={m.trim} />
            <Box size={[0.12, 0.14, 0.62]} r={0.04} p={[0.08 * out, 0.42, 0]} rot={[0, 0, -0.35 * out]} m={m.armor} />
            {[-0.18, 0, 0.18].map((z) => (
              <Cyl key={z} r={0.03} h={0.05} p={[0.43 * out, 0.12, z]} rot={[0, 0, Math.PI / 2]} m={m.chrome} seg={8} />
            ))}
          </>
        )
    }
  }

  const arm = (a: 0 | 1): ReactNode => {
    const x = (a === 0 ? 0.86 : -0.86) * build.bulk
    const out = a === 0 ? 1 : -1
    const f = build.fist
    return (
      <group key={a} ref={(g) => { shoulders.current[a] = g }} position={[x, 0.95, 0]}>
        {pauldron(out)}
        <Ball r={0.18} m={m.mech} />
        <Cyl r={0.13} h={0.56} p={[0, -0.32, 0]} m={m.mech} />
        <Box size={[0.36, 0.38, 0.38]} r={0.14} p={[0, -0.3, 0.02]} m={m.armor} />
        <Cyl r={0.035} h={0.5} p={[0, -0.32, -0.22]} m={m.chrome} seg={10} />
        <group ref={(g) => { elbows.current[a] = g }} position={[0, -0.6, 0]}>
          <Ball r={0.16} m={m.mech} />
          <Box size={[0.24, 0.16, 0.12]} r={0.05} p={[0, 0, -0.17]} m={m.trim} />
          {/* massive forearm */}
          <Box size={[0.46, 0.6, 0.48]} r={0.17} p={[0, -0.36, 0]} m={m.armor} />
          <Box size={[0.48, 0.06, 0.5]} r={0.02} p={[0, -0.14, 0]} m={m.trim} />
          <Box size={[0.48, 0.06, 0.5]} r={0.02} p={[0, -0.58, 0]} m={m.trim} />
          <Cyl r={0.04} h={0.42} p={[0.2 * out, -0.36, -0.2]} m={m.chrome} seg={10} />
          {[-0.24, -0.36, -0.48].map((y) =>
            [-0.14, 0.14].map((x) => (
              <Cyl key={`${x}${y}`} r={0.018} h={0.02} p={[x, y, 0.245]} rot={[Math.PI / 2, 0, 0]} m={m.rivet} seg={6} />
            )),
          )}
          <Cyl r={0.17} h={0.1} p={[0, -0.68, 0]} m={m.dark} />
          {/* fist with knuckle plates, sized by build */}
          <group position={[0, -0.9, 0]} scale={f}>
            <Box size={[0.54, 0.46, 0.54]} r={0.18} m={m.trim} />
            {[-0.18, -0.06, 0.06, 0.18].map((kx) => (
              <Box key={kx} size={[0.1, 0.1, 0.12]} r={0.03} p={[kx, -0.22, 0.1]} m={m.mech} />
            ))}
            <Box size={[0.16, 0.3, 0.1]} r={0.04} p={[0.22 * -out, 0.04, 0.2]} m={m.armor} />
          </group>
        </group>
      </group>
    )
  }

  const headParts = (): ReactNode => {
    switch (build.head) {
      case 'wedge':
        // angular head with one wide visor and swept fins
        return (
          <>
            <Box size={[0.4, 0.36, 0.54]} r={0.08} rot={[0.12, 0, 0]} m={m.armor} />
            <Box size={[0.3, 0.16, 0.2]} r={0.05} p={[0, -0.14, 0.2]} rot={[0.4, 0, 0]} m={m.mech} />
            <Box size={[0.38, 0.06, 0.04]} r={0.015} p={[0, 0.03, 0.27]} m={m.glow} />
            {[-1, 1].map((s) => (
              <Box key={s} size={[0.04, 0.12, 0.42]} r={0.015} p={[0.2 * s, 0.14, -0.14]} rot={[0.35, 0.2 * s, 0]} m={m.trim} />
            ))}
            <Box size={[0.05, 0.08, 0.5]} r={0.02} p={[0, 0.22, -0.08]} rot={[0.25, 0, 0]} m={m.trim} />
          </>
        )
      case 'cage':
        // dark core inside a bar cage, single round eye
        return (
          <>
            <Box size={[0.36, 0.36, 0.38]} r={0.08} m={m.dark} />
            <Cyl r={0.07} h={0.04} p={[0, 0.02, 0.2]} rot={[Math.PI / 2, 0, 0]} m={m.glow} />
            {[-0.2, -0.07, 0.07, 0.2].map((x) => (
              <Box key={x} size={[0.04, 0.5, 0.04]} r={0.015} p={[x, 0, 0.24]} m={m.armor} />
            ))}
            {[-0.24, 0.24].map((y) => (
              <Box key={y} size={[0.52, 0.06, 0.54]} r={0.02} p={[0, y, 0]} m={m.armor} />
            ))}
          </>
        )
      case 'mono':
        // round head, big ringed eye, antennae
        return (
          <>
            <Ball r={0.25} s={[1, 0.92, 1]} m={m.armor} />
            <Cyl r={0.12} h={0.06} p={[0, 0, 0.23]} rot={[Math.PI / 2, 0, 0]} m={m.glow} />
            <Ring r={0.14} tube={0.025} p={[0, 0, 0.24]} m={m.chrome} />
            {[-1, 1].map((s) => (
              <Cyl key={s} r={0.012} h={0.35} p={[0.12 * s, 0.32, -0.08]} rot={[-0.2, 0, -0.3 * s]} m={m.chrome} seg={6} />
            ))}
          </>
        )
      default:
        // dome helmet with a grille over the face, slit eyes, ridged crest
        return (
          <>
            <Box size={[0.48, 0.46, 0.52]} r={0.19} m={m.armor} />
            <Box size={[0.5, 0.08, 0.14]} r={0.03} p={[0, 0.1, 0.22]} m={m.trim} />
            <Box size={[0.42, 0.15, 0.06]} r={0.03} p={[0, -0.01, 0.25]} m={m.dark} />
            <Box size={[0.11, 0.04, 0.02]} r={0.01} p={[0.1, 0, 0.285]} rot={[0, 0, -0.12]} m={m.glow} />
            <Box size={[0.11, 0.04, 0.02]} r={0.01} p={[-0.1, 0, 0.285]} rot={[0, 0, 0.12]} m={m.glow} />
            {[-0.12, -0.04, 0.04, 0.12].map((x) => (
              <Box key={x} size={[0.025, 0.24, 0.02]} r={0.008} p={[x, -0.1, 0.29]} m={m.chrome} />
            ))}
            <Box size={[0.34, 0.15, 0.1]} r={0.04} p={[0, -0.18, 0.21]} m={m.mech} />
            {[0, 1, 2, 3].map((n) => (
              <Box key={n} size={[0.05, 0.1 + n * 0.025, 0.12]} r={0.02} p={[0, 0.25 + n * 0.012, 0.12 - n * 0.11]} m={m.trim} />
            ))}
            {[-1, 1].map((s) => (
              <Cyl key={s} r={0.07} h={0.05} p={[0.25 * s, 0, 0]} rot={[0, 0, Math.PI / 2]} m={m.chrome} seg={12} />
            ))}
          </>
        )
    }
  }

  return (
    <group ref={root} {...pointer}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <ringGeometry args={[0.95, 1.1, 48]} />
        <meshBasicMaterial color={brand.glow} transparent opacity={0} toneMapped={false} />
      </mesh>

      <group scale={ROBOT_SCALE * build.height}>
        <group ref={body}>
          {leg(0)}
          {leg(1)}

          <group ref={upper} position={[0, HIP_H, 0]}>
            {/* pelvis and belt */}
            <Box size={[0.9, 0.34, 0.58]} r={0.1} p={[0, 0.05, 0]} m={m.mech} />
            <Box size={[0.94, 0.09, 0.62]} r={0.03} p={[0, 0.2, 0]} m={m.trim} />
            {[-0.3, 0.3].map((x) => (
              <Box key={x} size={[0.32, 0.3, 0.08]} r={0.03} p={[x, -0.06, 0.32]} rot={[0.15, 0, 0]} m={m.armor} />
            ))}
            <Box size={[0.3, 0.26, 0.08]} r={0.03} p={[0, -0.04, -0.32]} rot={[-0.15, 0, 0]} m={m.armor} />

            <group ref={torso} position={[0, 0.3, 0]}>
              {/* glowing core behind waist ribs */}
              <Cyl r={0.28} h={0.42} p={[0, 0.2, 0]} m={m.glow} />
              {[0, 1, 2, 3].map((n) => (
                <Cyl key={n} r={0.37 - n * 0.01} h={0.06} p={[0, 0.03 + n * 0.1, 0]} m={m.armor} seg={36} />
              ))}
              <Cyl r={0.12} h={0.5} p={[0, 0.22, -0.24]} m={m.mech} />

              {/* chest, shaped by build */}
              <group position={[0, 0.78, 0]} scale={[build.bulk, 1, Math.max(0.9, build.bulk * 0.95)]}>
                {build.chest === 'tapered' && (
                  <>
                    {/* broad shoulders narrowing to the waist */}
                    <Box size={[1.4, 0.46, 0.7]} r={0.18} p={[0, 0.16, 0]} m={m.armor} />
                    <Box size={[0.9, 0.42, 0.62]} r={0.16} p={[0, -0.22, 0]} m={m.armor} />
                    {[-1, 1].map((s) => (
                      <Box key={s} size={[0.6, 0.1, 0.1]} r={0.03} p={[0.3 * s, -0.02, 0.33]} rot={[0, 0, 0.55 * s]} m={m.trim} />
                    ))}
                    <Box size={[0.3, 0.22, 0.06]} r={0.03} p={[0, 0.16, 0.37]} m={m.chest} />
                    <Box size={[0.04, 0.5, 0.04]} r={0.015} p={[0, -0.18, 0.33]} m={m.glow} />
                  </>
                )}
                {build.chest === 'frame' && (
                  <>
                    {/* open roll-cage over the glowing core */}
                    <Cyl r={0.26} h={0.6} p={[0, 0, 0]} m={m.glow} />
                    {[-0.55, 0.55].map((x) =>
                      [-0.3, 0.3].map((z) => <Cyl key={`${x}${z}`} r={0.05} h={0.8} p={[x, 0, z]} m={m.mech} seg={10} />),
                    )}
                    {[-0.36, 0.36].map((y) => (
                      <Box key={y} size={[1.2, 0.08, 0.7]} r={0.03} p={[0, y, 0]} m={m.armor} />
                    ))}
                    <Box size={[0.5, 0.3, 0.06]} r={0.04} p={[-0.3, 0.05, 0.36]} rot={[0, 0, 0.15]} m={m.trim} />
                    <Box size={[0.3, 0.22, 0.06]} r={0.03} p={[0.32, -0.1, 0.36]} m={m.chest} />
                  </>
                )}
                {build.chest === 'barrel' && (
                  <>
                    <Box size={[1.34, 0.8, 0.82]} r={0.24} m={m.armor} />
                    {[-1, 1].map((s) => (
                      <Box key={s} size={[0.56, 0.42, 0.12]} r={0.08} p={[0.31 * s, 0.07, 0.39]} rot={[0, 0.12 * s, 0]} m={m.trim} />
                    ))}
                    <Box size={[0.32, 0.22, 0.06]} r={0.03} p={[0, -0.2, 0.42]} m={m.chest} />
                    <Cyl r={0.11} h={0.06} p={[0, 0.07, 0.45]} rot={[Math.PI / 2, 0, 0]} m={m.glow} />
                    <Ring r={0.15} tube={0.03} p={[0, 0.07, 0.45]} m={m.chrome} />
                    <Box size={[1.02, 0.04, 0.05]} r={0.015} p={[0, -0.37, 0.41]} m={m.glow} />
                    {[-0.55, 0.55].map((x) =>
                      [-0.22, 0.22].map((y) => (
                        <Cyl key={`${x}${y}`} r={0.022} h={0.02} p={[x, y, 0.41]} rot={[Math.PI / 2, 0, 0]} m={m.rivet} seg={6} />
                      )),
                    )}
                  </>
                )}
                {[-1, 1].map((s) =>
                  [-0.12, 0, 0.12, 0.24].map((y) => (
                    <Box key={`${s}${y}`} size={[0.05, 0.04, 0.5]} r={0.01} p={[0.68 * s, y - 0.06, 0]} m={m.dark} />
                  )),
                )}
                <Cyl r={0.32} h={0.14} p={[0, 0.43, 0]} m={m.mech} />
                {/* backpack */}
                <Box size={[0.92, 0.68, 0.42]} r={0.13} p={[0, 0.02, -0.5]} m={m.mech} />
                <Box size={[0.7, 0.14, 0.03]} r={0.01} p={[0, -0.18, -0.72]} m={m.hazard} />
                {build.exhaust &&
                  [-0.26, 0.26].map((x) => (
                    <Cyl key={x} r={0.07} r2={0.09} h={0.6} p={[x, 0.32, -0.66]} rot={[-0.25, 0, 0]} m={m.dark} seg={14} />
                  ))}
                {build.fins &&
                  [-0.28, 0.28].map((x) => (
                    <Box key={x} size={[0.05, 0.8, 0.34]} r={0.02} p={[x, 0.42, -0.62]} rot={[-0.35, 0, x * 0.4]} m={m.armor} />
                  ))}
              </group>

              {/* neck and head */}
              <Cyl r={0.14} h={0.26} p={[0, 1.22, 0]} m={m.mech} />
              <Cable from={[0.1, 1.15, -0.12]} to={[0.35, 1.05, -0.45]} m={m.rubber} />
              <Cable from={[-0.1, 1.15, -0.12]} to={[-0.35, 1.05, -0.45]} m={m.rubber} />
              <group ref={head} position={[0, 1.44, 0.02]}>{headParts()}</group>

              {arm(0)}
              {arm(1)}
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}
