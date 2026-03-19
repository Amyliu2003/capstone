import type { CSSProperties } from 'react'

export type IntroSceneProps = {
  onStart: () => void
}

export function IntroScene({ onStart }: IntroSceneProps) {
  const full: CSSProperties = {
    width: '100%',
    height: '100%',
    minHeight: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    boxSizing: 'border-box',
  }

  return (
    <div style={full}>
      <div
        style={{
          width: '100%',
          height: '100%',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
          padding: 16,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ fontSize: 12, opacity: 0.85, textAlign: 'center', maxWidth: 520 }}>
          The screen stays still. New edges appear step-by-step.
        </div>

        <button type="button" onClick={onStart} style={{ width: 160 }}>
          Done
        </button>
      </div>
    </div>
  )
}

