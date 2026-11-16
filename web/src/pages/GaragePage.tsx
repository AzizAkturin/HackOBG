import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { RobotBadge } from '../components/RobotBadge'
import { brands, type BrandKey } from '../data/brands'
import type { WeightClass } from '../data/mock'
import { MAT_Y } from '../three/director'
import { GUARD, instantiate, sampleInstance, type MoveInstance, type MoveName, type Pose } from '../three/moves'
import { Robot, type RobotDriver } from '../three/Robot'
import { chassis } from '../three/robots/chassis'
import { firmware } from '../three/robots/firmware'

const lineup = (Object.keys(brands) as BrandKey[]).map((key) => ({ key, brand: brands[key], chassis: chassis[brands[key].chassis] }))
const COMBO: MoveName[] = ['jab', 'cross', 'hook', 'uppercut', 'block']
const SPACING = 2.2
const tiers = Object.keys(firmware) as WeightClass[]

class Showcase implements RobotDriver {
  base = lineup.map((_, i) => ({ x: (i - (lineup.length - 1) / 2) * SPACING, z: 0, rotY: 0 }))
  speed = lineup.map(() => 0)
  hurt = lineup.map(() => 0)
  damage = lineup.map(() => 0)

  private throws = new Map<MoveName, MoveInstance>()

  frame(i: number, t: number): { pose: Pose; follow: number } {
    const slot = 2.2
    const local = t + i * 0.37
    const move = COMBO[Math.floor(local / slot) % COMBO.length]
    let inst = this.throws.get(move)
    if (!inst) this.throws.set(move, (inst = instantiate(move, 0, GUARD)))
    const s = local % slot
    // fake a hit on the block so the firmware flash is visible here
    this.hurt[i] = move === 'block' ? Math.max(0, 1 - Math.abs(s / inst.dur - 0.4) * 4) : 0
    return s < inst.dur ? sampleInstance(inst, s) : { pose: GUARD, follow: 8 }
  }
}

function Stats({ out }: { out: React.RefObject<HTMLSpanElement | null> }) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const meshes = useRef(0)
  useEffect(() => {
    // ContactShadows renders its own pass, so count the whole frame by hand
    gl.info.autoReset = false
    return () => {
      gl.info.autoReset = true
    }
  }, [gl])
  useFrame(() => {
    if (!meshes.current) scene.traverse((o) => void ((o as { isMesh?: boolean }).isMesh && meshes.current++))
    if (out.current) out.current.textContent = `${gl.info.render.calls} draw calls per frame · ${Math.round(meshes.current / lineup.length)} meshes per robot`
    gl.info.reset()
  })
  return null
}

export function GaragePage() {
  const [tier, setTier] = useState<WeightClass>('Heavyweight')
  const [wear, setWear] = useState(0)
  const driver = useMemo(() => new Showcase(), [])
  const stats = useRef<HTMLSpanElement>(null)

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="headline text-4xl uppercase">Garage</h1>
          <p className="text-lg text-mute">
            One chassis per provider. Firmware follows the weight class: <span style={{ color: firmware[tier].color }}>{firmware[tier].version} {firmware[tier].label}</span>
          </p>
        </div>
        <label className="flex items-center gap-2 font-display uppercase tracking-widest text-mute">
          Damage
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={wear}
            onChange={(e) => {
              const v = Number(e.target.value)
              setWear(v)
              driver.damage.fill(v)
            }}
          />
        </label>
        <div className="flex gap-2" role="radiogroup" aria-label="Firmware tier">
          {tiers.map((w) => (
            <button
              key={w}
              role="radio"
              aria-checked={tier === w}
              onClick={() => setTier(w)}
              className="border-2 px-3 py-1 font-display uppercase tracking-widest"
              style={{ borderColor: firmware[w].color, background: tier === w ? firmware[w].color : 'transparent', color: tier === w ? '#000' : firmware[w].color }}
            >
              {w}
            </button>
          ))}
        </div>
      </header>

      <div className="panel h-[70vh] min-h-[420px]">
        <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 3.8, 19], fov: 34 }}>
          <color attach="background" args={['#07090d']} />
          <hemisphereLight args={['#5a6a86', '#040506', 0.6]} />
          <directionalLight position={[4, 10, 6]} intensity={2.2} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={6} shadow-camera-bottom={-4} />
          <Environment resolution={256} frames={1}>
            <Lightformer form="rect" intensity={2.5} color="#e6f0ff" position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[8, 8, 1]} />
            <Lightformer form="rect" intensity={1} color="#ff5a4a" position={[-6, 2, -2]} rotation-y={Math.PI / 2} scale={[4, 3, 1]} />
            <Lightformer form="rect" intensity={1} color="#4a7dff" position={[6, 2, -2]} rotation-y={-Math.PI / 2} scale={[4, 3, 1]} />
          </Environment>
          <mesh rotation-x={-Math.PI / 2} position={[0, MAT_Y, 0]} receiveShadow>
            <planeGeometry args={[70, 20]} />
            <meshStandardMaterial color="#15171c" roughness={0.9} />
          </mesh>
          <ContactShadows position={[0, MAT_Y + 0.01, 0]} scale={[30, 8]} opacity={0.5} blur={2} far={4} />
          {lineup.map((r, i) => (
            <Robot
              key={r.key}
              index={i}
              brand={r.brand}
              chassis={r.chassis}
              firmware={firmware[tier]}
              number={i + 1}
              director={driver}
              selected={false}
              locked
              reduced={false}
              onSelect={() => {}}
            />
          ))}
          <OrbitControls target={[0, MAT_Y + 1.4, 0]} maxPolarAngle={Math.PI / 2.05} />
          <Stats out={stats} />
        </Canvas>
      </div>

      <p className="mt-2 text-sm text-mute tabular-nums">
        <span ref={stats} />
      </p>

      <ol className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {lineup.map((r) => (
          <li key={r.key} className="panel flex gap-3 p-3">
            <div className="grid h-20 w-20 shrink-0 place-items-center border border-line bg-well">
              <RobotBadge brand={r.brand} firmware={firmware[tier]} size={68} />
            </div>
            <div className="min-w-0">
              <p className="font-display text-xl uppercase" style={{ color: r.brand.ink }}>
                {r.chassis.label}
              </p>
              <p className="text-sm text-mute">{r.brand.label}</p>
              <p className="mt-1">{r.chassis.blurb}</p>
            </div>
          </li>
        ))}
      </ol>
    </main>
  )
}
