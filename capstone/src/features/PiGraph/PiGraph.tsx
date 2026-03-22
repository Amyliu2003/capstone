import { forwardRef } from 'react'
import { useDesignSystem } from '../../designSystem/DesignSystemProvider'
import { PiGraphCanvas, type PiGraphCanvasHandle } from './PiGraphCanvas'
import type { PiGraphSnapshot } from '../../gameSave/gameStorage'

export type PiGraphProps = {
  unlockedEdges?: number
  onComplete?: () => void
  initialPiSnapshot?: PiGraphSnapshot | null
}

export const PiGraph = forwardRef<PiGraphCanvasHandle, PiGraphProps>(function PiGraph(props: PiGraphProps, ref) {
  const { unlockedEdges = 0, onComplete, initialPiSnapshot } = props
  const tokens = useDesignSystem()
  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <h2 style={{ margin: 0, flexShrink: 0 }}>Pi Graph</h2>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <PiGraphCanvas
          ref={ref}
          unlockedEdges={unlockedEdges}
          initialPiSnapshot={initialPiSnapshot}
          nodeFill={tokens.colors.bg}
          nodeStroke={tokens.colors.fg}
          edgeStroke={tokens.colors.fg}
          animatedEdgeStroke={tokens.colors.fg}
          labelColor={tokens.colors.fg}
        />
        {unlockedEdges > 0 && (
          <div style={{ flexShrink: 0, fontSize: 14 }}>
            Edges unlocked: <strong>{unlockedEdges}</strong>
          </div>
        )}
      </div>
      {onComplete && (
        <button type="button" onClick={onComplete} style={{ flexShrink: 0 }}>
          Continue to next level
        </button>
      )}
    </section>
  )
})
