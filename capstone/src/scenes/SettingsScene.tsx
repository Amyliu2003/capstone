import { DSButton } from '../designSystem/components/DSButton'

export type SettingsSceneProps = {
  onBack: () => void
  onSave: () => void
  onLoad: () => void
  onRestart: () => void
  onResetGame: () => void
}

export function SettingsScene(props: SettingsSceneProps) {
  const { onBack, onSave, onLoad, onRestart, onResetGame } = props

  return (
    <section
      style={{
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
      aria-label="Settings"
    >
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h2 style={{ margin: 0 }}>Settings</h2>
        <DSButton type="button" onClick={onBack}>
          Back
        </DSButton>
      </header>

      <div
        style={{
          display: 'grid',
          gap: 10,
          border: '1px solid var(--ds-border, #333)',
          borderRadius: 'var(--ds-radius, 8px)',
          padding: 12,
        }}
      >
        <div style={{ fontSize: 14, opacity: 0.85 }}>Placeholder (add toggles later).</div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <DSButton type="button" onClick={onSave}>
          Save
        </DSButton>
        <DSButton type="button" onClick={onLoad}>
          Load
        </DSButton>
        <DSButton type="button" onClick={onRestart}>
          Restart
        </DSButton>
        <DSButton type="button" onClick={onResetGame}>
          Reset game
        </DSButton>
      </div>
    </section>
  )
}

