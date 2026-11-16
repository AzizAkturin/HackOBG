// firmware only swaps one material, never geometry
import * as THREE from 'three'
import { classColor, type WeightClass } from '../../data/mock'

export type FirmwareMode = 'flicker' | 'pulse' | 'scan'

export interface Firmware {
  version: string
  label: string
  color: string
  mode: FirmwareMode
  speed: number
  intensity: number
  /** status pips lit, out of 3 */
  pips: 1 | 2 | 3
}

export const firmware = {
  Flyweight: { version: 'FW 1.2', label: 'Stock', color: classColor.Flyweight, mode: 'flicker', speed: 14, intensity: 1.6, pips: 1 },
  Middleweight: { version: 'FW 2.6', label: 'Tuned', color: classColor.Middleweight, mode: 'pulse', speed: 2.4, intensity: 2.2, pips: 2 },
  Heavyweight: { version: 'FW 4.0', label: 'Overclocked', color: classColor.Heavyweight, mode: 'scan', speed: 1.1, intensity: 3, pips: 3 },
} satisfies Record<WeightClass, Firmware>

const MODE_ID: Record<FirmwareMode, number> = { flicker: 0, pulse: 1, scan: 2 }

export interface FirmwareMaterial extends THREE.MeshBasicMaterial {
  userData: { time: { value: number }; base: THREE.Color; flash: THREE.Color }
}

export function firmwareMaterial(fw: Firmware): FirmwareMaterial {
  const color = new THREE.Color(fw.color).multiplyScalar(fw.intensity)
  const mat = new THREE.MeshBasicMaterial({ color, toneMapped: false }) as FirmwareMaterial
  const time = { value: 0 }
  mat.userData.time = time
  mat.userData.base = color.clone()
  mat.userData.flash = new THREE.Color('#ffffff').multiplyScalar(fw.intensity * 1.6)
  mat.defines = { FW_MODE: MODE_ID[fw.mode] }
  mat.customProgramCacheKey = () => `fw${MODE_ID[fw.mode]}`
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time
    shader.uniforms.uSpeed = { value: fw.speed }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFwPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFwPos = position;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFwPos;\nuniform float uTime;\nuniform float uSpeed;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
#if FW_MODE == 0
  float f = fract(sin(floor(uTime * uSpeed) * 12.9898) * 43758.5453);
  diffuseColor.rgb *= f > 0.88 ? 0.25 : 0.9 + 0.1 * f;
#elif FW_MODE == 1
  diffuseColor.rgb *= 0.6 + 0.4 * sin(uTime * uSpeed);
#else
  float band = fract(vFwPos.y * 1.6 + vFwPos.x * 0.8 - uTime * uSpeed);
  diffuseColor.rgb *= 0.55 + 1.1 * smoothstep(0.8, 1.0, band);
#endif`,
      )
  }
  return mat
}
