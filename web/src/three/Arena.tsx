// The 3D main event: two branded robots fighting in a championship ring.
import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { BrightnessContrast, ChromaticAberration, EffectComposer, HueSaturation, SSAO, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode, type ChromaticAberrationEffect } from 'postprocessing'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { brands } from '../data/brands'
import type { FightSignals } from '../game/fightStream'
import type { Phase } from '../game/useRound'
import { mainEvent } from '../data/mock'
import { attachDebug } from './debug'
import { FightDirector, type FightEvent } from './director'
import { CameraRig, DirectorTick, Sparks } from './Effects'
import { Ring } from './Ring'
import { Robot } from './Robot'
import { chassis } from './robots/chassis'
import { firmware } from './robots/firmware'
import { Venue } from './Venue'

interface Props {
  selected: number | null
  phase: Phase
  onSelect: (i: number) => void
  onEvent?: (e: FightEvent) => void
  /** fighter index that won the vote, once known */
  winner?: number | null
  signals: FightSignals
}

/** Lens fringing that spikes on big hits. */
function ImpactLens({ director }: { director: FightDirector }) {
  const ref = useRef<ChromaticAberrationEffect>(null)
  const offset = useMemo(() => new THREE.Vector2(0.0004, 0.0004), [])
  useFrame(() => {
    const k = 0.0004 + director.shake * 0.004
    ref.current?.offset.set(k, k * 0.6)
  })
  return <ChromaticAberration ref={ref} offset={offset} radialModulation={false} modulationOffset={0} />
}

function Arena({ selected, phase, onSelect, onEvent, signals, winner = null }: Props) {
  const locked = phase !== 'betting'
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const director = useMemo(() => {
    const d = new FightDirector()
    d.reduced = reduced
    d.configure(
      mainEvent.fighters.map((f) => ({ scale: chassis[brands[f.brand].chassis].rig.scale, wheel: !!chassis[brands[f.brand].chassis].rig.wheel })),
      mainEvent.fighters,
    )
    return d
  }, [reduced])
  useEffect(() => {
    director.winner = winner
  }, [director, winner])
  useEffect(() => {
    director.listen((e) => onEvent?.(e))
  }, [director, onEvent])
  useEffect(() => {
    director.signals = signals
  }, [director, signals])
  useEffect(() => {
    if (!new URLSearchParams(location.search).has('debug')) return
    return attachDebug(director)
  }, [director])
  const [dpr, setDpr] = useState(2)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting))
    io.observe(canvasRef.current!)
    return () => io.disconnect()
  }, [])

  return (
    <Canvas ref={canvasRef} frameloop={visible ? 'always' : 'never'} shadows dpr={[1, dpr]} camera={{ position: [0, 12, 17], fov: 30, near: 0.1, far: 120 }} gl={{ antialias: false, toneMappingExposure: 0.9 }}>
      <PerformanceMonitor flipflops={3} onDecline={() => setDpr(1.5)} />
      <DirectorTick director={director} phase={phase} />
      <CameraRig director={director} phase={phase} reduced={reduced} />

      <color attach="background" args={['#04060a']} />
      <hemisphereLight args={['#2a3550', '#030405', 0.05]} />

      {/* soft reflections for the metal, no network fetch */}
      <Environment resolution={256} frames={1} environmentIntensity={0.3}>
        <Lightformer form="rect" intensity={2.5} color="#e6f0ff" position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[8, 8, 1]} />
        <Lightformer form="rect" intensity={1} color="#ff5a4a" position={[-6, 2, -2]} rotation-y={Math.PI / 2} scale={[4, 3, 1]} />
        <Lightformer form="rect" intensity={1} color="#4a7dff" position={[6, 2, -2]} rotation-y={-Math.PI / 2} scale={[4, 3, 1]} />
        <Lightformer form="ring" intensity={0.6} color="#ffffff" position={[0, 3, 8]} scale={3} />
      </Environment>

      <Venue reduced={reduced} director={director} />
      <Ring resting={phase === 'rest'} reduced={reduced} />
      {mainEvent.fighters.map((f, i) => (
        <Robot
          key={f.id}
          index={i}
          brand={brands[f.brand]}
          chassis={chassis[brands[f.brand].chassis]}
          firmware={firmware[f.weightClass]}
          number={f.id}
          director={director}
          selected={selected === i}
          locked={locked}
          reduced={reduced}
          onSelect={() => onSelect(i)}
        />
      ))}
      <Sparks director={director} />

      <EffectComposer multisampling={4} enableNormalPass>
        <SSAO samples={16} rings={7} radius={0.08} intensity={1.5} luminanceInfluence={0.5} worldDistanceThreshold={30} worldDistanceFalloff={10} worldProximityThreshold={0.5} worldProximityFalloff={0.3} />
        <ImpactLens director={director} />
        <HueSaturation saturation={-0.28} />
        <BrightnessContrast brightness={-0.03} contrast={0.04} />
        <ToneMapping mode={ToneMappingMode.AGX} />
        <Vignette offset={0.25} darkness={0.6} />
      </EffectComposer>
    </Canvas>
  )
}

export default memo(Arena)
