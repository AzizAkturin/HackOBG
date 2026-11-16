import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { brands } from '../data/brands'
import { firstName } from '../data/fighters'
import type { Broadcast } from './broadcast'
import { screenTexture, whenFontsReady } from './textures'

const keyOf = (b: Broadcast) => b.fighters.map((f) => `${f.name}:${f.brand}`).join('|')

const draw = (b: Broadcast) => {
  const [red, blue] = b.fighters
  return screenTexture(firstName(red!.name), firstName(blue!.name), brands[red!.brand].ui, brands[blue!.brand].ui)
}

/** "RED vs BLUE" screen texture that redraws whenever the matchup changes. */
export function useMatchupTexture(b: Broadcast) {
  const [tex, setTex] = useState(() => draw(b))
  const key = useRef(keyOf(b))
  useEffect(() => whenFontsReady(() => setTex(draw(b))), [b])
  useEffect(() => () => tex.dispose(), [tex])
  useFrame(() => {
    const k = keyOf(b)
    if (k === key.current) return
    key.current = k
    setTex(draw(b))
  })
  return tex
}
