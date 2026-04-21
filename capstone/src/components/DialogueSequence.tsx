import { useState } from 'react'

export type DialogueSpeaker = 'llorrac' | 'H.D.'

export type DialogueLine = {
  speaker: DialogueSpeaker
  text: string
}

export type DialogueSequenceProps = {
  lines: readonly DialogueLine[]
  onDone: () => void
  /** Optional: start at a specific line index. */
  startIndex?: number
}

const speakerColor: Record<DialogueSpeaker, string> = {
  llorrac: '#a0b8c8',
  'H.D.': '#e8d5a0',
}

export function DialogueSequence({ lines, onDone, startIndex = 0 }: DialogueSequenceProps) {
  const [i, setI] = useState(() => Math.max(0, Math.min(startIndex, Math.max(0, lines.length - 1))))

  if (!lines.length) return null

  const line = lines[i]!
  const atEnd = i >= lines.length - 1

  const advance = () => {
    if (atEnd) onDone()
    else setI((v) => Math.min(v + 1, lines.length - 1))
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={advance}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          advance()
        }
      }}
      tabIndex={0}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(0,0,0,0.7)',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        boxSizing: 'border-box',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: 'min(860px, 92vw)',
          display: 'grid',
          gap: 10,
          textAlign: 'center',
          fontFamily: `"IM Fell English", "I.M. Fell English", Georgia, serif`,
        }}
      >
        <div
          style={{
            fontSize: 12,
            letterSpacing: 1.1,
            fontVariant: 'all-small-caps',
            color: speakerColor[line.speaker],
            opacity: 0.95,
          }}
        >
          [{line.speaker}]
        </div>
        <div style={{ fontSize: '1.4rem', lineHeight: 1.35, color: '#f2f2f2' }}>{line.text}</div>
      </div>

      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 18,
          textAlign: 'center',
          fontSize: 12,
          color: 'rgba(220,220,220,0.7)',
          letterSpacing: 0.2,
        }}
      >
        click anywhere to continue
      </div>
    </div>
  )
}

