import { forwardRef } from 'react'
import { PiGraphCanvas, type PiGraphCanvasHandle } from './PiGraphCanvas'
import type { PiGraphSnapshot } from '../../gameSave/gameStorage'
import { piDigits } from './piDigits'

export type PiGraphProps = {
  unlockedEdges?: number
  onComplete?: () => void
  initialPiSnapshot?: PiGraphSnapshot | null
}

export const PiGraph = forwardRef<PiGraphCanvasHandle, PiGraphProps>(function PiGraph(props: PiGraphProps, ref) {
  const { unlockedEdges = 0, onComplete, initialPiSnapshot } = props
  const sq = Math.min(8, Math.max(1, unlockedEdges || 1))
  const edges = Math.max(0, unlockedEdges)

  const baseGold = 'rgba(var(--sr-accent-rgb, 200,168,75), 0.18)'
  const activeGold = 'rgba(var(--sr-accent-rgb, 200,168,75), 0.7)'

  const stripDigits = (() => {
    const maxAfterDecimal = 46
    const shownAfter = piDigits.slice(1, 1 + maxAfterDecimal)
    const activeAfter = Math.min(shownAfter.length, Math.max(0, edges) + 1)
    return (
      <div
        style={{
          fontFamily: "'Share Tech Mono', 'Courier New', monospace",
          fontSize: 14,
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          userSelect: 'none',
          color: baseGold,
          padding: '8px 10px 6px',
          borderBottom: '0.5px solid rgba(var(--sr-accent-rgb, 200,168,75), 0.12)',
        }}
        aria-label="Pi digits"
      >
        <span style={{ color: baseGold }}>π = </span>
        <span style={{ color: activeGold }}>3</span>
        <span style={{ color: baseGold }}>.</span>
        {shownAfter.split('').map((ch, i) => (
          <span key={i} style={{ color: i < activeAfter ? activeGold : baseGold }}>
            {ch}
          </span>
        ))}
        <span style={{ color: baseGold }}>…</span>
      </div>
    )
  })()

  const PerspectiveTop = (
    <svg width="100%" height="80" viewBox="0 0 1000 80" preserveAspectRatio="none" aria-hidden style={{ display: 'block' }}>
      {/* Vertical fan to center */}
      {Array.from({ length: 12 }, (_, i) => {
        const x = (i / 11) * 1000
        return (
          <line
            key={i}
            x1={x}
            y1={0}
            x2={500}
            y2={80}
            stroke="rgba(var(--sr-accent-rgb, 200,168,75), 0.18)"
            strokeWidth={1.5}
          />
        )
      })}
      {/* Horizontal lines (sparse → dense) */}
      {Array.from({ length: 8 }, (_, i) => {
        const t = i / 7
        const y = 6 + t * t * 72
        const a = 0.10 + 0.22 * t
        return (
          <line
            key={i}
            x1={0}
            y1={y}
            x2={1000}
            y2={y}
            stroke={`rgba(var(--sr-accent-rgb, 200,168,75), ${a})`}
            strokeWidth={1.5}
          />
        )
      })}
      <rect x="0" y="0" width="1000" height="80" fill="url(#topFade)" />
      <defs>
        <linearGradient id="topFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#080a0f" stopOpacity="1" />
          <stop offset="1" stopColor="#080a0f" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  )

  const PerspectiveBottom = (
    <svg width="100%" height="120" viewBox="0 0 1000 120" preserveAspectRatio="none" aria-hidden style={{ display: 'block' }}>
      {/* Vertical fan from center */}
      {Array.from({ length: 12 }, (_, i) => {
        const x = (i / 11) * 1000
        return (
          <line
            key={i}
            x1={500}
            y1={0}
            x2={x}
            y2={120}
            stroke="rgba(var(--sr-accent-rgb, 200,168,75), 0.16)"
            strokeWidth={1.2}
          />
        )
      })}
      {/* Horizontal lines (dense → sparse) */}
      {Array.from({ length: 10 }, (_, i) => {
        const t = i / 9
        const y = t * t * 120
        const a = 0.26 - 0.16 * t
        return (
          <line
            key={i}
            x1={0}
            y1={y}
            x2={1000}
            y2={y}
            stroke={`rgba(var(--sr-accent-rgb, 200,168,75), ${a})`}
            strokeWidth={1.1}
          />
        )
      })}
      <rect x="0" y="0" width="1000" height="120" fill="url(#botFade)" />
      <defs>
        <linearGradient id="botFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#080a0f" stopOpacity="0" />
          <stop offset="1" stopColor="#080a0f" stopOpacity="1" />
        </linearGradient>
      </defs>
    </svg>
  )

  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        background: 'var(--sr-surface-1, #080a0f)',
        position: 'relative',
      }}
      aria-label="Pi Graph"
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: '10px 10px 0',
          backgroundImage:
            'radial-gradient(ellipse at 50% 45%, rgba(var(--sr-accent-rgb, 200,168,75),0.04), transparent 70%), repeating-linear-gradient(0deg, transparent 3px, rgba(0,0,0,0.025) 4px)',
        }}
      >
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 2px 10px',
          }}
          aria-label="Pi graph status"
        >
          <span
            style={{
              fontFamily: "'Share Tech Mono', 'Courier New', monospace",
              fontSize: 14,
              color: 'var(--sr-subtle, rgba(200,168,75,0.28))',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {edges} edges · sq {sq} of VIII
          </span>
        </div>

        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {PerspectiveTop}
          <div
            style={{
              border: '1px solid rgba(var(--sr-accent-rgb, 200,168,75), 0.26)',
              background: 'var(--sr-surface-2, rgba(0,0,0,0.18))',
              overflow: 'hidden',
              boxShadow:
                '0 0 0 1px rgba(var(--sr-accent-rgb, 200,168,75), 0.08), 0 18px 50px rgba(0,0,0,0.55)',
            }}
          >
            {/* digit strip ABOVE the canvas */}
            {stripDigits}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 10px 12px' }}>
              <PiGraphCanvas
                ref={ref}
                unlockedEdges={unlockedEdges}
                initialPiSnapshot={initialPiSnapshot}
                // Canvas 2D does not support CSS variables inside rgba(...),
                // so we pass concrete colors here and let the DOM chrome use CSS vars.
                nodeFill="rgba(200,168,75,0.12)"
                nodeStroke="rgba(200,168,75,0.8)"
                edgeStroke="rgba(200,168,75,1)"
                animatedEdgeStroke="rgba(200,168,75,0.85)"
                labelColor="rgba(200,168,75,0.75)"
              />
            </div>
          </div>
          {PerspectiveBottom}
        </div>
      </div>

      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px 12px',
          borderTop: '0.5px solid rgba(var(--sr-accent-rgb, 200,168,75), 0.14)',
          background: 'var(--sr-surface-1, #080a0f)',
        }}
        aria-label="Pi graph actions"
      >
        <span
          style={{
            fontFamily: "'Share Tech Mono', 'Courier New', monospace",
            fontSize: 14,
            color: 'rgba(var(--sr-accent-rgb, 200,168,75), 0.22)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {edges} edges · sq {sq} of VIII
        </span>
        {onComplete ? (
          <button
            type="button"
            onClick={onComplete}
            style={{
              fontFamily: "'Share Tech Mono', 'Courier New', monospace",
              fontSize: 14,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '8px 12px',
              borderRadius: 2,
              border: '0.5px solid rgba(var(--sr-accent-rgb, 200,168,75), 0.3)',
              background: 'rgba(var(--sr-accent-rgb, 200,168,75), 0.06)',
              color: 'rgba(var(--sr-accent-rgb, 200,168,75), 0.85)',
              cursor: 'pointer',
            }}
          >
            Continue →
          </button>
        ) : (
          <span
            style={{
              fontFamily: "'Share Tech Mono', 'Courier New', monospace",
              fontSize: 14,
              color: 'rgba(var(--sr-accent-rgb, 200,168,75), 0.18)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            —
          </span>
        )}
      </div>
    </section>
  )
})
