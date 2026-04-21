import { useEffect, useRef, useState } from 'react'
import {
  ACESFilmicToneMapping,
  AlwaysStencilFunc,
  AmbientLight,
  BackSide,
  Box3,
  BoxGeometry,
  Color,
  DirectionalLight,
  EqualStencilFunc,
  KeepStencilOp,
  EquirectangularReflectionMapping,
  FloatType,
  Fog,
  Group,
  Mesh,
  MeshBasicMaterial,
  CanvasTexture,
  LinearFilter,
  MeshStandardMaterial,
  MeshToonMaterial,
  PerspectiveCamera,
  Plane,
  PlaneGeometry,
  PMREMGenerator,
  Raycaster,
  ReplaceStencilOp,
  Scene,
  ShaderMaterial,
  SkinnedMesh,
  SRGBColorSpace,
  Texture,
  Euler,
  Quaternion,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import { GroundedSkybox } from 'three/examples/jsm/objects/GroundedSkybox.js'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import {
  applyFpsHandToonMaterials,
  applyFpsHandUnlitDebugMaterial,
  fitFpsHandRoot,
  hideOppositeHand,
} from '../Hand/fpsHandModel'
import { LoadingGraph } from './LoadingGraph'

/**
 * Intro: HDRI / ground + `mirror.glb`, FPS hand from `fps-hands.glb`.
 */
/** `console.log` after mirror / hand GLB fit. Default off — HMR re-runs the effect and spams the console. */
const INTRO_ASSET_LOAD_LOG = false

/** Clear color + fog + ground until HDRI loads. */
const GRASS = 0x4a7c4e

const DEFAULT_HAND_GLB = '/fps-hands.glb'
/** Mirror model: `public/mirror.glb` in this app → URL `/mirror.glb`. */
const COMBINED_SCENE_GLB = '/mirror.glb'

/** Equirect paths (EXR/HDR). */
const ENV_MAP_URLS = ['/garden.exr'] as const

/** PMREM for IBL; visible sky uses ground-projected HDR (three.js#23512 → `GroundedSkybox`). */
const ENABLE_HDR_ENV = true

/**
 * Ground-projected environment (see https://github.com/mrdoob/three.js/issues/23512 ):
 * `new GroundedSkybox(equirect, height, radius, resolution)` — height ≈ camera height above ground in the HDRI;
 * larger height magnifies the lower hemisphere / flattens the horizon; radius must enclose the camera.
 */
const GROUNDED_SKYBOX_HEIGHT = 15
const GROUNDED_SKYBOX_RADIUS = 70
const GROUNDED_SKYBOX_RESOLUTION = 128

/** World Y rotation (radians) for the loaded equirect: PMREM background + IBL + `GroundedSkybox` mesh. */
const HDRI_ROTATION_Y = Math.PI / 2

/** XZ floor tint; keep low so HDRI ground still reads through. */
const FLOOR_PLANE_OPACITY = 0.5

/** Logical floor height (world Y). Mirror + `fitModelToGround` use this. */
const FLOOR_WORLD_Y = -1

/**
 * POV walk (WASD on XZ), same idea as Amyliu2003/storytelling-final `main.js` (`updatePlayer` + view yaw).
 * No mesh-BVH here — only a minimum eye height above `FLOOR_WORLD_Y`.
 * @see https://github.com/Amyliu2003/storytelling-final/blob/main/main.js
 */
const POV_WALK_SPEED = 4.8
const POV_WALK_MIN_EYE_Y = 1.55

/** Uniform scale after `fitFpsHandRoot` — higher = larger in frame (FPS arms). */
const HAND_TARGET_SIZE = 4

/**
 * Camera-local space (meters): +X right, +Y up, −Z forward into the scene.
 * FPS reference: dominant hand sits **lower-left** (−X, −Y), slightly in front (−Z).
 */
const HAND_BASE_X_MAG = 0.44
/** Camera-local Y (m); negative pulls toward bottom of view. `0` keeps rig in frame when pitch is steep down. */
const HAND_BASE_Y = 0
/** More negative = closer to lens; if off-screen, try ~−0.4. */
const HAND_BASE_Z = -0.4

/**
 * `fitFpsHandRoot` puts the **whole** rig AABB center at origin (≈ torso). Shift `root` so the visible
 * hand / wrist sits nearer the rig origin; tune if still off-screen.
 */
const HAND_MODEL_OFFSET_X = 0.3
const HAND_MODEL_OFFSET_Y = -0.5
const HAND_MODEL_OFFSET_Z = 0

/**
 * Base aim (radians, YXZ) before mouse sway — **zero first**, tune after position reads right.
 * Visible but wrong facing → raise these; not in view → fix `HAND_BASE_*` position instead.
 */
const HAND_BASE_ROT_X = 0
const HAND_BASE_ROT_Y = 0
const HAND_BASE_ROT_Z = 0

const HAND_IDLE_SWAY_X = 0.003
const HAND_IDLE_SWAY_Y = 0.002
const HAND_ROT_Y_MUL = 0.1
const HAND_ROT_X_MUL = 0.06
/** Mouse-driven rotation lags behind the target each frame (0–1). */
const HAND_ROT_LAG = 0.1
const HAND_ROT_Z_LAG = 0.12

/**
 * 小黄块在 `handRig` 原点（与 GLB 同一变换）。不要用「无深度 + 高 renderOrder」的大片叠在视口上，会盖住 SkinnedMesh 手。
 */
const HAND_DEBUG_PROBE_CUBE = true
const HAND_DEBUG_PROBE_CUBE_SIZE = 0.14

/** TEMP: spin GLB root every frame — if mesh renders you’ll see a blur of motion; set `false` when done. */
const HAND_DEBUG_SPIN = true
/** Radians/sec on each axis (after base X = π/2). Crank up if still hard to spot. */
const HAND_DEBUG_SPIN_X = 3.5
const HAND_DEBUG_SPIN_Y = 5
const HAND_DEBUG_SPIN_Z = 2.3

const DRAG_LOOK_SENS = 0.005
const MAX_PITCH = Math.PI / 2 - 0.12
const CLICK_MAX_DELTA = 8

/** Wheel dolly off — drag orbit still works; `preventDefault` still blocks page scroll. */
const LOCK_INTRO_CAMERA_ZOOM = true

/** `window.alert` when clicking the mirror mesh — off for layout / transform work. */
const ENABLE_MIRROR_CLICK_ALERT = false

/** Hide debug HUD overlays (raycast + camera live box). */
const SHOW_INTRO_CAMERA_UI = false

const JABBERWOCKY_STANZAS_1_2 = `'Twas brillig, and the slithy toves
  Did gyre and gimble in the wabe;
All mimsy were the borogoves,
  And the mome raths outgrabe.

"Beware the Jabberwock, my son!
  The jaws that bite, the claws that catch!
Beware the Jubjub bird, and shun
  The frumious Bandersnatch!"`

function makeJabberwockyEngravingTexture(): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 1024
  const ctx = c.getContext('2d')
  if (!ctx) return c

  ctx.clearRect(0, 0, c.width, c.height)
  // Keep the alpha map crisp: any blur creates a “haze” across the whole mirror plane.
  ctx.globalAlpha = 1
  ctx.shadowBlur = 0
  ctx.shadowColor = 'rgba(0,0,0,0)'
  ctx.translate(c.width / 2, c.height / 2)
  ctx.scale(-1, 1) // mirrored / illegible
  ctx.translate(-c.width / 2, -c.height / 2)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(255,255,255,1)'

  const lines = JABBERWOCKY_STANZAS_1_2.split('\n')
  const fontSize = 44
  ctx.font = `${fontSize}px "IM Fell English", "I.M. Fell English", Georgia, serif`

  const startY = c.height / 2 - ((lines.length - 1) * (fontSize * 1.15)) / 2
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    ctx.fillText(line, c.width / 2, startY + i * fontSize * 1.15)
  }

  return c
}

/** GLB mesh name for the mirror glass (separate export); frame stays as `tripo_part_11`. */
const MIRROR_GLASS_MESH_NAME = 'tripo_part_9'

/**
 * Glass writes the mirror stencil mask on this layer only.
 * Reflector’s internal `PerspectiveCamera` stays on layer 0, so the mask is not drawn into the reflection RT.
 */
const MIRROR_STENCIL_LAYER = 1

/**
 * `Reflector` must stay a single plane (library uses one mirror plane). Stencil uses real glass tris.
 * Use the smaller glass axis at most (`≤ 1.0`); larger values extend the square past the oval and show corners.
 */
const MIRROR_REFLECTOR_PLANE_SCALE = 1.15

/**
 * Max dimension after uniform fit — lower = smaller mirror on the floor (`FLOOR_WORLD_Y`).
 */
const MIRROR_MAX_DIM = 1.0

/** Floor anchor from scene raycast (XZ); `mirrorRoot.y` matches `FLOOR_WORLD_Y` at feet. */
const MIRROR_WORLD_X = 0
const MIRROR_WORLD_Z = 2

/**
 * “镜子旁” vs “FPS”：
 *
 * 1. **父节点**：FPS 时 `camera.add(handRig)` + `scene.add(camera)`，手部偏移为**相机局部**坐标；镜子旁调试时 `scene.add(handRig)` + 世界坐标。
 * 2. **缩放**：`fitFpsHandRoot` 用 `HAND_DEBUG_FIT_MAX_DIM` vs `HAND_TARGET_SIZE`。
 * 3. **每帧**：镜子旁用世界坐标 + yaw/lookAt；FPS 用局部 `position` + 视差 `quaternion`（相对相机，不再乘 `camera.quaternion`）。
 * 4. **独立**：`HAND_DEBUG_UNLIT`、`HAND_DEBUG_SKIP_HIDE_OPPOSITE`。
 */
const HAND_DEBUG_BESIDE_MIRROR = false

/**
 * World-space anchor next to the mirror (meters). Only used when `HAND_DEBUG_BESIDE_MIRROR`.
 */
const HAND_DEBUG_WORLD_X = MIRROR_WORLD_X + 1.05
const HAND_DEBUG_WORLD_Y = FLOOR_WORLD_Y + 2.15
const HAND_DEBUG_WORLD_Z = MIRROR_WORLD_Z + 0.55

/** Hot-pink unlit (ignores lights / toon). Turn `false` once the mesh is visible. */
const HAND_DEBUG_UNLIT = true
/** Debug beside mirror: skip `hideOppositeHand`. Default `false` — show one hand in FPS. */
const HAND_DEBUG_SKIP_HIDE_OPPOSITE = false
/** Debug: yaw toward camera instead of `lookAt` + `rotateY(PI)` (can point the mesh away). */
const HAND_DEBUG_YAW_TO_CAMERA = true
/** Uniform scale: max bounding dimension after `fitFpsHandRoot` (bigger = larger on screen). */
const HAND_DEBUG_FIT_MAX_DIM = 5.2

/** Intro camera pose (HUD capture). `rotation` is radians, order YXZ — do not call `lookAt` after this. */
const INTRO_CAMERA_POSITION = Object.freeze({ x: -0.412, y: 2.5, z: 3.793 })
/** Yaw is stored in [-π, π] (equivalent to older −7.24 rad “extra spins”). */
const INTRO_CAMERA_ROTATION_YXZ = Object.freeze({ x: -1.2708, y: -0.9568146928204138, z: 0 })

function loadEquirectTexture(
  url: string,
  onLoad: (tex: Texture) => void,
  onError: (err: unknown) => void,
): void {
  const lower = url.toLowerCase()
  if (lower.endsWith('.exr')) {
    const exr = new EXRLoader()
    // Default HalfFloat clips/warns on bright EXRs (e.g. garden.exr); float32 keeps full HDR range.
    exr.type = FloatType
    exr.load(url, onLoad, undefined, onError)
  } else {
    new RGBELoader().load(url, onLoad, undefined, onError)
  }
}

/**
 * NDC for `Raycaster.setFromCamera` must match the **canvas element’s drawn rect** on screen.
 * Using `clientX / window.innerWidth` breaks picking when the canvas doesn’t fill the window 1:1
 * (layout, scrollbars, or CSS vs buffer size), so the ray no longer matches the pixel you see.
 */
function clientPositionToCanvasNdc(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  out: Vector2,
): void {
  const r = canvas.getBoundingClientRect()
  const rw = Math.max(r.width, 1e-6)
  const rh = Math.max(r.height, 1e-6)
  out.x = ((clientX - r.left) / rw) * 2 - 1
  out.y = -((clientY - r.top) / rh) * 2 + 1
}

function mirrorGlassPixelDims(): { w: number; h: number } {
  const dpr = Math.min(window.devicePixelRatio, 2)
  return {
    w: Math.max(1, Math.floor(window.innerWidth * dpr)),
    h: Math.max(1, Math.floor(window.innerHeight * dpr)),
  }
}

/**
 * Planar `Reflector` (required by three.js reflector math) + stencil from real glass tris (oval).
 * Glass stays `visible` (with `colorWrite: false`) so Three still traverses children — otherwise the Reflector never renders.
 */
function attachReflectorToMirrorGlass(glassMesh: Mesh): Reflector {
  // `glassMesh` must stay visible: `WebGLRenderer` skips `visible === false` subtrees, so a child Reflector would never render.
  const geo = glassMesh.geometry
  if (!geo.boundingBox) geo.computeBoundingBox()
  const bb = geo.boundingBox!
  const { min, max } = bb
  const sx = max.x - min.x
  const sy = max.y - min.y
  const sz = max.z - min.z
  const axes = [
    { k: 'x' as const, s: sx },
    { k: 'y' as const, s: sy },
    { k: 'z' as const, s: sz },
  ].sort((a, b) => a.s - b.s)
  const planeW = axes[2].s
  const planeH = axes[1].s
  const thin = axes[0].k
  const cx = (min.x + max.x) / 2
  const cy = (min.y + max.y) / 2
  const cz = (min.z + max.z) / 2
  const shortSide = Math.min(planeW, planeH)
  const side = shortSide * MIRROR_REFLECTOR_PLANE_SCALE

  const { w: tw, h: th } = mirrorGlassPixelDims()
  const reflector = new Reflector(new PlaneGeometry(side, side), {
    color: new Color(0xaaaaaa),
    textureWidth: tw,
    textureHeight: th,
    clipBias: 0.003,
  })

  reflector.position.set(cx, cy, cz)
  if (thin === 'x') reflector.rotateY(Math.PI / 2)
  else if (thin === 'y') reflector.rotateX(-Math.PI / 2)
  reflector.translateZ(0.002)
  reflector.userData.groupName = 'mirror'

  const refMat = reflector.material as ShaderMaterial
  // Three ties `gl.STENCIL_TEST` to `material.stencilWrite`; when false, stencilFunc is never applied.
  // Use stencilWrite + writeMask 0 so we only TEST (Equal 1), without modifying the buffer.
  refMat.stencilWrite = true
  refMat.stencilWriteMask = 0
  refMat.stencilFunc = EqualStencilFunc
  refMat.stencilRef = 1
  refMat.stencilFail = KeepStencilOp
  refMat.stencilZFail = KeepStencilOp
  refMat.stencilZPass = KeepStencilOp
  refMat.polygonOffset = true
  refMat.polygonOffsetFactor = -0.5
  refMat.polygonOffsetUnits = -0.5
  reflector.renderOrder = 1

  const prev = glassMesh.material
  if (Array.isArray(prev)) prev.forEach((m) => m.dispose())
  else prev.dispose()

  const glassStencilMat = new MeshBasicMaterial({ depthWrite: false })
  glassStencilMat.colorWrite = false
  glassStencilMat.stencilWrite = true
  glassStencilMat.stencilFunc = AlwaysStencilFunc
  glassStencilMat.stencilZPass = ReplaceStencilOp
  glassStencilMat.stencilRef = 1
  glassMesh.material = glassStencilMat
  glassMesh.renderOrder = 0
  glassMesh.layers.set(MIRROR_STENCIL_LAYER)
  glassMesh.visible = true

  glassMesh.add(reflector)

  return reflector
}

const MIRROR_ALERT_DEFAULT =
  'The mirror is cool to the touch. (Placeholder — replace with Carroll / llorrac copy.)'

/** Uniform scale so the GLB fits in-scene, then sit with feet at y = 0 in **parent** space (place parent at `FLOOR_WORLD_Y` for world floor). */
function fitModelToGround(root: Group, maxDim = 4.2): void {
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

export type IntroScene3DProps = {
  handGlbPath?: string
  handSide?: 'left' | 'right'
  mirrorAlertMessage?: string
  /** When true, clicking the mirror starts the suck transition. */
  allowMirrorClickToSuck?: boolean
  /** Increment to trigger an automatic mirror suck (used for the “flip” after customization confirm). */
  mirrorSuckRequestId?: number
  /** Click the mirror glass (or any child of `mirrorRoot`) to start the “sucked into mirror” transition. */
  onMirrorSuckComplete?: () => void
  /** Unedited mirror GLB (served from /public). */
  sceneGlbPath?: string
  /**
   * Equirectangular HDR (`.hdr`) or OpenEXR (`.exr`) paths, in order.
   * Default: `/garden.exr` from `public/`.
   */
  environmentMapUrls?: readonly string[]
}

export function IntroScene3D({
  handGlbPath = DEFAULT_HAND_GLB,
  handSide = 'left',
  mirrorAlertMessage = MIRROR_ALERT_DEFAULT,
  allowMirrorClickToSuck = false,
  mirrorSuckRequestId = 0,
  onMirrorSuckComplete,
  sceneGlbPath = COMBINED_SCENE_GLB,
  environmentMapUrls = ENV_MAP_URLS,
}: IntroScene3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cameraHudPreRef = useRef<HTMLPreElement>(null)
  /** Latest HUD text (also used for copy / log); updated every frame in the rAF loop. */
  const lastCameraHudTextRef = useRef('')
  const mirrorAlertRef = useRef(mirrorAlertMessage)
  const onMirrorSuckCompleteRef = useRef(onMirrorSuckComplete)
  const [raycastDebug, setRaycastDebug] = useState('')
  const [cameraLogLines, setCameraLogLines] = useState<{ id: number; text: string }[]>([])
  const cameraLogIdRef = useRef(0)
  /** HDRI + mirror GLB + hand GLB finished loading (does not control overlay timing by itself). */
  const [hdriGlbReady, setHdriGlbReady] = useState(false)
  const [loadOverlayDismissed, setLoadOverlayDismissed] = useState(false)

  useEffect(() => {
    mirrorAlertRef.current = mirrorAlertMessage
  }, [mirrorAlertMessage])

  useEffect(() => {
    onMirrorSuckCompleteRef.current = onMirrorSuckComplete
  }, [onMirrorSuckComplete])

  const allowMirrorClickRef = useRef(allowMirrorClickToSuck)
  useEffect(() => {
    allowMirrorClickRef.current = allowMirrorClickToSuck
  }, [allowMirrorClickToSuck])

  const mirrorSuckRequestIdRef = useRef(mirrorSuckRequestId)
  useEffect(() => {
    mirrorSuckRequestIdRef.current = mirrorSuckRequestId
  }, [mirrorSuckRequestId])

  // Starts faintly visible (storyboard: text exists, becomes legible as you approach).
  const jabberwockyOpacityRef = useRef(0.5)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let cancelled = false
    queueMicrotask(() => {
      setHdriGlbReady(false)
      setLoadOverlayDismissed(false)
    })
    const scene = new Scene()
    scene.fog = new Fog(GRASS, 14, 48)

    /** Ground plane at `FLOOR_WORLD_Y` (XZ) — raycast fallback when no mesh is hit. */
    const floorPlaneWorld = new Plane(new Vector3(0, 1, 0), -FLOOR_WORLD_Y)
    const raycastPlaneHit = new Vector3()
    const raycastAlongRay = new Vector3()

    // Camera angle / framing — FOV: `PerspectiveCamera` 1st arg (degrees). Drag adds yaw/pitch on top.
    const camera = new PerspectiveCamera(46, 1, 0.1, 120)
    camera.rotation.order = 'YXZ'
    camera.position.set(INTRO_CAMERA_POSITION.x, INTRO_CAMERA_POSITION.y, INTRO_CAMERA_POSITION.z)
    camera.rotation.set(
      INTRO_CAMERA_ROTATION_YXZ.x,
      INTRO_CAMERA_ROTATION_YXZ.y,
      INTRO_CAMERA_ROTATION_YXZ.z,
    )
    // Stable yaw range — huge multi-turn values break mental model; drag loop also wraps each move.
    camera.rotation.y = Math.atan2(Math.sin(camera.rotation.y), Math.cos(camera.rotation.y))
    camera.layers.enable(MIRROR_STENCIL_LAYER)

    const renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      stencil: true,
      powerPreference: 'high-performance',
    })
    renderer.setClearColor(GRASS, 1)
    renderer.shadowMap.enabled = false
    renderer.outputColorSpace = SRGBColorSpace
    renderer.toneMapping = ACESFilmicToneMapping
    renderer.toneMappingExposure = 1

    let pmrem: PMREMGenerator | null = null
    let envTarget: WebGLRenderTarget | null = null
    let groundedSkybox: GroundedSkybox | null = null
    let envEquirectTex: Texture | null = null

    const envMapPromise = new Promise<void>((resolve) => {
      if (!ENABLE_HDR_ENV) {
        resolve()
        return
      }
      pmrem = new PMREMGenerator(renderer)
      pmrem.compileEquirectangularShader()

      const tryLoadEnvMap = (index: number) => {
        if (cancelled || index >= environmentMapUrls.length) {
          resolve()
          return
        }
        if (!pmrem) {
          resolve()
          return
        }
        const url = environmentMapUrls[index]
        loadEquirectTexture(
          url,
          (tex) => {
            if (cancelled) {
              tex.dispose()
              resolve()
              return
            }
            tex.mapping = EquirectangularReflectionMapping
            envTarget = pmrem!.fromEquirectangular(tex)
            const envMap = envTarget.texture
            scene.environment = envMap
            // Fills any gap / confirms EXR+PMREM; avoids “only clearColor” if sky mesh misses pixels.
            scene.background = envMap
            scene.backgroundRotation.y = HDRI_ROTATION_Y
            scene.environmentRotation.y = HDRI_ROTATION_Y

            const skybox = new GroundedSkybox(
              tex,
              GROUNDED_SKYBOX_HEIGHT,
              GROUNDED_SKYBOX_RADIUS,
              GROUNDED_SKYBOX_RESOLUTION,
            )
            skybox.rotation.y = HDRI_ROTATION_Y
            // Official helper: put projected ground through world origin (three.js GroundedSkybox.js)
            skybox.position.y = GROUNDED_SKYBOX_HEIGHT + FLOOR_WORLD_Y
            const skyMat = skybox.material as MeshBasicMaterial
            // Camera sits *inside* the sphere: FrontSide culls the interior → only clearColor showed.
            skyMat.side = BackSide
            skyMat.fog = false
            scene.add(skybox)
            groundedSkybox = skybox
            envEquirectTex = tex
            resolve()
          },
          (err) => {
            if (cancelled) {
              resolve()
              return
            }
            console.warn('[IntroScene3D] env map failed:', url, err)
            tryLoadEnvMap(index + 1)
          },
        )
      }
      tryLoadEnvMap(0)
    })

    const ground = new Mesh(
      new PlaneGeometry(80, 80),
      new MeshToonMaterial({
        color: GRASS,
        transparent: true,
        opacity: FLOOR_PLANE_OPACITY,
        depthWrite: false,
      }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.set(0, FLOOR_WORLD_Y, 0)
    scene.add(ground)

    const mirrorRoot = new Group()
    mirrorRoot.position.set(MIRROR_WORLD_X, FLOOR_WORLD_Y, MIRROR_WORLD_Z)
    scene.add(mirrorRoot)

    const mirrorGlassWorld = new Vector3()
    let mirrorGlassMesh: Mesh | null = null
    let jabberEngravingMesh: Mesh | null = null
    let jabberEngravingMat: MeshStandardMaterial | null = null
    let mirrorTransitionActive = false
    let pendingMirrorSuck = false
    let lastMirrorSuckRequestId = mirrorSuckRequestIdRef.current
    const mirrorTweenFromPos = new Vector3()
    const mirrorTweenToPos = new Vector3()
    let mirrorTweenT0 = 0
    const MIRROR_TWEEN_MS = 1500
    /** Stop just before the glass fills the view (meters). */
    const MIRROR_SUCK_STOP_DIST = 0.35
    const mirrorForward = new Vector3()

    const startMirrorSuck = (nowMs: number) => {
      if (!mirrorGlassMesh) return
      mirrorGlassMesh.getWorldPosition(mirrorGlassWorld)
      mirrorForward.copy(mirrorGlassWorld).sub(camera.position)
      if (mirrorForward.lengthSq() < 1e-10) return
      mirrorForward.normalize()

      mirrorTweenFromPos.copy(camera.position)

      // Stop close to the glass, but keep the mirror edge in view.
      mirrorTweenToPos.copy(mirrorGlassWorld).addScaledVector(mirrorForward, -MIRROR_SUCK_STOP_DIST)

      mirrorTweenT0 = nowMs
      mirrorTransitionActive = true
      pendingMirrorSuck = false
      dragLook = false
      syncCursor()
    }

    const amb = new AmbientLight(0xffffff, 0.55)
    scene.add(amb)
    const sun = new DirectionalLight(0xfff5e6, 0.95)
    sun.position.set(4, 6, 10)
    scene.add(sun)
    const fill = new DirectionalLight(0xb8c8e8, 0.35)
    fill.position.set(-3, -2, 4)
    scene.add(fill)

    const handRig = new Group()
    /** Loaded `gltf.scene`; used for optional `HAND_DEBUG_SPIN`. */
    let fpsHandRoot: Group | null = null
    /** FPS viewmodel: small euler offsets lerped from NDC (applied in camera-local space via quaternion). */
    let handViewYaw = 0
    let handViewPitch = 0
    let handViewRoll = 0
    const handQuatOffset = new Quaternion()

    // FPS: `handRig` is a child of `camera` so offsets are true camera-local (+X right, +Y up, −Z forward).
    // `scene.add(camera)` is required so camera children participate in the scene graph.
    // Mirror debug mode reparents the rig to `scene` and uses world coordinates.
    scene.add(camera)
    camera.add(handRig)

    if (HAND_DEBUG_PROBE_CUBE) {
      const small = new Mesh(
        new BoxGeometry(HAND_DEBUG_PROBE_CUBE_SIZE, HAND_DEBUG_PROBE_CUBE_SIZE, HAND_DEBUG_PROBE_CUBE_SIZE),
        new MeshBasicMaterial({ color: 0xffee22 }),
      )
      small.name = 'fpsHandRigProbeCube'
      small.frustumCulled = false
      handRig.add(small)
    }

    const handDebugLookScratch = new Vector3()

    const pickRaycaster = new Raycaster()
    pickRaycaster.layers.enable(MIRROR_STENCIL_LAYER)
    const ndc = new Vector2()
    const pickNdc = new Vector2()

    let lastPointerDownHadModifier = false

    let fwdPressed = false
    let bkdPressed = false
    let lftPressed = false
    let rgtPressed = false

    const isTypingTarget = (t: EventTarget | null) =>
      t instanceof HTMLInputElement ||
      t instanceof HTMLTextAreaElement ||
      (t instanceof HTMLElement && t.isContentEditable)

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return
      if (mirrorTransitionActive) return
      switch (e.code) {
        case 'KeyW':
          fwdPressed = true
          e.preventDefault()
          break
        case 'KeyS':
          bkdPressed = true
          e.preventDefault()
          break
        case 'KeyA':
          lftPressed = true
          e.preventDefault()
          break
        case 'KeyD':
          rgtPressed = true
          e.preventDefault()
          break
        default:
          break
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (mirrorTransitionActive) return
      switch (e.code) {
        case 'KeyW':
          fwdPressed = false
          break
        case 'KeyS':
          bkdPressed = false
          break
        case 'KeyA':
          lftPressed = false
          break
        case 'KeyD':
          rgtPressed = false
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    const walkForward = new Vector3()
    const walkRight = new Vector3()
    const walkMove = new Vector3()
    const worldUpWalk = new Vector3(0, 1, 0)

    let mouseX = window.innerWidth / 2
    let mouseY = window.innerHeight / 2

    let mirrorReflector: Reflector | null = null
    let dragLook = false
    let lastDragX = 0
    let lastDragY = 0

    let downX = 0
    let downY = 0

    const syncCursor = () => {
      if (dragLook) {
        canvas.style.cursor = 'grabbing'
        return
      }
      canvas.style.cursor = 'grab'
    }

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY

      if (mirrorTransitionActive) return
      if (dragLook) {
        const dx = e.clientX - lastDragX
        const dy = e.clientY - lastDragY
        lastDragX = e.clientX
        lastDragY = e.clientY
        camera.rotation.y -= dx * DRAG_LOOK_SENS
        camera.rotation.x -= dy * DRAG_LOOK_SENS
        camera.rotation.x = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, camera.rotation.x))
        // Keep yaw in a stable range so matrix / HUD don’t drift to huge multi-turn values.
        camera.rotation.y = Math.atan2(Math.sin(camera.rotation.y), Math.cos(camera.rotation.y))
      }
    }

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return
      if (mirrorTransitionActive) return
      downX = e.clientX
      downY = e.clientY
      lastPointerDownHadModifier = e.ctrlKey || e.metaKey
      if (lastPointerDownHadModifier) return
      dragLook = true
      lastDragX = e.clientX
      lastDragY = e.clientY
      syncCursor()
    }

    const onMouseUp = (e: MouseEvent) => {
      if (e.button !== 0) return
      if (mirrorTransitionActive) return
      dragLook = false
      syncCursor()

      const totalDelta = Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY)
      if (totalDelta > CLICK_MAX_DELTA) return

      // Use mousedown position (canvas): mouseup is on `window` — release coords can sit over HTML UI
      // or off-canvas while the user meant “I clicked the 3D view here”.
      clientPositionToCanvasNdc(downX, downY, canvas, pickNdc)
      pickRaycaster.setFromCamera(pickNdc, camera)

      // Debug: world hit
      const sceneHits = pickRaycaster.intersectObject(scene, true)
      if (sceneHits.length > 0) {
        const hit = sceneHits[0]
        const p = hit.point
        const name = hit.object.name || '(unnamed)'
        const line = `world (${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)}) · ${name} · dist ${hit.distance.toFixed(3)}`
        console.log('[IntroScene3D raycast]', line, { point: p.clone(), object: hit.object })
        setRaycastDebug(line)
      } else {
        // No geometry: still get a 3D point — intersect ray with floor plane, else a point along the ray.
        const onPlane = pickRaycaster.ray.intersectPlane(floorPlaneWorld, raycastPlaneHit)
        if (onPlane !== null) {
          const p = raycastPlaneHit
          const line = `plane y=${FLOOR_WORLD_Y} (${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)}) · no mesh`
          console.log('[IntroScene3D raycast]', line, { point: p.clone() })
          setRaycastDebug(line)
        } else {
          const distAlong = 15
          pickRaycaster.ray.at(distAlong, raycastAlongRay)
          const p = raycastAlongRay
          const line = `along ray ${distAlong}u (${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)}) · no mesh (ray ∥ ground)`
          console.log('[IntroScene3D raycast]', line, { point: p.clone() })
          setRaycastDebug(line)
        }
      }

      if (ENABLE_MIRROR_CLICK_ALERT && !lastPointerDownHadModifier) {
        const mirrorHits = pickRaycaster.intersectObject(mirrorRoot, true)
        if (mirrorHits.length === 0) return
        window.alert(mirrorAlertRef.current)
      }

      if (!lastPointerDownHadModifier) {
        const mirrorHits = pickRaycaster.intersectObject(mirrorRoot, true)
        if (mirrorHits.length > 0 && onMirrorSuckCompleteRef.current && allowMirrorClickRef.current) {
          const o = mirrorHits[0]!.object
          mirrorGlassMesh = o instanceof Mesh ? o : mirrorGlassMesh
          startMirrorSuck(performance.now())
        }
      }
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (LOCK_INTRO_CAMERA_ZOOM) return
      const dir = new Vector3()
      camera.getWorldDirection(dir)
      camera.position.addScaledVector(dir, e.deltaY * 0.004)
    }

    window.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('wheel', onWheel, { passive: false })

    const loader = new GLTFLoader()
    const mirrorGlbPromise = new Promise<void>((resolve) => {
      loader.load(
        sceneGlbPath,
        (gltf) => {
          if (cancelled) {
            resolve()
            return
          }
          const mirrorGroup = gltf.scene as Group
        mirrorRoot.add(mirrorGroup)

        // Fit → lay on floor (`FLOOR_WORLD_Y`) → +90° on Y → fit again (smaller MIRROR_MAX_DIM).
        fitModelToGround(mirrorGroup, MIRROR_MAX_DIM)
        // mirrorGroup.rotation.x = Math.PI / 2
        mirrorGroup.rotation.y = -Math.PI / 2 * 1
        mirrorGroup.rotation.z = Math.PI / 2
        fitModelToGround(mirrorGroup, MIRROR_MAX_DIM)
        mirrorGroup.updateMatrixWorld(true)

        const maxAniso = renderer.capabilities.getMaxAnisotropy()
        mirrorGroup.traverse((obj) => {
          if (!(obj instanceof Mesh)) return
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
          for (const m of mats) {
            if (!m) continue
            const rec = m as unknown as Record<string, unknown>
            for (const key of [
              'map',
              'alphaMap',
              'bumpMap',
              'normalMap',
              'specularMap',
              'roughnessMap',
              'metalnessMap',
              'emissiveMap',
              'envMap',
              'lightMap',
              'aoMap',
            ] as const) {
              const jstexture = rec[key]
              if (jstexture instanceof Texture) {
                jstexture.anisotropy = maxAniso
              }
            }
          }
        })

        const size = new Vector3()
        new Box3().setFromObject(mirrorGroup).getSize(size)
        if (INTRO_ASSET_LOAD_LOG) {
          console.log(
            `[IntroScene3D] mirror size (after fit): ${size.x.toFixed(3)} × ${size.y.toFixed(3)} × ${size.z.toFixed(3)}`,
          )
        }

        mirrorGroup.traverse((obj) => {
          if (!(obj instanceof Mesh) || obj.name !== MIRROR_GLASS_MESH_NAME) return
          mirrorGlassMesh = obj

          // Engraved Jabberwocky overlay: a thin plane in front of the reflector/glass.
          // (Reflector itself is a separate plane; glass mesh is stencil-only.)
          if (jabberEngravingMesh) {
            jabberEngravingMesh.parent?.remove(jabberEngravingMesh)
            jabberEngravingMesh.geometry.dispose()
            jabberEngravingMat?.dispose()
            jabberEngravingMesh = null
            jabberEngravingMat = null
          }
          const texCanvas = makeJabberwockyEngravingTexture()
          const alphaTex = new CanvasTexture(texCanvas)
          // Alpha maps + mipmaps can “bleed” and haze the whole plane. Keep it crisp.
          alphaTex.generateMipmaps = false
          alphaTex.minFilter = LinearFilter
          alphaTex.magFilter = LinearFilter
          alphaTex.needsUpdate = true
          jabberEngravingMat = new MeshStandardMaterial({
            // Very deep gray “engraving” (not glowing white).
            color: 0x1a1a1a,
            transparent: true,
            opacity: jabberwockyOpacityRef.current * 0.55,
            alphaMap: alphaTex,
            roughness: 1,
            metalness: 0,
            depthWrite: false,
          })
          jabberEngravingMat.alphaTest = 0.12

          // Match the reflector plane sizing/orientation logic.
          const geo = obj.geometry
          if (!geo.boundingBox) geo.computeBoundingBox()
          const bb = geo.boundingBox!
          const { min, max } = bb
          const sx = max.x - min.x
          const sy = max.y - min.y
          const sz = max.z - min.z
          const axes = [
            { k: 'x' as const, s: sx },
            { k: 'y' as const, s: sy },
            { k: 'z' as const, s: sz },
          ].sort((a, b) => a.s - b.s)
          const planeW = axes[2].s
          const planeH = axes[1].s
          const thin = axes[0].k
          const cx = (min.x + max.x) / 2
          const cy = (min.y + max.y) / 2
          const cz = (min.z + max.z) / 2
          const shortSide = Math.min(planeW, planeH)
          const side = shortSide * MIRROR_REFLECTOR_PLANE_SCALE

          jabberEngravingMesh = new Mesh(new PlaneGeometry(side, side), jabberEngravingMat)
          jabberEngravingMesh.position.set(cx, cy, cz)
          if (thin === 'x') jabberEngravingMesh.rotateY(Math.PI / 2)
          else if (thin === 'y') jabberEngravingMesh.rotateX(-Math.PI / 2)
          // Nudge toward camera slightly to avoid z-fighting with reflector.
          jabberEngravingMesh.translateZ(0.0035)
          jabberEngravingMesh.renderOrder = 20
          obj.add(jabberEngravingMesh)

          if (mirrorReflector) {
            mirrorReflector.dispose()
            mirrorReflector.parent?.remove(mirrorReflector)
            mirrorReflector = null
          }
          mirrorReflector = attachReflectorToMirrorGlass(obj)
        })

          resolve()
        },
        undefined,
        (err) => {
          console.warn('[IntroScene3D] scene GLB failed:', sceneGlbPath, err)
          resolve()
        },
      )
    })

    const handGlbPromise = new Promise<void>((resolve) => {
      loader.load(
        handGlbPath,
        (gltf) => {
          if (cancelled) {
            resolve()
            return
          }
          const root = gltf.scene
        if (HAND_DEBUG_UNLIT) {
          applyFpsHandUnlitDebugMaterial(root)
        } else {
          applyFpsHandToonMaterials(root)
        }
        if (!HAND_DEBUG_SKIP_HIDE_OPPOSITE) {
          hideOppositeHand(root, handSide)
        }
        // 与 FPS 对照时若只关心位置，可暂时改为始终 `HAND_TARGET_SIZE`，避免尺度差掩盖问题。
        const fitDim = HAND_DEBUG_BESIDE_MIRROR ? HAND_DEBUG_FIT_MAX_DIM : HAND_TARGET_SIZE
        fitFpsHandRoot(root, fitDim)
        root.position.x += HAND_MODEL_OFFSET_X
        root.position.y += HAND_MODEL_OFFSET_Y
        root.position.z += HAND_MODEL_OFFSET_Z
        root.updateMatrixWorld(true)
        root.traverse((o) => {
          if (o instanceof SkinnedMesh) {
            o.frustumCulled = false
            o.computeBoundingSphere()
          }
        })
        const bb = new Box3().setFromObject(root)
        const sz = new Vector3()
        bb.getSize(sz)
        if (INTRO_ASSET_LOAD_LOG) {
          console.log(
            `[IntroScene3D] hand AABB (after fit): ${sz.x.toFixed(3)} × ${sz.y.toFixed(3)} × ${sz.z.toFixed(3)}`,
          )
        }

        // `fps-hands.glb` rest pose may point up/back; nudge so the arm roughly faces camera −Z.
        root.rotation.set(Math.PI / 2, 0, 0)

        handRig.add(root)
        fpsHandRoot = root
        // Viewmodel under `camera`: frustum culling uses mesh bounding volumes; parented to camera can
        // yield false negatives — disable culling on all drawables (SkinnedMesh extends Mesh).
        root.traverse((obj) => {
          if (obj instanceof Mesh) {
            obj.frustumCulled = false
          }
        })
          resolve()
        },
        undefined,
        (err) => {
          console.warn('[IntroScene3D] fps hand GLB failed:', handGlbPath, err)
          resolve()
        },
      )
    })

    void Promise.all([envMapPromise, mirrorGlbPromise, handGlbPromise]).then(() => {
      if (!cancelled) setHdriGlbReady(true)
    })

    let raf = 0
    const resize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      camera.aspect = w / Math.max(h, 1)
      camera.updateProjectionMatrix()
      const pr = Math.min(window.devicePixelRatio, 2)
      renderer.setPixelRatio(pr)
      renderer.setSize(w, h, false)
      if (mirrorReflector) {
        const { w: rw, h: rh } = mirrorGlassPixelDims()
        mirrorReflector.getRenderTarget().setSize(rw, rh)
      }
    }
    resize()
    syncCursor()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const animT0 = performance.now()
    let lastFrameTime = animT0
    const tick = () => {
      if (cancelled) return
      raf = requestAnimationFrame(tick)
      const now = performance.now()
      const delta = Math.min((now - lastFrameTime) / 1000, 0.12)
      lastFrameTime = now
      const time = (now - animT0) / 1000
      mirrorRoot.rotation.z = Math.sin(time * 0.12) * 0.012

      const req = mirrorSuckRequestIdRef.current
      if (req !== lastMirrorSuckRequestId) {
        lastMirrorSuckRequestId = req
        pendingMirrorSuck = true
      }

      if (pendingMirrorSuck && !mirrorTransitionActive && mirrorGlassMesh) {
        startMirrorSuck(now)
      }

      if (mirrorTransitionActive) {
        const t = Math.max(0, Math.min(1, (now - mirrorTweenT0) / MIRROR_TWEEN_MS))
        // Strong ease-out: late motion is much slower (lingers once the text is legible).
        const ease = 1 - Math.pow(1 - t, 4)
        camera.position.lerpVectors(mirrorTweenFromPos, mirrorTweenToPos, ease)
        // Fade curve (no zero): 0.5 → 0.9 → 1.
        const e2 = ease <= 0.75 ? 0.5 + 0.4 * (ease / 0.75) : 0.9 + 0.1 * ((ease - 0.75) / 0.25)
        if (e2 > jabberwockyOpacityRef.current) {
          jabberwockyOpacityRef.current = e2
          if (jabberEngravingMat) {
            // Max opacity stays subtle; the “engraving” reads via contrast, not a white wash.
            jabberEngravingMat.opacity = e2 * 0.55
            jabberEngravingMat.needsUpdate = true
          }
        }
        if (t >= 1) {
          mirrorTransitionActive = false
          onMirrorSuckCompleteRef.current?.()
        }
      } else if (fwdPressed || bkdPressed || lftPressed || rgtPressed) {

        camera.getWorldDirection(walkForward)
        walkForward.y = 0
        if (walkForward.lengthSq() < 1e-12) {
          walkForward.set(-Math.sin(camera.rotation.y), 0, -Math.cos(camera.rotation.y))
        } else {
          walkForward.normalize()
        }
        walkRight.crossVectors(walkForward, worldUpWalk).normalize()
        walkMove.set(0, 0, 0)
        if (fwdPressed) walkMove.add(walkForward)
        if (bkdPressed) walkMove.sub(walkForward)
        if (rgtPressed) walkMove.add(walkRight)
        if (lftPressed) walkMove.sub(walkRight)
        if (walkMove.lengthSq() > 0) {
          walkMove.normalize().multiplyScalar(POV_WALK_SPEED * delta)
          camera.position.add(walkMove)
        }
        camera.position.y = Math.max(FLOOR_WORLD_Y + POV_WALK_MIN_EYE_Y, camera.position.y)
      }

      clientPositionToCanvasNdc(mouseX, mouseY, canvas, ndc)

      if (HAND_DEBUG_BESIDE_MIRROR) {
        if (handRig.parent !== scene) {
          scene.add(handRig)
        }
        handRig.position.set(
          HAND_DEBUG_WORLD_X + Math.sin(time * 0.8) * 0.015,
          HAND_DEBUG_WORLD_Y + Math.sin(time * 1.2) * 0.01,
          HAND_DEBUG_WORLD_Z,
        )
        if (HAND_DEBUG_YAW_TO_CAMERA) {
          const dx = camera.position.x - handRig.position.x
          const dz = camera.position.z - handRig.position.z
          handRig.rotation.set(0, Math.atan2(dx, dz) + Math.PI, 0)
        } else {
          handDebugLookScratch.copy(camera.position)
          handRig.lookAt(handDebugLookScratch)
          handRig.rotateY(Math.PI)
        }
      } else {
        if (handRig.parent !== camera) {
          camera.add(handRig)
        }
        // Camera-local viewmodel: parent is camera — world matrix applies camera pose automatically.
        const side = handSide === 'left' ? -1 : 1
        handRig.position.set(
          side * HAND_BASE_X_MAG + Math.sin(time * 0.8) * HAND_IDLE_SWAY_X,
          HAND_BASE_Y + Math.sin(time * 1.2) * HAND_IDLE_SWAY_Y,
          HAND_BASE_Z,
        )

        const targetRotY = ndc.x * HAND_ROT_Y_MUL + HAND_BASE_ROT_Y * side
        const targetRotX = ndc.y * HAND_ROT_X_MUL + HAND_BASE_ROT_X
        const targetRotZ = HAND_BASE_ROT_Z * side
        handViewYaw += (targetRotY - handViewYaw) * HAND_ROT_LAG
        handViewPitch += (targetRotX - handViewPitch) * HAND_ROT_LAG
        handViewRoll += (targetRotZ - handViewRoll) * HAND_ROT_Z_LAG

        handQuatOffset.setFromEuler(new Euler(handViewPitch, handViewYaw, handViewRoll, 'YXZ'))
        handRig.quaternion.copy(handQuatOffset)
      }

      if (HAND_DEBUG_SPIN && fpsHandRoot) {
        fpsHandRoot.rotation.set(
          Math.PI / 2 + time * HAND_DEBUG_SPIN_X,
          time * HAND_DEBUG_SPIN_Y,
          time * HAND_DEBUG_SPIN_Z,
        )
      }

      const p = camera.position
      const r = camera.rotation
      const hud = [
        `position  ${p.x.toFixed(3)}  ${p.y.toFixed(3)}  ${p.z.toFixed(3)}`,
        `rotation  ${r.x.toFixed(4)}  ${r.y.toFixed(4)}  ${r.z.toFixed(4)}  rad (order YXZ)`,
        '',
        `camera.position.set(${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)})`,
        `camera.rotation.set(${r.x.toFixed(4)}, ${r.y.toFixed(4)}, ${r.z.toFixed(4)})`,
      ].join('\n')
      lastCameraHudTextRef.current = hud
      const hudEl = cameraHudPreRef.current
      if (hudEl) hudEl.textContent = hud

      camera.updateMatrixWorld(true)
      renderer.render(scene, camera)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      canvas.removeEventListener('wheel', onWheel)
      ro.disconnect()
      scene.environment = null
      scene.background = null
      if (groundedSkybox) {
        scene.remove(groundedSkybox)
        groundedSkybox.geometry.dispose()
        const sm = groundedSkybox.material
        if (!Array.isArray(sm)) sm.dispose()
        else sm.forEach((m) => m.dispose())
        groundedSkybox = null
      }
      if (envEquirectTex) {
        envEquirectTex.dispose()
        envEquirectTex = null
      }
      if (envTarget) {
        envTarget.dispose()
        envTarget = null
      }
      if (pmrem) {
        pmrem.dispose()
        pmrem = null
      }
      renderer.dispose()
      if (handRig.parent) {
        handRig.parent.remove(handRig)
      }
      scene.remove(camera)
      handRig.traverse((obj) => {
        if (obj instanceof Mesh) {
          const m = obj.material
          if (Array.isArray(m)) m.forEach((mat) => mat.dispose())
          else m.dispose()
          obj.geometry.dispose()
        }
      })
      if (mirrorReflector) {
        mirrorReflector.dispose()
        mirrorReflector.parent?.remove(mirrorReflector)
        mirrorReflector = null
      }
      mirrorRoot.traverse((obj) => {
        if (!(obj instanceof Mesh)) return
        if ('isReflector' in obj && obj.isReflector) return
        const m = obj.material
        if (Array.isArray(m)) m.forEach((mat) => mat.dispose())
        else m.dispose()
        obj.geometry.dispose()
      })
      ground.geometry.dispose()
      ;(ground.material as MeshToonMaterial).dispose()
    }
  }, [environmentMapUrls, handGlbPath, handSide, sceneGlbPath])

  return (
    <>
      {!loadOverlayDismissed ? (
        <LoadingGraph assetsLoaded={hdriGlbReady} onComplete={() => setLoadOverlayDismissed(true)} />
      ) : null}
      {SHOW_INTRO_CAMERA_UI && raycastDebug ? (
        <div
          style={{
            position: 'fixed',
            left: 12,
            bottom: 12,
            zIndex: 56,
            maxWidth: 'min(90vw, 28rem)',
            padding: '8px 10px',
            borderRadius: 8,
            fontFamily: 'ui-monospace, monospace',
            fontSize: 12,
            lineHeight: 1.4,
            color: '#e8f0e8',
            background: 'rgba(0,0,0,0.72)',
            pointerEvents: 'none',
          }}
        >
          <strong>raycast</strong> {raycastDebug}
        </div>
      ) : null}
      {SHOW_INTRO_CAMERA_UI ? (
      <div
        style={{
          position: 'fixed',
          top: 12,
          right: 12,
          zIndex: 57,
          maxWidth: 'min(92vw, 22rem)',
          padding: '10px 12px',
          borderRadius: 8,
          fontFamily: 'ui-monospace, monospace',
          fontSize: 11,
          lineHeight: 1.45,
          color: '#e8f0e8',
          background: 'rgba(0,0,0,0.78)',
          pointerEvents: 'auto',
        }}
      >
        <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 12 }}>camera (live)</div>
        <div style={{ fontSize: 10, opacity: 0.86, marginBottom: 8, lineHeight: 1.35 }}>
          <strong>WASD</strong> — POV walk on the ground plane (XZ, relative to where you look). Same idea as{' '}
          <a
            href="https://github.com/Amyliu2003/storytelling-final/blob/main/main.js"
            style={{ color: '#9ec8ff' }}
            target="_blank"
            rel="noreferrer"
          >
            storytelling-final
          </a>{' '}
          <code>updatePlayer</code> (no room collider / BVH here — eye height clamped above the floor).
        </div>
        <pre
          ref={cameraHudPreRef}
          style={{
            margin: 0,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            userSelect: 'text',
          }}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          <button
            type="button"
            onClick={() => void navigator.clipboard?.writeText(lastCameraHudTextRef.current)}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.25)',
              background: 'rgba(255,255,255,0.12)',
              color: '#f0f4f0',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            Copy
          </button>
          <button
            type="button"
            onClick={() =>
              setCameraLogLines((prev) => {
                const id = cameraLogIdRef.current++
                const text = `${new Date().toISOString().slice(11, 23)}  ${lastCameraHudTextRef.current.replace(/\n/g, ' | ')}`
                return [...prev.slice(-39), { id, text }]
              })
            }
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.25)',
              background: 'rgba(255,255,255,0.12)',
              color: '#f0f4f0',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            Log snapshot
          </button>
          {cameraLogLines.length > 0 ? (
            <button
              type="button"
              onClick={() => setCameraLogLines([])}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.25)',
                background: 'rgba(255,60,60,0.2)',
                color: '#ffc8c8',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              Clear log
            </button>
          ) : null}
        </div>
        {cameraLogLines.length > 0 ? (
          <div
            style={{
              marginTop: 10,
              maxHeight: 140,
              overflow: 'auto',
              fontSize: 10,
              opacity: 0.92,
              borderTop: '1px solid rgba(255,255,255,0.15)',
              paddingTop: 8,
            }}
          >
            {cameraLogLines.map(({ id, text }) => (
              <div key={id} style={{ marginBottom: 6 }}>
                {text}
              </div>
            ))}
          </div>
        ) : null}
      </div>
      ) : null}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'auto',
          zIndex: 55,
          cursor: 'grab',
        }}
      />
    </>
  )
}
