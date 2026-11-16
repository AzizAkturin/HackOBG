// paint wear that builds with damage: edge chips, scuffs on hit zones, oil or rust drips
import * as THREE from 'three'
import type { Merged } from './parts'

export interface WearWeights {
  /** paint chips down to bare steel; 0 for surfaces that are already bare metal */
  chip: number
  scuff: number
  drip: number
}

export interface WearUniforms {
  /** 0 fresh, 1 wrecked; shared by every material on one robot */
  uDamage: { value: number }
  /** wear already there before the first punch */
  uBase: { value: number }
  /** 1 drips read as rust, 0 as oil */
  uRust: { value: number }
}

export function applyWear(mat: THREE.MeshStandardMaterial, mask: THREE.Texture, shared: WearUniforms, w: WearWeights) {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, shared, {
      uWearMask: { value: mask },
      uWeights: { value: new THREE.Vector3(w.chip, w.scuff, w.drip) },
    })
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aHit;\nvarying float vHit;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHit = aHit;')
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying float vHit;\nuniform sampler2D uWearMask;\nuniform vec3 uWeights;\nuniform float uDamage;\nuniform float uBase;\nuniform float uRust;',
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
vec3 wearT = texture2D(uWearMask, vNormalMapUv).rgb;
float hitDmg = vHit * uDamage;
float chipLvl = min(uBase + uDamage * 0.3 + hitDmg * 0.25, 0.7) * uWeights.x;
float wearChip = step(1.0 - chipLvl, wearT.r) * step(0.001, chipLvl);
float scuffLvl = min(uBase * 0.4 + uDamage * 0.15 + hitDmg * 0.5, 0.55) * uWeights.y;
float wearScuff = smoothstep(1.0 - scuffLvl, 1.1 - scuffLvl, wearT.g) * step(0.001, scuffLvl);
float dripLvl = (uBase + uDamage * 0.35) * uWeights.z;
float wearDrip = clamp((wearT.b - 1.0 + dripLvl) * 3.0, 0.0, 1.0);
diffuseColor.rgb = mix(diffuseColor.rgb, mix(diffuseColor.rgb, vec3(0.62), 0.45), wearScuff);
diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(0.05, 0.04, 0.03), vec3(0.32, 0.13, 0.05), uRust), wearDrip * 0.8);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.56, 0.57, 0.6), wearChip);`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
roughnessFactor = mix(roughnessFactor, mix(0.18, 0.9, uRust), wearDrip * 0.8);
roughnessFactor = mix(roughnessFactor, 0.75, wearScuff * 0.6);
roughnessFactor = mix(roughnessFactor, 0.32, wearChip);`,
      )
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 1.0, wearChip);')
      .replace(
        '#include <lights_physical_fragment>',
        '#include <lights_physical_fragment>\n#ifdef USE_CLEARCOAT\nmaterial.clearcoat *= 1.0 - max(wearChip, wearScuff);\n#endif',
      )
  }
  mat.customProgramCacheKey = () => 'robot-wear'
}

/** per-vertex hit exposure: 1 where punches land, 0 where they never do */
export function markHits(merged: Merged, exposure: (pos: THREE.Vector3, normal: THREE.Vector3) => number) {
  const p = new THREE.Vector3()
  const n = new THREE.Vector3()
  for (const [, g] of merged) {
    const pos = g.attributes.position
    const nor = g.attributes.normal
    const out = new Float32Array(pos.count)
    for (let i = 0; i < pos.count; i++) out[i] = THREE.MathUtils.clamp(exposure(p.fromBufferAttribute(pos, i), n.fromBufferAttribute(nor, i)), 0, 1)
    g.setAttribute('aHit', new THREE.BufferAttribute(out, 1))
  }
}
