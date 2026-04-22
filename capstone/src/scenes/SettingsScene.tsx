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
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 0,
        backgroundColor: '#f5f0e8',
        padding: '0 32px',
      }}
      aria-label="Settings"
    >
      <div
        style={{
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: 9,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: '#9a9080',
          marginBottom: 32,
        }}
      >
        — paused —
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 240 }}>
        {(() => {
          const baseButtonStyle: React.CSSProperties = {
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 11,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            padding: '10px 16px',
            borderRadius: 2,
            border: '0.5px solid #c8bfaa',
            background: 'transparent',
            color: '#2c2418',
            cursor: 'pointer',
            width: '100%',
            textAlign: 'center',
          }
          return (
            <>
              <button type="button" onClick={onBack} style={baseButtonStyle}>
                Back
              </button>
              <button type="button" onClick={onSave} style={baseButtonStyle}>
                Save
              </button>
              <button type="button" onClick={onLoad} style={baseButtonStyle}>
                Load
              </button>
              <button type="button" onClick={onRestart} style={baseButtonStyle}>
                Restart
              </button>
              <button
                type="button"
                onClick={onResetGame}
                style={{
                  ...baseButtonStyle,
                  border: '0.5px solid rgba(139,26,26,0.35)',
                  color: '#8b1a1a',
                }}
              >
                Reset game
              </button>
            </>
          )
        })()}
      </div>
    </section>
  )
}

