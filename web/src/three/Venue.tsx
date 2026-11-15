// Stadium around the ring: tiered seating packed with a crowd, phone flashes,
// a square lighting rig with visible beams, and dust in the air.
import { Sparkles, SpotLight } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { brands } from '../data/brands'
import { mainEvent } from '../data/mock'
import { MAT_Y } from './director'
import { grimeTexture, puddleTexture, screenTexture, whenFontsReady } from './textures'

const RIG_Y = 9.5
const RIG_HALF = 4.2
const TIERS = 9
const FIRST_ROW = 8.2
const ROW_DEPTH = 1.05
const ROW_RISE = 0.55

interface Seat {
  x: number
  y: number
  z: number
  h: number
  phase: number
  tone: number
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
        if (rand() < 0.07) continue // empty seat
        const along = s + (rand() - 0.5) * 0.15
        const [x, z] = [
          [along, -d],
          [d, along],
          [-along, d],
          [-d, -along],
        ][side]
        out.push({ x, y, z, h: 0.85 + rand() * 0.25, phase: rand() * 10, tone: rand() })
      }
    }
  }
  return out
})()

function Crowd({ reduced }: { reduced: boolean }) {
  const bodies = useRef<THREE.InstancedMesh>(null)
  const heads = useRef<THREE.InstancedMesh>(null)
  const flashes = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  useLayoutEffect(() => {
    const color = new THREE.Color()
    seats.forEach((p, i) => {
      color.setHSL(0.6, 0.2, 0.02 + p.tone * 0.035)
      bodies.current?.setColorAt(i, color)
    })
    if (bodies.current?.instanceColor) bodies.current.instanceColor.needsUpdate = true
  }, [])

  const place = (t: number) => {
    seats.forEach((p, i) => {
      const cheer = reduced ? 0 : Math.max(0, Math.sin(t * 3.5 + p.phase)) * 0.08
      dummy.position.set(p.x, p.y + 0.55 * p.h + cheer, p.z)
      dummy.scale.set(1, p.h, 1)
      dummy.updateMatrix()
      bodies.current?.setMatrixAt(i, dummy.matrix)
      dummy.position.set(p.x, p.y + 1.25 * p.h + cheer, p.z)
      dummy.scale.setScalar(1)
      dummy.updateMatrix()
      heads.current?.setMatrixAt(i, dummy.matrix)
      // a few phones flash each frame
      const on = !reduced && Math.random() < 0.004
      dummy.position.set(p.x, p.y + 1.45, p.z)
      dummy.scale.setScalar(on ? 1 : 0)
      dummy.updateMatrix()
      flashes.current?.setMatrixAt(i, dummy.matrix)
    })
    for (const m of [bodies, heads, flashes]) if (m.current) m.current.instanceMatrix.needsUpdate = true
  }

  useLayoutEffect(() => place(0))
  useFrame(({ clock }) => {
    if (!reduced) place(clock.elapsedTime)
  })

  return (
    <>
      <instancedMesh ref={bodies} args={[undefined, undefined, seats.length]}>
        <capsuleGeometry args={[0.2, 0.7, 4, 8]} />
        <meshStandardMaterial roughness={1} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, seats.length]}>
        <sphereGeometry args={[0.13, 10, 8]} />
        <meshStandardMaterial color="#0c0d10" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={flashes} args={[undefined, undefined, seats.length]}>
        <sphereGeometry args={[0.05, 6, 4]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </instancedMesh>
    </>
  )
}

function Bleachers() {
  return (
    <>
      {Array.from({ length: TIERS }, (_, k) => {
        const d = FIRST_ROW + k * ROW_DEPTH
        const y = 0.2 + k * ROW_RISE
        return [0, 1, 2, 3].map((side) => {
          const horizontal = side % 2 === 0
          const pos: [number, number, number] =
            side === 0 ? [0, y / 2, -d] : side === 1 ? [d, y / 2, 0] : side === 2 ? [0, y / 2, d] : [-d, y / 2, 0]
          return (
            <mesh key={`${k}-${side}`} position={pos} receiveShadow>
              <boxGeometry args={horizontal ? [2 * d + ROW_DEPTH, y, ROW_DEPTH] : [ROW_DEPTH, y, 2 * d + ROW_DEPTH]} />
              <meshStandardMaterial color="#0b0d12" roughness={0.9} />
            </mesh>
          )
        })
      })}
    </>
  )
}

const BARRIER_HALF = 7.4

/** Steel crowd-control barriers ringing the stage. */
function Barriers() {
  const posts = useMemo(() => {
    const out: [number, number][] = []
    for (let side = 0; side < 4; side++) {
      for (let t = -BARRIER_HALF; t < BARRIER_HALF; t += 0.32) {
        out.push(
          ([
            [t, -BARRIER_HALF],
            [BARRIER_HALF, t],
            [-t, BARRIER_HALF],
            [-BARRIER_HALF, -t],
          ] as [number, number][])[side],
        )
      }
    }
    return out
  }, [])
  const bars = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const d = new THREE.Object3D()
    posts.forEach(([x, z], i) => {
      d.position.set(x, 0.55, z)
      d.updateMatrix()
      bars.current?.setMatrixAt(i, d.matrix)
    })
    if (bars.current) bars.current.instanceMatrix.needsUpdate = true
  }, [posts])
  return (
    <>
      <instancedMesh ref={bars} args={[undefined, undefined, posts.length]} castShadow>
        <cylinderGeometry args={[0.018, 0.018, 1.1, 6]} />
        <meshStandardMaterial color="#7d8188" metalness={0.9} roughness={0.5} />
      </instancedMesh>
      {[0.08, 1.08].map((y) =>
        [0, 1, 2, 3].map((side) => {
          const horizontal = side % 2 === 0
          const pos: [number, number, number] =
            side === 0 ? [0, y, -BARRIER_HALF] : side === 1 ? [BARRIER_HALF, y, 0] : side === 2 ? [0, y, BARRIER_HALF] : [-BARRIER_HALF, y, 0]
          return (
            <mesh key={`${y}-${side}`} position={pos} rotation={horizontal ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.035, 0.035, 2 * BARRIER_HALF, 8]} />
              <meshStandardMaterial color="#7d8188" metalness={0.9} roughness={0.5} />
            </mesh>
          )
        }),
      )}
    </>
  )
}

/** Cable paths from the back of the arena to the ringside tables. */
function cablePaths() {
  let seed = 5
  const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)
  return Array.from({ length: 7 }, (_, i) => {
    const startX = -6 + i * 2
    const pts = Array.from({ length: 6 }, (_, k) => new THREE.Vector3(startX + (rand() - 0.5) * 1.5, 0.03, 6.4 + k * 0.4 + (rand() - 0.5) * 0.2))
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.03, 6)
  })
}

/** Power and camera cables snaking across the floor to ringside. */
function FloorCables() {
  const curves = useMemo(() => cablePaths(), [])
  return (
    <>
      {curves.map((g, i) => (
        <mesh key={i} geometry={g} receiveShadow>
          <meshStandardMaterial color={i % 3 ? '#121212' : '#2a2416'} roughness={0.8} />
        </mesh>
      ))}
    </>
  )
}

/** Roof girders over the arena with chains hanging toward the rig. */
function Rafters() {
  return (
    <group position={[0, 15, 0]}>
      {[-9, -3, 3, 9].map((z) => (
        <group key={z} position={[0, 0, z]}>
          <mesh>
            <boxGeometry args={[44, 0.5, 0.35]} />
            <meshStandardMaterial color="#14161a" metalness={0.7} roughness={0.6} />
          </mesh>
          <mesh position={[0, -1.2, 0]}>
            <boxGeometry args={[44, 0.3, 0.3]} />
            <meshStandardMaterial color="#14161a" metalness={0.7} roughness={0.6} />
          </mesh>
          {Array.from({ length: 22 }, (_, n) => (
            <mesh key={n} position={[-21 + n * 2, -0.6, 0]} rotation={[0, 0, n % 2 ? 0.6 : -0.6]}>
              <boxGeometry args={[0.12, 1.4, 0.12]} />
              <meshStandardMaterial color="#14161a" metalness={0.7} roughness={0.6} />
            </mesh>
          ))}
        </group>
      ))}
      {[-4.2, 4.2].map((x) =>
        [-4.2, 4.2].map((z) => (
          <mesh key={`${x}${z}`} position={[x, -2.6, z]}>
            <cylinderGeometry args={[0.03, 0.03, 5.2, 6]} />
            <meshStandardMaterial color="#3a3a3e" metalness={0.9} roughness={0.5} />
          </mesh>
        )),
      )}
    </group>
  )
}

/** LED boards above the far stands showing the matchup. */
function drawBoard() {
  const [red, blue] = mainEvent.fighters
  return screenTexture(red.name, blue.name, brands[red.brand].ui, brands[blue.brand].ui)
}

function Boards() {
  const [tex, setTex] = useState(drawBoard)
  useEffect(() => whenFontsReady(() => setTex(drawBoard())), [])
  return (
    <>
      {[-9, 9].map((x) => (
        <group key={x} position={[x, 8.5, -18.5]}>
          <mesh>
            <boxGeometry args={[8.4, 4.4, 0.3]} />
            <meshStandardMaterial color="#0b0c0f" metalness={0.5} roughness={0.6} />
          </mesh>
          <mesh position={[0, 0, 0.16]}>
            <planeGeometry args={[8, 4]} />
            <meshBasicMaterial map={tex} toneMapped={false} color="#9a9a9a" />
          </mesh>
        </group>
      ))}
    </>
  )
}

export function Venue({ reduced }: { reduced: boolean }) {
  const floor = useMemo(() => {
    const rough = puddleTexture()
    rough.repeat.set(10, 10)
    const grime = grimeTexture(55)
    grime.repeat.set(14, 14)
    return { rough, grime }
  }, [])
  const target = useMemo(() => new THREE.Object3D(), [])
  const lamps: [number, number][] = [
    [-RIG_HALF, -RIG_HALF],
    [RIG_HALF, -RIG_HALF],
    [-RIG_HALF, RIG_HALF],
    [RIG_HALF, RIG_HALF],
  ]

  return (
    <>
      {/* arena floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#16181c" map={floor.grime} roughness={1} roughnessMap={floor.rough} metalness={0.35} />
      </mesh>
      <Bleachers />
      <Barriers />
      <FloorCables />
      <Rafters />
      <Boards />

      {/* square lighting truss over the ring */}
      <group position={[0, RIG_Y, 0]}>
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh position={[0, 0, s * RIG_HALF]}>
              <boxGeometry args={[2 * RIG_HALF + 0.4, 0.3, 0.3]} />
              <meshStandardMaterial color="#1a1c22" metalness={0.8} roughness={0.4} />
            </mesh>
            <mesh position={[s * RIG_HALF, 0, 0]}>
              <boxGeometry args={[0.3, 0.3, 2 * RIG_HALF + 0.4]} />
              <meshStandardMaterial color="#1a1c22" metalness={0.8} roughness={0.4} />
            </mesh>
          </group>
        ))}
        {lamps.map(([x, z]) => (
          <mesh key={`${x}${z}`} position={[x, -0.25, z]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.28, 20]} />
            <meshBasicMaterial color="#eaf6ff" toneMapped={false} />
          </mesh>
        ))}
      </group>

      <primitive object={target} position={[0, MAT_Y, 0]} />
      {lamps.map(([x, z], i) => (
        <SpotLight
          key={`${x}${z}`}
          position={[x, RIG_Y - 0.3, z]}
          target={target}
          color="#e6f0ff"
          intensity={110}
          distance={18}
          angle={0.42}
          penumbra={0.55}
          decay={1.5}
          volumetric={false}
          castShadow={i < 2}
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0004}
        />
      ))}

      {/* corner rim lights and a cool wash over the stands */}
      <pointLight position={[-6, 4, -4]} color="#ff3b30" intensity={22} distance={14} />
      <pointLight position={[6, 4, 4]} color="#3b7bff" intensity={22} distance={14} />
      <pointLight position={[0, 7, 0]} color="#3fe0ff" intensity={4} distance={30} />

      <Crowd reduced={reduced} />
      <Sparkles count={140} scale={[10, 7, 10]} position={[0, 5, 0]} size={2} speed={reduced ? 0 : 0.25} opacity={0.35} color="#cfe6ff" />
    </>
  )
}
