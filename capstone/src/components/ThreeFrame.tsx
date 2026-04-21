import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export function ThreeFrame({
  width = 100,
  height = 100,
  rotate = true,
  enabled = true,
}: {
  width?: number
  height?: number
  rotate?: boolean
  /** When false, renders a non-WebGL placeholder (prevents context spam). */
  enabled?: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!enabled) return
    const container = containerRef.current
    if (!container) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 10)
    camera.position.z = 2.5

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setSize(width, height)
    renderer.setClearColor(0x111111)
    container.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const dir = new THREE.DirectionalLight(0xffffff, 1)
    dir.position.set(2, 2, 2)
    scene.add(dir)

    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const material = new THREE.MeshStandardMaterial({
      color: 0x555555,
      metalness: 0.2,
      roughness: 0.8,
    })
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    let raf = 0
    const animate = () => {
      raf = requestAnimationFrame(animate)
      if (rotate) mesh.rotation.y += 0.01
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(raf)
      renderer.dispose()
      geometry.dispose()
      material.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [enabled, rotate, width, height])

  return (
    <div
      ref={containerRef}
      style={{
        width,
        height,
        flexShrink: 0,
        background: enabled
          ? '#111'
          : 'radial-gradient(120% 120% at 30% 20%, rgba(255,255,255,0.14), rgba(0,0,0,0.55))',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
      aria-hidden
    />
  )
}
