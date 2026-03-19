import { PiGraphCanvas } from './PiGraphCanvas'

export type PiGraphProps = {
  unlockedEdges?: number
  onComplete?: () => void
}

export function PiGraph(props: PiGraphProps = {}) {
  const { unlockedEdges = 0, onComplete } = props
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
        <PiGraphCanvas unlockedEdges={unlockedEdges} />
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
}
