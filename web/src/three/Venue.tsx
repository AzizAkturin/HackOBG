// Stadium around the ring: tiered seating packed with a crowd, phone flashes,
// a square lighting rig with visible beams, and dust in the air.
import { Sparkles, SpotLight } from '@react-three/drei'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { brands } from '../data/brands'
import { mainEvent } from '../data/mock'
import { Crowd } from './crowd/Crowd'
import { MAT_Y, type FightDirector } from './director'
import { FIRST_ROW, ROW_DEPTH, ROW_RISE, TIERS } from './stadium'
import { grimeTexture, puddleTexture, screenTexture, whenFontsReady } from './textures'

const RIG_Y = 9.5
const RIG_HALF = 4.2

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
            <meshBasicMaterial map={tex} toneMapped={false} color="#4a4a4a" />
          </mesh>
        </group>
      ))}
    </>
  )
}

export function Venue({ reduced, director }: { reduced: boolean; director: FightDirector }) {
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
          intensity={140}
          distance={14}
          angle={0.44}
          penumbra={0.4}
          decay={1.5}
          volumetric={false}
          castShadow={i < 2}
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0004}
        />
      ))}
      <SpotLight
        position={[0, RIG_Y - 0.3, 0]}
        target={target}
        color="#f2f7ff"
        intensity={90}
        distance={14}
        angle={0.5}
        penumbra={0.5}
        decay={1.5}
        volumetric={false}
      />

      {/* tight corner rim lights over the mat, kept off the stands */}
      <pointLight position={[-4.5, 3.5, -3]} color="#ff3b30" intensity={11} distance={9} />
      <pointLight position={[4.5, 3.5, 3]} color="#3b7bff" intensity={11} distance={9} />
      <pointLight position={[0, 6, 0]} color="#3fe0ff" intensity={3} distance={10} />

      <Crowd director={director} reduced={reduced} />
      <Sparkles count={140} scale={[10, 7, 10]} position={[0, 5, 0]} size={2} speed={reduced ? 0 : 0.25} opacity={0.35} color="#cfe6ff" />
    </>
  )
}
