// The 3D main event: two branded robots fighting in a championship ring.
import { Environment, Lightformer } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Bloom, BrightnessContrast, ChromaticAberration, EffectComposer, HueSaturation, Noise, Vignette } from '@react-three/postprocessing'
import type { ChromaticAberrationEffect } from 'postprocessing'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { brands } from '../data/brands'
import type { Phase } from '../game/useRound'
import { mainEvent } from '../data/mock'
import { FightDirector, type FightEvent } from './director'
import { CameraRig, DirectorTick, Haze, Sparks } from './Effects'
import { builds } from './builds'
import { Ring } from './Ring'
import { Robot } from './Robot'
import { Venue } from './Venue'

interface Props {
  selected: number | null
  phase: Phase
  onSelect: (i: number) => void
  onEvent?: (e: FightEvent) => void
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

export default function Arena({ selected, phase, onSelect, onEvent }: Props) {
  const locked = phase !== 'betting'
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const director = useMemo(() => new FightDirector(), [])
  useEffect(() => {
    director.listen((e) => onEvent?.(e))
  }, [director, onEvent])

  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 12, 17], fov: 30, near: 0.1, far: 120 }} gl={{ antialias: false, toneMappingExposure: 0.85 }}>
      <DirectorTick director={director} phase={phase} />
      <CameraRig director={director} phase={phase} reduced={reduced} />

      <color attach="background" args={['#04060a']} />
      <fog attach="fog" args={['#04060a', 16, 42]} />
      <hemisphereLight args={['#3a4a66', '#040506', 0.35]} />

      {/* soft reflections for the metal, no network fetch */}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.5} color="#e6f0ff" position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[8, 8, 1]} />
        <Lightformer form="rect" intensity={1} color="#ff5a4a" position={[-6, 2, -2]} rotation-y={Math.PI / 2} scale={[4, 3, 1]} />
        <Lightformer form="rect" intensity={1} color="#4a7dff" position={[6, 2, -2]} rotation-y={-Math.PI / 2} scale={[4, 3, 1]} />
        <Lightformer form="ring" intensity={0.6} color="#ffffff" position={[0, 3, 8]} scale={3} />
      </Environment>

      <Venue reduced={reduced} />
      <Haze reduced={reduced} />
      <Ring resting={phase === 'rest'} reduced={reduced} />
      {mainEvent.fighters.map((f, i) => (
        <Robot
          key={f.id}
          index={i}
          brand={brands[f.brand]}
          build={builds[f.build]}
          number={f.id}
          director={director}
          selected={selected === i}
          locked={locked}
          reduced={reduced}
          onSelect={() => onSelect(i)}
        />
      ))}
      <Sparks director={director} />

      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur intensity={0.3} luminanceThreshold={0.95} radius={0.45} />
        <ImpactLens director={director} />
        {/* grimy grade: drained colour, harder contrast, heavy grain */}
        <HueSaturation saturation={-0.28} />
        <BrightnessContrast brightness={-0.03} contrast={0.16} />
        <Noise opacity={0.11} />
        <Vignette offset={0.18} darkness={0.95} />
      </EffectComposer>
    </Canvas>
  )
}
