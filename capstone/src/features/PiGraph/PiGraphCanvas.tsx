import { useEffect, useRef } from 'react'
import { piDigits, maxDigits } from './piDigits'

const RADIUS_RATIO = 0.35
const NODE_RADIUS_RATIO = 0.025
const HEAD_RADIUS_RATIO = 0.0075
const DEFAULT_SIZE = 400
const DIGITS_PER_FRAME_INTERVAL = 60
const PROGRESS_SPEED = 0.03
const WEIGHT_GROWTH = 6

/** Plain dark palette */
const FILL_CREAM = '#f5f0e5'
const STROKE_DARK = '#1B2A4A'

type Node = { digit: number; x: number; y: number }

function getMaxWeight(transitions: Record<string, Record<string, number>>): number {
  let maxW = 0
  for (const from of Object.keys(transitions)) {
    for (const to of Object.keys(transitions[from])) {
      maxW = Math.max(maxW, transitions[from][to])
    }
  }
  return maxW || 1
}

function computeNodes(size: number): Node[] {
  const radius = size * RADIUS_RATIO
  const cx = size / 2
  const cy = size / 2
  const nodes: Node[] = []
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2 - Math.PI / 2
    nodes.push({
      digit: i,
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    })
  }
  return nodes
}

export type PiGraphCanvasProps = {
  /** Max number of transitions to show (level-gated). Omit = use maxDigits. */
  unlockedEdges?: number
}

export function PiGraphCanvas({ unlockedEdges }: PiGraphCanvasProps = {}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const unlockedEdgesRef = useRef<number | undefined>(unlockedEdges)
  unlockedEdgesRef.current = unlockedEdges
  const stateRef = useRef({
    nodes: [] as Node[],
    transitions: {} as Record<string, Record<string, number>>,
    currentFrom: null as number | null,
    currentTo: null as number | null,
    progress: 0,
    digitsShown: 1,
    transitionCount: 0,
    globalCycleWeight: 1,
    frameCount: 0,
  })

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const state = stateRef.current

    const setSize = (size: number) => {
      if (size <= 0) return
      canvas.width = size
      canvas.height = size
      state.nodes = computeNodes(size)
    }

    setSize(DEFAULT_SIZE)

    const initialUnlocked = Math.max(0, unlockedEdgesRef.current ?? 0)
    for (let i = 0; i < initialUnlocked; i++) {
      const a = piDigits[state.digitsShown - 1]
      const b = piDigits[state.digitsShown]
      if (i < initialUnlocked - 1) {
        if (!state.transitions[a]) state.transitions[a] = {}
        if (!state.transitions[a][b]) state.transitions[a][b] = 0
        state.transitions[a][b]++
        state.transitionCount++
        state.globalCycleWeight = 1 + state.transitionCount * 0.002
      } else {
        state.currentFrom = parseInt(a, 10)
        state.currentTo = parseInt(b, 10)
        state.progress = 0
      }
      state.digitsShown++
    }
    if (initialUnlocked === 0) {
      state.currentFrom = null
      state.currentTo = null
      state.progress = 0
    }

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      const size = Math.max(1, Math.min(width, height))
      setSize(size)
    })
    ro.observe(container)

    let raf = 0
    const draw = () => {
      raf = requestAnimationFrame(draw)
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const { nodes, transitions } = state
      state.frameCount++

      const maxUnlocked = unlockedEdgesRef.current != null ? Math.max(0, unlockedEdgesRef.current) : undefined
      const maxShown = maxUnlocked != null ? maxUnlocked + 1 : undefined
      const newCount = Math.min(
        Math.floor(state.frameCount / DIGITS_PER_FRAME_INTERVAL),
        Math.min(piDigits.length, maxDigits),
        maxShown ?? Infinity,
      )

      while (state.digitsShown < newCount) {
        const a = piDigits[state.digitsShown - 1]
        const b = piDigits[state.digitsShown]
        state.currentFrom = parseInt(a, 10)
        state.currentTo = parseInt(b, 10)
        state.progress = 0
        state.digitsShown++
      }

      if (state.currentFrom !== null && state.currentTo !== null) {
        state.progress += PROGRESS_SPEED
        if (state.progress >= 1) {
          state.progress = 1
          const a = piDigits[state.digitsShown - 2]
          const b = piDigits[state.digitsShown - 1]
          if (!transitions[a]) transitions[a] = {}
          if (!transitions[a][b]) transitions[a][b] = 0
          transitions[a][b]++
          state.transitionCount++
          state.globalCycleWeight = 1 + state.transitionCount * 0.002
          state.currentFrom = null
          state.currentTo = null
        }
      }

      const width = canvas.width
      const height = canvas.height
      const nodeRadius = width * NODE_RADIUS_RATIO
      const headRadius = width * HEAD_RADIUS_RATIO

      ctx.clearRect(0, 0, width, height)

      const maxW = getMaxWeight(transitions)
      for (const from of Object.keys(transitions)) {
        for (const to of Object.keys(transitions[from])) {
          const w = transitions[from][to]
          if (w <= 0) continue
          const a = nodes[parseInt(from, 10)]
          const b = nodes[parseInt(to, 10)]
          if (!a || !b) continue
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.strokeStyle = STROKE_DARK
          ctx.globalAlpha = 0.3 + 0.5 * (w / maxW)
          ctx.lineWidth = 1 + 2 * (w / maxW)
          ctx.stroke()
          ctx.globalAlpha = 1
        }
      }

      for (const n of nodes) {
        ctx.beginPath()
        ctx.arc(n.x, n.y, nodeRadius, 0, Math.PI * 2)
        ctx.fillStyle = FILL_CREAM
        ctx.fill()
        ctx.strokeStyle = STROKE_DARK
        ctx.lineWidth = 1
        ctx.stroke()
      }

      if (state.currentFrom !== null && state.currentTo !== null) {
        const a = nodes[state.currentFrom]
        const b = nodes[state.currentTo]
        const x = a.x + (b.x - a.x) * state.progress
        const y = a.y + (b.y - a.y) * state.progress

        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(x, y)
        ctx.strokeStyle = STROKE_DARK
        ctx.lineWidth = (1 + state.progress * WEIGHT_GROWTH) * state.globalCycleWeight
        ctx.stroke()

        ctx.beginPath()
        ctx.arc(x, y, headRadius, 0, Math.PI * 2)
        ctx.fillStyle = STROKE_DARK
        ctx.fill()
      }

      ctx.fillStyle = STROKE_DARK
      ctx.font = `${Math.max(10, width * 0.022)}px system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (const n of nodes) {
        ctx.fillText(String(n.digit), n.x, n.y)
      }
    }

    draw()
    return () => {
      ro.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
        aria-label="Pi digit transition graph"
      />
    </div>
  )
}
