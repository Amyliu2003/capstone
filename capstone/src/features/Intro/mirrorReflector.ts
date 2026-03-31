import {
  Box3,
  BufferGeometry,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from 'three'
import type { WebGLRenderer } from 'three'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'

export type MirrorReflectorSetup = {
  reflector: InstanceType<typeof Reflector>
  dispose: () => void
  resizeReflection: () => void
}

function isShinyMaterial(m: unknown): m is MeshStandardMaterial | MeshPhysicalMaterial {
  return m instanceof MeshStandardMaterial || m instanceof MeshPhysicalMaterial
}

export function pickMirrorSurfaceMesh(root: Object3D): Mesh | null {
  const byName: Mesh[] = []
  const byMetal: Mesh[] = []
  root.traverse((o) => {
    if (!(o instanceof Mesh) || !o.geometry) return
    const n = o.name.toLowerCase()
    if (/glass|mirror|reflect|mirro|chrome/.test(n)) byName.push(o)
    const mat = Array.isArray(o.material) ? o.material[0] : o.material
    if (isShinyMaterial(mat) && mat.metalness !== undefined && mat.metalness > 0.45) {
      byMetal.push(o)
    }
  })
  if (byName.length > 0) return byName[0]!
  if (byMetal.length > 0) {
    // Prefer a planar-ish, smaller shiny surface (mirror glass) over huge walls.
    const scored = byMetal
      .map((mesh) => {
        mesh.updateMatrixWorld(true)
        const geom = mesh.geometry as BufferGeometry
        if (!geom.boundingBox) geom.computeBoundingBox()
        const bb = geom.boundingBox
        if (!bb) return { mesh, score: Number.POSITIVE_INFINITY }
        const local = new Vector3().subVectors(bb.max, bb.min)
        const scale = new Vector3()
        mesh.getWorldScale(scale)
        const dims = [
          Math.abs(local.x * scale.x),
          Math.abs(local.y * scale.y),
          Math.abs(local.z * scale.z),
        ].sort((a, b) => b - a)
        const area = Math.max(dims[0] ?? 1, 1e-6) * Math.max(dims[1] ?? 1, 1e-6)
        const thickness = Math.max(dims[2] ?? 0, 1e-6)
        const planarityPenalty = thickness / Math.max(dims[0] ?? 1, 1e-6)
        return { mesh, score: area + planarityPenalty * 1000 }
      })
      .sort((a, b) => a.score - b.score)
    return scored[0]?.mesh ?? byMetal[0]!
  }
  return null
}

function planeSizeForMesh(mesh: Mesh): { width: number; height: number } {
  mesh.updateMatrixWorld(true)
  const geom = mesh.geometry as BufferGeometry
  if (!geom.boundingBox) geom.computeBoundingBox()
  const bb = geom.boundingBox
  if (!bb) return { width: 1, height: 1 }
  const local = new Vector3()
  local.subVectors(bb.max, bb.min)
  const meshScale = new Vector3()
  mesh.getWorldScale(meshScale)
  const sx = Math.abs(local.x * meshScale.x)
  const sy = Math.abs(local.y * meshScale.y)
  const sz = Math.abs(local.z * meshScale.z)
  const dims = [sx, sy, sz].filter((d) => d > 1e-4).sort((a, b) => b - a)
  const width = Math.max(dims[0] ?? 1, 0.1)
  const height = Math.max(dims[1] ?? dims[0] ?? 1, 0.1)
  return { width, height }
}

/**
 * Replaces the mirror/glass mesh with a three.js Reflector (real-time scene reflection).
 */
export function replaceMeshWithSceneReflector(
  mesh: Mesh,
  renderer: WebGLRenderer,
): MirrorReflectorSetup | null {
  const parent = mesh.parent
  if (!parent) return null

  const { width, height } = planeSizeForMesh(mesh)
  const pr = Math.min(renderer.getPixelRatio(), 2)
  const rw = renderer.domElement.width
  const rh = renderer.domElement.height

  const reflector = new Reflector(new PlaneGeometry(width, height), {
    color: 0xffffff,
    clipBias: 0.003,
    textureWidth: Math.floor(rw * pr),
    textureHeight: Math.floor(rh * pr),
    multisample: 4,
  })

  const pos = new Vector3()
  const quat = new Quaternion()
  const scl = new Vector3()
  mesh.matrixWorld.decompose(pos, quat, scl)
  reflector.position.copy(pos)
  reflector.quaternion.copy(quat)
  reflector.scale.copy(scl)

  reflector.userData.groupName = 'mirror'
  mesh.visible = false
  parent.add(reflector)

  const rt = reflector.getRenderTarget()

  const resizeReflection = () => {
    const pr2 = Math.min(renderer.getPixelRatio(), 2)
    const ww = renderer.domElement.width
    const hh = renderer.domElement.height
    rt.setSize(Math.floor(ww * pr2), Math.floor(hh * pr2))
  }

  const dispose = () => {
    reflector.dispose()
    reflector.geometry.dispose()
  }

  return { reflector, dispose, resizeReflection }
}

/** Scale and place model so it sits on y=0 and fits roughly in maxDim. */
export function fitModelToGround(root: Object3D, maxDim = 4): void {
  root.position.set(0, 0, 0)
  root.scale.set(1, 1, 1)
  root.updateMatrixWorld(true)
  const box = new Box3().setFromObject(root)
  const size = new Vector3()
  box.getSize(size)
  const m = Math.max(size.x, size.y, size.z, 1e-6)
  const s = maxDim / m
  root.scale.setScalar(s)
  root.updateMatrixWorld(true)
  const box2 = new Box3().setFromObject(root)
  root.position.y -= box2.min.y
  root.updateMatrixWorld(true)
}
