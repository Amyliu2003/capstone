import {
  Bone,
  Box3,
  DoubleSide,
  MeshBasicMaterial,
  MeshToonMaterial,
  Object3D,
  SkinnedMesh,
  Skeleton,
  Vector3,
} from 'three'

export const FPS_HAND_TOON_COLOR = 0xc8c0b8

function boneSubtreeScale(bone: Bone, s: number): void {
  bone.scale.setScalar(s)
  bone.children.forEach((ch) => {
    if (ch instanceof Bone) boneSubtreeScale(ch, s)
  })
}

function findBone(skeleton: Skeleton, ...candidates: string[]): Bone | undefined {
  for (const name of candidates) {
    const b = skeleton.bones.find((x) => x.name === name)
    if (b) return b
  }
  return undefined
}

/**
 * `fps-hands.glb` (Blender 4.x) uses **no dots** in bone names: `clavicleR` / `clavicleL`.
 * Older dotted names (`clavicle.R`) are still tried as fallback.
 * Collapse the **clavicle** subtree on the opposite side so one hand remains.
 */
export function hideOppositeHand(root: Object3D, keep: 'left' | 'right'): void {
  const skinned: SkinnedMesh[] = []
  root.traverse((o) => {
    if (o instanceof SkinnedMesh) skinned.push(o)
  })
  if (skinned.length === 0) return
  const skeleton = skinned[0].skeleton
  const hideRight = keep === 'left'
  const rootBone = hideRight
    ? findBone(skeleton, 'clavicleR', 'clavicle.R')
    : findBone(skeleton, 'clavicleL', 'clavicle.L')
  if (rootBone) {
    boneSubtreeScale(rootBone, 1e-6)
  } else {
    console.warn(
      '[fpsHandModel] hideOppositeHand: no clavicle bone found; both arms may show. Bone sample:',
      skeleton.bones.slice(0, 6).map((b) => b.name),
    )
  }
}

export function applyFpsHandToonMaterials(root: Object3D): void {
  root.traverse((obj) => {
    if (!(obj instanceof SkinnedMesh)) return
    obj.castShadow = false
    obj.receiveShadow = false
    const prev = obj.material
    if (Array.isArray(prev)) prev.forEach((m) => m.dispose())
    else prev.dispose()
    // Skinning is driven by `SkinnedMesh` + the renderer (r183+ no longer takes `skinning` on materials).
    obj.material = new MeshToonMaterial({
      color: FPS_HAND_TOON_COLOR,
      side: DoubleSide,
    })
  })
}

/**
 * Bright unlit material for debugging visibility (rules out lighting / toon shading).
 * Only replaces `SkinnedMesh` materials so bone deformation still runs.
 */
export function applyFpsHandUnlitDebugMaterial(root: Object3D): void {
  root.traverse((obj) => {
    if (!(obj instanceof SkinnedMesh)) return
    obj.castShadow = false
    obj.receiveShadow = false
    const prev = obj.material
    if (Array.isArray(prev)) prev.forEach((m) => m.dispose())
    else prev.dispose()
    obj.material = new MeshBasicMaterial({
      color: 0xff3355,
      side: DoubleSide,
      toneMapped: false,
    })
  })
}

/** Center model at origin and scale so its largest dimension equals `targetSize`. */
export function fitFpsHandRoot(root: Object3D, targetSize: number): void {
  root.updateMatrixWorld(true)
  const box = new Box3().setFromObject(root)
  const center = new Vector3()
  const size = new Vector3()
  box.getCenter(center)
  box.getSize(size)
  root.position.sub(center)
  const maxDim = Math.max(size.x, size.y, size.z, 1e-6)
  root.scale.setScalar(targetSize / maxDim)
}
