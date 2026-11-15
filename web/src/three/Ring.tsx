// Championship boxing ring on a raised, LED-lit stage. Worn and grimy.
import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { brands } from '../data/brands'
import { firstName, mainEvent } from '../data/mock'
import { Batch } from './StaticBatch'
import { CORNER_SEATS, MAT_Y } from './director'
import { ANIMATED, createScreen, drawScreen, type ScreenKind } from './deskScreens'
import { CHAIR_H, COMMENTATORS, DESK_XS, DESK_Z, STAGE_Y } from './stadium'
import { grimeTexture, holoRingTexture, noiseTexture, ringCanvasTexture, screenTexture, skirtTexture, whenFontsReady } from './textures'

/** Half the distance between corner posts. */
export const RING_HALF = 3.6
const APRON = 0.55
const STAGE_HALF = RING_HALF + 2.6
const ROPES = [0.42, 0.82, 1.22, 1.6]
const ROPE_RED = new THREE.Color('#c4141c')
const ROPE_WHITE = new THREE.Color('#e4e0d6')
const ROPE_BLUE = new THREE.Color('#1550d8')
// rope colors at each corner, matching CORNERS order: red, neutral, blue, neutral
const CORNER_ROPE = [ROPE_RED, ROPE_WHITE, ROPE_BLUE, ROPE_WHITE]
const ROPE_SAG = 0.05
const POST_H = 1.85
const LED = '#1d8ea6'

type V3 = [number, number, number]

const NEUTRAL_GLOW = new THREE.Color('#ffffff').multiplyScalar(1.6)
const RED_CORNER ={ pad: '#d3121c', ring: '#ff1a0f', glow: new THREE.Color('#ff1a0f').multiplyScalar(2.2), light: 2.5 }
const BLUE_CORNER = { pad: '#1048e6', ring: '#1a5cff', glow: new THREE.Color('#1a5cff').multiplyScalar(2.2), light: 2.5 }

const CORNERS: [number, number][] = [
  [-1, 1],
  [1, 1],
  [1, -1],
  [-1, -1],
]

function Led({ size, p }: { size: V3; p: V3 }) {
  return (
    <mesh position={p}>
      <boxGeometry args={size} />
      <meshBasicMaterial color={LED} toneMapped={false} />
    </mesh>
  )
}

/** Rope with a slight sag between posts and taped sleeves near each corner. */
function Rope({ ax, az, bx, bz, y, from: c0, to: c1 }: { ax: number; az: number; bx: number; bz: number; y: number; from: THREE.Color; to: THREE.Color }) {
  const { tapes, tapeRot, geo } = useMemo(() => {
    const from = new THREE.Vector3(ax, y, az)
    const to = new THREE.Vector3(bx, y, bz)
    const steps = 16
    const points = Array.from({ length: steps + 1 }, (_, i) => {
      const t = i / steps
      const p = from.clone().lerp(to, t)
      p.y -= 4 * ROPE_SAG * t * (1 - t)
      return p
    })
    const curve = new THREE.CatmullRomCurve3(points)
    const len = curve.getLength()
    const tapes = [0.35, len - 0.35].map((d) => curve.getPointAt(d / len))
    const tapeRot: V3 = Math.abs(bx - ax) > 0.01 ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0]
    const geo = new THREE.TubeGeometry(curve, 32, 0.045, 12, false)
    const rings = 33
    const per = geo.attributes.position.count / rings
    const colors = new Float32Array(geo.attributes.position.count * 3)
    const c = new THREE.Color()
    for (let i = 0; i < rings; i++) {
      c.copy(c0).lerp(c1, i / (rings - 1))
      for (let j = 0; j < per; j++) c.toArray(colors, (i * per + j) * 3)
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return { tapes, tapeRot, geo }
  }, [ax, az, bx, bz, y, c0, c1])

  return (
    <group>
      <mesh castShadow geometry={geo} userData={{ noBatch: true }}>
        <meshStandardMaterial vertexColors roughness={0.85} metalness={0} />
      </mesh>
      {tapes.map((p, i) => (
        <mesh key={i} position={p} rotation={tapeRot}>
          <cylinderGeometry args={[0.052, 0.052, 0.22, 12]} />
          <meshStandardMaterial color="#1b1b1d" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

/** Corner stool and spit bucket, set on the stage outside the ropes. */
function CornerKit({ x, z, color }: { x: number; z: number; color: string }) {
  return (
    <group position={[x, STAGE_Y, z]}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.28, 0.08, 20]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {[0, 1, 2].map((n) => {
        const a = (n / 3) * Math.PI * 2
        return (
          <mesh key={n} position={[Math.cos(a) * 0.2, 0.24, Math.sin(a) * 0.2]} rotation={[Math.sin(a) * 0.15, 0, -Math.cos(a) * 0.15]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.5, 8]} />
            <meshStandardMaterial color="#6d6f73" metalness={0.9} roughness={0.5} />
          </mesh>
        )
      })}
      <mesh position={[0.5, 0.18, 0.1]} castShadow>
        <cylinderGeometry args={[0.17, 0.14, 0.36, 18, 1, true]} />
        <meshStandardMaterial color="#2a2c30" metalness={0.6} roughness={0.55} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0.5, 0.06, 0.1]}>
        <cylinderGeometry args={[0.14, 0.14, 0.02, 18]} />
        <meshStandardMaterial color="#1d1f22" />
      </mesh>
      {/* towel draped on the stool */}
      <mesh position={[0.05, 0.56, 0]} rotation={[0, 0.4, 0.1]} castShadow>
        <boxGeometry args={[0.5, 0.03, 0.22]} />
        <meshStandardMaterial color="#b9b4a8" roughness={1} />
      </mesh>
    </group>
  )
}

/** Robot-sized stool that rises out of the canvas between rounds. */
function PopUpStool({ x, z, color, up, reduced }: { x: number; z: number; color: string; up: boolean; reduced: boolean }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    const g = ref.current
    if (!g) return
    const target = up ? 0 : -0.62
    g.position.y = reduced ? target : THREE.MathUtils.damp(g.position.y, target, 3, delta)
    g.visible = g.position.y > -0.6
  })
  return (
    <group position={[x, MAT_Y, z]}>
      <group ref={ref} position={[0, -0.62, 0]}>
        <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.36, 0.42, 0.5, 32]} />
          <meshStandardMaterial color="#1b1f26" metalness={0.85} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <torusGeometry args={[0.36, 0.02, 8, 48]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.12, 0]}>
          <torusGeometry args={[0.41, 0.012, 8, 48]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      </group>
    </group>
  )
}

/** Turning holographic rings projected on the canvas around the emblem. */
function HoloFloor({ reduced }: { reduced: boolean }) {
  const tex = useMemo(() => holoRingTexture(), [])
  const ref = useRef<THREE.Mesh>(null)
  useFrame((_, delta) => {
    if (ref.current && !reduced) ref.current.rotation.z += delta * 0.12
  })
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, MAT_Y + 0.012, 0]}>
      <planeGeometry args={[5.4, 5.4]} />
      <meshBasicMaterial map={tex} transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

/** Floating hologram screen behind the ring, with a slow flicker. */
function drawHolo() {
  const [red, blue] = mainEvent.fighters
  return screenTexture(firstName(red.name), firstName(blue.name), brands[red.brand].ui, brands[blue.brand].ui)
}

function HoloScreen({ reduced }: { reduced: boolean }) {
  const [tex, setTex] = useState(drawHolo)
  useEffect(() => whenFontsReady(() => setTex(drawHolo())), [])
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(({ clock }) => {
    if (!mat.current || reduced) return
    const t = clock.elapsedTime
    mat.current.opacity = 0.55 + Math.sin(t * 2) * 0.05 + (Math.sin(t * 37) > 0.97 ? -0.25 : 0)
  })
  return (
    <group position={[0, MAT_Y + 3.6, -RING_HALF - 2.4]}>
      <mesh>
        <planeGeometry args={[6.4, 3.2]} />
        <meshBasicMaterial ref={mat} map={tex} transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {/* projector base */}
      <mesh position={[0, -2.6, 0]}>
        <cylinderGeometry args={[0.5, 0.6, 0.2, 24]} />
        <meshStandardMaterial color="#1b1f26" metalness={0.8} roughness={0.35} />
      </mesh>
      <mesh position={[0, -2.48, 0]}>
        <torusGeometry args={[0.46, 0.015, 8, 40]} />
        <meshBasicMaterial color="#3fe0ff" toneMapped={false} />
      </mesh>
    </group>
  )
}

const DESK_SCREENS: ScreenKind[][] = [
  ['red', 'blue'],
  ['stream', 'cam'],
  ['pool', 'task'],
]

function DeskScreen({ kind, reduced }: { kind: ScreenKind; reduced: boolean }) {
  const screen = useMemo(() => createScreen(), [])
  const clock = useRef(0)
  const animated = ANIMATED.has(kind) && !reduced

  useEffect(() => {
    let mounted = true
    const redraw = () => {
      if (!mounted) return
      drawScreen(kind, screen.ctx, clock.current)
      screen.texture.needsUpdate = true
    }
    redraw()
    whenFontsReady(redraw)
    return () => {
      mounted = false
      screen.texture.dispose()
    }
  }, [kind, screen])

  const last = useRef(0)
  useFrame(({ clock: c }) => {
    if (!animated || c.elapsedTime - last.current < 0.12) return
    last.current = c.elapsedTime
    clock.current = c.elapsedTime
    drawScreen(kind, screen.ctx, c.elapsedTime)
    screen.texture.needsUpdate = true
  })

  return (
    <mesh position={[0, 0, 0.011]}>
      <planeGeometry args={[0.7, 0.42]} />
      <meshBasicMaterial map={screen.texture} toneMapped={false} />
    </mesh>
  )
}

/** Monitors on the commentary desks, showing broadcast graphics. */
function DeskMonitors({ reduced }: { reduced: boolean }) {
  return (
    <>
      {COMMENTATORS.map(([x, z]) => (
        <pointLight key={x} position={[x, STAGE_Y + 2.4, z + 0.5]} color="#dbe8ff" intensity={2} distance={3.5} decay={2} />
      ))}
      {DESK_XS.map((x, d) =>
        DESK_SCREENS[d].map((kind, m) => (
          <group key={`${x}-${m}`} position={[x + (m === 0 ? -0.6 : 0.6), STAGE_Y + 0.8, DESK_Z - 0.1]}>
            <mesh position={[0, 0.07, -0.04]}>
              <boxGeometry args={[0.05, 0.14, 0.05]} />
              <meshStandardMaterial color="#111" />
            </mesh>
            <group position={[0, 0.24, 0]} rotation={[-0.25, 0, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.74, 0.46, 0.02]} />
                <meshStandardMaterial color="#0a0b0d" roughness={0.5} metalness={0.4} />
              </mesh>
              <DeskScreen kind={kind} reduced={reduced} />
            </group>
          </group>
        )),
      )}
    </>
  )
}

export function Ring({ resting, reduced }: { resting: boolean; reduced: boolean }) {
  const base = useMemo(
    () => ({
      rough: noiseTexture(),
      grime: (() => {
        const t = grimeTexture(91)
        t.repeat.set(3, 3)
        return t
      })(),
    }),
    [],
  )
  const [skirt, setSkirt] = useState(() => skirtTexture())
  const [floor, setFloor] = useState(() => ringCanvasTexture())
  useEffect(() => whenFontsReady(() => setFloor(ringCanvasTexture())), [])
  // redraw the banner once the Steel font has loaded
  useEffect(() => whenFontsReady(() => setSkirt(skirtTexture())), [])

  const ringSize = 2 * (RING_HALF + APRON)
  const stageSize = 2 * STAGE_HALF
  const skirtH = MAT_Y - STAGE_Y

  return (
    <group>
      <Batch>
      {/* raised stage: scuffed, matte */}
      <mesh position={[0, STAGE_Y / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[stageSize, STAGE_Y, stageSize]} />
        <meshStandardMaterial color="#2a2d33" map={base.grime} metalness={0.4} roughness={0.75} roughnessMap={base.rough} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <Led size={[stageSize + 0.04, 0.03, 0.03]} p={[0, STAGE_Y + 0.01, s * STAGE_HALF]} />
          <Led size={[0.03, 0.03, stageSize + 0.04]} p={[s * STAGE_HALF, STAGE_Y + 0.01, 0]} />
        </group>
      ))}
      {/* edge trim with bolts */}
      {[-1, 1].map((s) =>
        Array.from({ length: 14 }, (_, n) => {
          const t = -STAGE_HALF + 0.4 + (n * (stageSize - 0.8)) / 13
          return (
            <group key={`${s}-${n}`}>
              <mesh position={[t, STAGE_Y + 0.005, s * (STAGE_HALF - 0.12)]}>
                <cylinderGeometry args={[0.035, 0.035, 0.02, 8]} />
                <meshStandardMaterial color="#8a8c90" metalness={1} roughness={0.4} />
              </mesh>
              <mesh position={[s * (STAGE_HALF - 0.12), STAGE_Y + 0.005, t]}>
                <cylinderGeometry args={[0.035, 0.035, 0.02, 8]} />
                <meshStandardMaterial color="#8a8c90" metalness={1} roughness={0.4} />
              </mesh>
            </group>
          )
        }),
      )}
      </Batch>

      {/* ring base with stencilled skirt banners */}
      <mesh position={[0, (STAGE_Y + MAT_Y) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[ringSize, skirtH, ringSize]} />
        <meshStandardMaterial color="#141820" roughness={0.6} />
      </mesh>
      {[0, 1, 2, 3].map((side) => {
        const a = (side * Math.PI) / 2
        const d = ringSize / 2 + 0.006
        return (
          <mesh key={side} position={[Math.sin(a) * d, (STAGE_Y + MAT_Y) / 2, Math.cos(a) * d]} rotation={[0, a, 0]}>
            <planeGeometry args={[ringSize, skirtH]} />
            <meshStandardMaterial map={skirt} roughness={0.7} />
          </mesh>
        )
      })}

      {/* canvas */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, MAT_Y + 0.003, 0]} receiveShadow>
        <planeGeometry args={[ringSize, ringSize]} />
        <meshStandardMaterial map={floor} roughness={0.9} roughnessMap={base.rough} />
      </mesh>
      <Batch>
      {[-1, 1].map((s) => (
        <group key={s}>
          <RoundedBox args={[ringSize + 0.1, 0.1, 0.12]} radius={0.04} position={[0, MAT_Y + 0.02, s * (ringSize / 2)]}>
            <meshStandardMaterial color="#1a1d24" map={base.grime} roughness={0.7} />
          </RoundedBox>
          <RoundedBox args={[0.12, 0.1, ringSize + 0.1]} radius={0.04} position={[s * (ringSize / 2), MAT_Y + 0.02, 0]}>
            <meshStandardMaterial color="#1a1d24" map={base.grime} roughness={0.7} />
          </RoundedBox>
        </group>
      ))}

      {/* corner posts and turnbuckle pads: red, neutral, blue, neutral */}
      {CORNERS.map(([sx, sz], k) => {
        const team = k === 0 ? RED_CORNER : k === 2 ? BLUE_CORNER : null
        const pad = team ? team.pad : '#b9b6ae'
        return (
          <group key={k} position={[sx * RING_HALF, MAT_Y, sz * RING_HALF]}>
            <mesh position={[0, POST_H / 2, 0]} castShadow>
              <cylinderGeometry args={[0.07, 0.08, POST_H, 20]} />
              <meshStandardMaterial color="#9a9ea6" map={base.grime} metalness={0.9} roughness={0.38} />
            </mesh>
            <RoundedBox args={[0.3, 1.45, 0.3]} radius={0.08} position={[-sx * 0.08, 1.0, -sz * 0.08]} rotation={[0, Math.PI / 4, 0]} castShadow>
              <meshStandardMaterial
                color={pad}
                map={base.grime}
                roughness={0.55}
                emissive={team ? team.ring : '#000000'}
                emissiveIntensity={team ? 0.55 : 0}
              />
            </RoundedBox>
            {[0.35, 1.0, 1.65].map((y) => (
              <mesh key={y} position={[-sx * 0.08, y, -sz * 0.08]} rotation={[0, Math.PI / 4, 0]}>
                <boxGeometry args={[0.32, 0.05, 0.32]} />
                <meshStandardMaterial color="#111" roughness={0.8} />
              </mesh>
            ))}
            {[0.15, POST_H - 0.05].map((y) => (
              <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[team ? 0.11 : 0.1, team ? 0.022 : 0.014, 8, 32]} />
                <meshBasicMaterial color={team ? team.glow : NEUTRAL_GLOW} toneMapped={false} />
              </mesh>
            ))}
            {team && <pointLight position={[-sx * 0.3, 1.0, -sz * 0.3]} color={team.ring} intensity={team.light} distance={3.2} decay={2} />}
            <mesh position={[0, POST_H + 0.03, 0]}>
              <sphereGeometry args={[0.09, 16, 12]} />
              <meshStandardMaterial color="#9a9ea6" metalness={1} roughness={0.35} />
            </mesh>
          </group>
        )
      })}

      {ROPES.map((h, level) =>
        CORNERS.map(([sx, sz], k) => {
          const [nx, nz] = CORNERS[(k + 1) % 4]
          return (
            <Rope
              key={`${level}-${k}`}
              ax={sx * RING_HALF}
              az={sz * RING_HALF}
              bx={nx * RING_HALF}
              bz={nz * RING_HALF}
              y={MAT_Y + h}
              from={CORNER_ROPE[k]}
              to={CORNER_ROPE[(k + 1) % 4]}
            />
          )
        }),
      )}
      {/* rope spacer straps at the middle of each side */}
      {CORNERS.map(([sx, sz], k) => {
        const [nx, nz] = CORNERS[(k + 1) % 4]
        const x = ((sx + nx) / 2) * RING_HALF
        const z = ((sz + nz) / 2) * RING_HALF
        const top = ROPES[ROPES.length - 1]
        return (
          <mesh key={k} position={[x, MAT_Y + (ROPES[0] + top) / 2, z]} castShadow>
            <boxGeometry args={[0.07, top - ROPES[0] + 0.1, 0.07]} />
            <meshStandardMaterial color="#1b1b1d" roughness={0.9} />
          </mesh>
        )
      })}
      </Batch>

      <DeskMonitors reduced={reduced} />
      <HoloFloor reduced={reduced} />
      <HoloScreen reduced={reduced} />
      <PopUpStool x={CORNER_SEATS[0][0]} z={CORNER_SEATS[0][1]} color="#ff3b30" up={resting} reduced={reduced} />
      <PopUpStool x={CORNER_SEATS[1][0]} z={CORNER_SEATS[1][1]} color="#3b7bff" up={resting} reduced={reduced} />

      <CornerKit x={-(RING_HALF + APRON + 0.7)} z={RING_HALF + APRON - 0.4} color="#9e2026" />
      <CornerKit x={RING_HALF + APRON + 0.7} z={-(RING_HALF + APRON - 0.4)} color="#1f47a3" />

      <Batch>
      {/* corner steps */}
      {[-1, 1].map((sx) => (
        <group key={sx} position={[sx * (RING_HALF + APRON + 0.55), STAGE_Y, RING_HALF + APRON + 0.55]} rotation={[0, sx * Math.PI / 4, 0]}>
          {[0, 1, 2].map((n) => (
            <mesh key={n} position={[0, 0.12 + n * 0.12, -n * 0.25]} castShadow receiveShadow>
              <boxGeometry args={[0.9, 0.24 + n * 0.24, 0.3]} />
              <meshStandardMaterial color="#24272d" map={base.grime} metalness={0.5} roughness={0.6} />
            </mesh>
          ))}
        </group>
      ))}

      {COMMENTATORS.map(([x, z]) => (
        <group key={x} position={[x, STAGE_Y, z]}>
          <mesh position={[0, CHAIR_H / 2, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, CHAIR_H, 8]} />
            <meshStandardMaterial color="#1a1c20" metalness={0.6} roughness={0.5} />
          </mesh>
          <mesh position={[0, CHAIR_H, 0]} castShadow>
            <cylinderGeometry args={[0.28, 0.28, 0.06, 20]} />
            <meshStandardMaterial color="#111317" roughness={0.8} />
          </mesh>
        </group>
      ))}
      {/* ringside commentary desks */}
      {DESK_XS.map((x) => (
        <group key={x} position={[x, STAGE_Y, DESK_Z]}>
          <mesh position={[0, 0.4, 0]} castShadow>
            <boxGeometry args={[1.9, 0.8, 0.7]} />
            <meshStandardMaterial color="#0c0f14" map={base.grime} metalness={0.3} roughness={0.7} />
          </mesh>
          <Led size={[1.9, 0.02, 0.02]} p={[0, 0.78, 0.36]} />
          <mesh position={[0, 0.81, 0.12]} rotation={[-0.1, 0, 0]}>
            <boxGeometry args={[0.36, 0.015, 0.24]} />
            <meshStandardMaterial color="#2c2e33" metalness={0.8} roughness={0.4} />
          </mesh>
        </group>
      ))}
      </Batch>
    </group>
  )
}
