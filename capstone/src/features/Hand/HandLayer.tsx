import { useEffect, useRef, useState } from 'react'
import {
  Group,
  Mesh,
  OrthographicCamera,
  Plane,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { applyFpsHandToonMaterials, fitFpsHandRoot, hideOppositeHand } from './fpsHandModel'

const LERP = 0.12

export interface HandLayerProps {
  glbPath: string
  mirrored?: boolean
  delayMs?: number
  /** Which hand to keep from a two-hand rig (`fps-hands.glb` uses L/R bone chains). */
  handSide?: 'left' | 'right'
}

type Sample = { x: number; y: number; t: number }

function screenToPlane(
  clientX: number,
  clientY: number,
  width: number,
  height: number,
  camera: OrthographicCamera,
  raycaster: Raycaster,
  plane: Plane,
  target: Vector3,
): void {
  const ndc = new Vector2((clientX / width) * 2 - 1, -(clientY / height) * 2 + 1)
  raycaster.setFromCamera(ndc, camera)
  raycaster.ray.intersectPlane(plane, target)
}

function sampleDelayed(queue: Sample[], delayMs: number, fallback: Sample): Vector2 {
  const now = performance.now()
  const t0 = now - delayMs
  if (queue.length === 0) return new Vector2(fallback.x, fallback.y)
  if (queue.length === 1) return new Vector2(queue[0].x, queue[0].y)
  if (t0 <= queue[0].t) return new Vector2(queue[0].x, queue[0].y)
  if (t0 >= queue[queue.length - 1].t) {
    const s = queue[queue.length - 1]
    return new Vector2(s.x, s.y)
  }
  let i = 0
  while (i + 1 < queue.length && queue[i + 1].t < t0) i++
  const a = queue[i]!
  const b = queue[i + 1]!
  const u = (t0 - a.t) / Math.max(b.t - a.t, 1e-6)
  return new Vector2(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u)
}

export function HandLayer({ glbPath, mirrored = false, delayMs = 0, handSide = 'left' }: HandLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let cancelled = false
    const scene = new Scene()
    const raycaster = new Raycaster()
    const plane = new Plane(new Vector3(0, 0, 1), 0)
    const targetWorld = new Vector3()
    const currentWorld = new Vector3()
    const mouseQueue: Sample[] = []
    let lastMouse: Sample = {
      x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
      y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0,
      t: performance.now(),
    }

    const handGroup = new Group()
    if (mirrored) {
      handGroup.scale.x = -1
    }
    scene.add(handGroup)

    const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 100)
    camera.position.set(0, 0, 10)
    camera.lookAt(0, 0, 0)

    const renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    })
    renderer.setClearColor(0x000000, 0)
    renderer.shadowMap.enabled = false

    const loader = new GLTFLoader()
    loader.load(
      glbPath,
      (gltf) => {
        if (cancelled) return
        const root = gltf.scene
        applyFpsHandToonMaterials(root)
        hideOppositeHand(root, handSide)
        fitFpsHandRoot(root, 2.5)
        handGroup.add(root)
        handGroup.position.set(0, 0, 0)
        currentWorld.copy(handGroup.position)
      },
      undefined,
      () => {
        if (!cancelled) {
          setFailed(true)
        }
      },
    )

    const onMove = (e: MouseEvent) => {
      lastMouse = { x: e.clientX, y: e.clientY, t: performance.now() }
      if (delayMs > 0) {
        mouseQueue.push({ ...lastMouse })
        const cutoff = performance.now() - delayMs - 2000
        while (mouseQueue.length > 2 && mouseQueue[0].t < cutoff) {
          mouseQueue.shift()
        }
      }
    }
    window.addEventListener('mousemove', onMove)

    let raf = 0
    const resize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      const aspect = w / Math.max(h, 1)
      const frustumSize = 5
      camera.left = (-frustumSize * aspect) / 2
      camera.right = (frustumSize * aspect) / 2
      camera.top = frustumSize / 2
      camera.bottom = -frustumSize / 2
      camera.updateProjectionMatrix()
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(w, h, false)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const tick = () => {
      if (cancelled) return
      raf = requestAnimationFrame(tick)
      const w = window.innerWidth
      const h = window.innerHeight
      let sx: number
      let sy: number
      if (delayMs > 0) {
        const v = sampleDelayed(mouseQueue, delayMs, lastMouse)
        sx = v.x
        sy = v.y
      } else {
        sx = lastMouse.x
        sy = lastMouse.y
      }
      screenToPlane(sx, sy, w, h, camera, raycaster, plane, targetWorld)
      currentWorld.lerp(targetWorld, LERP)
      handGroup.position.copy(currentWorld)
      renderer.render(scene, camera)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
      ro.disconnect()
      renderer.dispose()
      handGroup.traverse((obj) => {
        if (obj instanceof Mesh) {
          const m = obj.material
          if (Array.isArray(m)) m.forEach((mat) => mat.dispose())
          else m.dispose()
        }
      })
    }
  }, [glbPath, mirrored, delayMs, handSide])

  if (failed) return null

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 100,
      }}
    />
  )
}
