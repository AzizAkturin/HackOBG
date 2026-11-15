import { useLayoutEffect, useRef, type ReactNode } from 'react'
import type * as THREE from 'three'
import { batchStatic } from './bakeStatic'

/** children must never move, hide or swap materials after mount. */
export function Batch({ children }: { children: ReactNode }) {
  const root = useRef<THREE.Group>(null)
  useLayoutEffect(() => batchStatic(root.current!), [])
  return <group ref={root}>{children}</group>
}
