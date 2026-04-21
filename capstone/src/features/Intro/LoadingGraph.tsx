import { useEffect, useMemo, useRef, useState, type TransitionEvent } from 'react'

/**
 * Global speed multiplier for the loading sequence (`<1` = faster wall-clock).
 * Original design ~4.6s to text-hold end; at `0.5` ≈ ~2.3s.
 */
const LOADING_TIME_SCALE = 0.5

const ms = (n: number) => Math.max(1, Math.round(n * LOADING_TIME_SCALE))

const T_HOLD_MS = ms(500)
const T_EDGE_STAGGER_MS = ms(60)
const T_EDGE_FADE_MS = ms(120)
const T_TEXT_HOLD_MS = ms(800)
const T_EXIT_FADE_MS = ms(600)

const NODE_COUNT = 10
const GRAPH_DIAMETER = 300
const VIEW_HALF = GRAPH_DIAMETER / 2
const NODE_R = 135
/** Black dots at each graph vertex (SVG units, ~300px viewBox). */
const NODE_DOT_R = 6
const NODE_DOT_FILL = '#000000'
const STROKE = '#2a2a3a'
const STROKE_W = 1.25

function shufflePairs(pairs: [number, number][]): [number, number][] {
  const a = pairs.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const t = a[i]!
    a[i] = a[j]!
    a[j] = t
  }
  return a
}

function allEdges(): [number, number][] {
  const out: [number, number][] = []
  for (let i = 0; i < NODE_COUNT; i++) {
    for (let j = i + 1; j < NODE_COUNT; j++) {
      out.push([i, j])
    }
  }
  return out
}

function nodePos(i: number): { x: number; y: number } {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / NODE_COUNT
  return { x: NODE_R * Math.cos(a), y: NODE_R * Math.sin(a) }
}

/**
 * Retract progress 0→1 along an edge (same timing as the old opacity dissolve).
 * 0 = full segment A→B; 1 = collapsed to A (matches PiGraphCanvas: line from node to interpolated point).
 */
function edgeRetractT(elapsed: number, dissolveIndex: number): number {
  const start = T_HOLD_MS + dissolveIndex * T_EDGE_STAGGER_MS
  if (elapsed < start) return 0
  if (elapsed >= start + T_EDGE_FADE_MS) return 1
  return (elapsed - start) / T_EDGE_FADE_MS
}

/** Last edge finishes fading. */
function dissolveEndMs(): number {
  const lastStart = T_HOLD_MS + 44 * T_EDGE_STAGGER_MS
  return lastStart + T_EDGE_FADE_MS
}

/** “Still Running...” stays visible from t=0; hold after last edge retracts, then exit when assets ready. */
function tTextHoldEnd(): number {
  return dissolveEndMs() + T_TEXT_HOLD_MS
}

export type LoadingGraphProps = {
  assetsLoaded: boolean
  onComplete: () => void
}

export function LoadingGraph({ assetsLoaded, onComplete }: LoadingGraphProps) {
  const pairs = useMemo(() => shufflePairs(allEdges()), [])

  const positions = useMemo(() => Array.from({ length: NODE_COUNT }, (_, i) => nodePos(i)), [])

  const overlayRef = useRef<HTMLDivElement>(null)
  const edgesRef = useRef<SVGGElement>(null)

  const startRef = useRef<number | null>(null)
  const [exiting, setExiting] = useState(false)
  const exitStartedRef = useRef(false)
  const exitCompleteRef = useRef(false)
  const assetsLoadedRef = useRef(assetsLoaded)

  useEffect(() => {
    assetsLoadedRef.current = assetsLoaded
  }, [assetsLoaded])

  useEffect(() => {
    startRef.current = performance.now()
    let id = 0
    const loop = () => {
      const t0 = startRef.current
      const e = t0 != null ? performance.now() - t0 : 0

      const edgesG = edgesRef.current
      if (edgesG) {
        const ch = edgesG.children
        for (let idx = 0; idx < ch.length; idx++) {
          const ab = pairs[idx]
          if (!ab) continue
          const [a, b] = ab
          const A = positions[a]!
          const B = positions[b]!
          const t = edgeRetractT(e, idx)
          const x1 = A.x
          const y1 = A.y
          const x2 = A.x + (B.x - A.x) * (1 - t)
          const y2 = A.y + (B.y - A.y) * (1 - t)
          const line = ch[idx] as SVGLineElement
          line.setAttribute('x1', String(x1))
          line.setAttribute('y1', String(y1))
          line.setAttribute('x2', String(x2))
          line.setAttribute('y2', String(y2))
          line.setAttribute('stroke-opacity', t >= 1 ? '0' : '1')
        }
      }

      if (
        e >= tTextHoldEnd() &&
        assetsLoadedRef.current &&
        !exitStartedRef.current &&
        !exitCompleteRef.current
      ) {
        exitStartedRef.current = true
        const overlay = overlayRef.current
        if (overlay) {
          overlay.style.transition = `opacity ${T_EXIT_FADE_MS}ms ease`
          overlay.style.opacity = '0'
        }
        setExiting(true)
      }

      id = requestAnimationFrame(loop)
    }
    id = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(id)
      startRef.current = null
    }
  }, [pairs, positions])

  const onExitTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || e.propertyName !== 'opacity') return
    if (!exiting || exitCompleteRef.current) return
    exitCompleteRef.current = true
    onComplete()
  }

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f0e8',
        pointerEvents: 'auto',
      }}
      onTransitionEnd={onExitTransitionEnd}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          maxWidth: 'min(92vw, 360px)',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: GRAPH_DIAMETER,
            height: GRAPH_DIAMETER,
            flexShrink: 0,
          }}
        >
          <svg
            width={GRAPH_DIAMETER}
            height={GRAPH_DIAMETER}
            viewBox={`${-VIEW_HALF} ${-VIEW_HALF} ${GRAPH_DIAMETER} ${GRAPH_DIAMETER}`}
            style={{ display: 'block', overflow: 'visible' }}
          >
            <g ref={edgesRef}>
              {pairs.map(([i, j]) => {
                const key = `${i}-${j}`
                const A = positions[i]!
                const B = positions[j]!
                return (
                  <line
                    key={key}
                    x1={A.x}
                    y1={A.y}
                    x2={B.x}
                    y2={B.y}
                    stroke={STROKE}
                    strokeWidth={STROKE_W}
                    strokeOpacity={1}
                    vectorEffect="non-scaling-stroke"
                  />
                )
              })}
            </g>
            <g>
              {positions.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={NODE_DOT_R}
                  fill={NODE_DOT_FILL}
                  style={{ userSelect: 'none' }}
                />
              ))}
            </g>
          </svg>
        </div>
        <p
          style={{
            margin: 0,
            padding: 0,
            fontSize: '1.5rem',
            lineHeight: 1.35,
            fontFamily: '"IM Fell English", "I.M. Fell English", Georgia, serif',
            fontStyle: 'italic',
            color: STROKE,
            textAlign: 'center',
            userSelect: 'none',
          }}
        >
          Still Running...
        </p>
      </div>
    </div>
  )
}

export default LoadingGraph
