import { DSButton } from '../designSystem/components/DSButton'
import { SceneHost } from '../layout/SceneHost'

export type IntroSceneProps = {
  onStart: () => void
}

export function IntroScene({ onStart }: IntroSceneProps) {
  return (
    <SceneHost>
      <div
        style={{
          flex: 1,
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

        <DSButton type="button" onClick={onStart} style={{ width: 160 }}>
          Done
        </DSButton>
      </div>
    </SceneHost>
  )
}

