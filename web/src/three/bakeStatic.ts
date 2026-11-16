import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const SKIP_KEYS = new Set(['uuid', 'id', 'name', 'version', 'userData'])

/** Identity of a material by value, so separately declared but identical JSX materials share a bucket. */
function materialKey(m: THREE.Material) {
  const parts: string[] = [m.type]
  for (const k of Object.keys(m).sort()) {
    if (SKIP_KEYS.has(k)) continue
    const v = (m as unknown as Record<string, unknown>)[k]
    if (v === null || v === undefined) parts.push(`${k}=null`)
    else if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') parts.push(`${k}=${v}`)
    else if ((v as THREE.Color).isColor) parts.push(`${k}=${(v as THREE.Color).getHex()}`)
    else if ((v as THREE.Texture).isTexture) parts.push(`${k}=${(v as THREE.Texture).uuid}`)
    else if ((v as THREE.Vector2).isVector2) parts.push(`${k}=${(v as THREE.Vector2).toArray()}`)
  }
  return parts.join('|')
}

function bakedGeometry(mesh: THREE.Mesh, matrix: THREE.Matrix4, withUv: boolean) {
  let g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone()
  for (const name of Object.keys(g.attributes)) {
    if (name !== 'position' && name !== 'normal' && !(withUv && name === 'uv')) g.deleteAttribute(name)
  }
  if (withUv && !g.attributes.uv) {
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2))
  }
  g.clearGroups()
  g.applyMatrix4(matrix)
  return g
}

interface Bucket {
  material: THREE.Material
  cast: boolean
  receive: boolean
  meshes: THREE.Mesh[]
  matrices: THREE.Matrix4[]
}

/**
 * Bakes every static mesh under `root` into one mesh per distinct material and hides the originals.
 * Returns a function that undoes it.
 */
export function batchStatic(root: THREE.Object3D) {
  root.updateWorldMatrix(true, true)
  const inverse = new THREE.Matrix4().copy(root.matrixWorld).invert()
  const buckets = new Map<string, Bucket>()

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh || !mesh.visible || (mesh as THREE.InstancedMesh).isInstancedMesh || (mesh as THREE.SkinnedMesh).isSkinnedMesh) return
    const material = mesh.material
    if (Array.isArray(material) || material.transparent || mesh.userData.noBatch) return
    const matrix = new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld)
    if (matrix.determinant() <= 0) return
    const key = `${materialKey(material)}|${mesh.castShadow}|${mesh.receiveShadow}`
    let bucket = buckets.get(key)
    if (!bucket) buckets.set(key, (bucket = { material, cast: mesh.castShadow, receive: mesh.receiveShadow, meshes: [], matrices: [] }))
    bucket.meshes.push(mesh)
    bucket.matrices.push(matrix)
  })

  const holder = new THREE.Group()
  const hidden: THREE.Mesh[] = []
  const geometries: THREE.BufferGeometry[] = []
  for (const b of buckets.values()) {
    if (b.meshes.length < 2) continue
    const withUv = b.meshes.some((m) => m.geometry.attributes.uv)
    const parts = b.meshes.map((m, i) => bakedGeometry(m, b.matrices[i], withUv))
    const merged = mergeGeometries(parts)
    parts.forEach((p) => p.dispose())
    if (!merged) continue
    const out = new THREE.Mesh(merged, b.material)
    out.castShadow = b.cast
    out.receiveShadow = b.receive
    holder.add(out)
    geometries.push(merged)
    b.meshes.forEach((m) => {
      m.visible = false
      hidden.push(m)
    })
  }
  root.add(holder)

  return () => {
    root.remove(holder)
    geometries.forEach((g) => g.dispose())
    hidden.forEach((m) => (m.visible = true))
  }
}
