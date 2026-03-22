import type React from 'react'
import { ThreeFrame } from './ThreeFrame'

export type DialogueNode =
  | { type: 'auto'; npc: string }
  | { type: 'choice'; npc: string; options: string[]; onSelect: (i: number) => void }
  | { type: 'input'; npc: string; onSubmit: (text: string) => void }

export interface DialogueBoxProps {
  visible: boolean
  node: DialogueNode | null
  onAdvance: () => void
  /** When true, only show NPC dialogue (no choice/input zone). Use for top, prefilled in-game dialogue. */
  npcOnly?: boolean
}

export function DialogueBox({ visible, node, onAdvance, npcOnly = false }: DialogueBoxProps) {
  if (!visible || !node) return null

  const handleAutoClick = () => {
    if (node.type === 'auto') onAdvance()
  }

  const handleChoiceClick = (index: number) => {
    if (node.type === 'choice') {
      console.log('Dialogue choice selected:', index)
      node.onSelect(index)
    }
  }

  const handleInputSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault()
    if (node.type !== 'input') return
    const formData = new FormData(e.currentTarget)
    const text = (formData.get('dialogue-input') ?? '').toString().trim()
    if (!text) return
    console.log('Dialogue input submitted:', text)
    node.onSubmit(text)
    e.currentTarget.reset()
  }

  if (npcOnly) {
    return (
      <section
        style={{
          width: '100%',
          maxWidth: 900,
          margin: 0,
          border: '1px solid var(--ds-border, #333)',
          padding: 12,
          overflowY: 'auto',
        }}
      >
        <div style={{ fontSize: 11, marginBottom: 4, color: 'var(--ds-subtle, #666)' }}>H.D.</div>
        <div>{node.npc}</div>
      </section>
    )
  }

  const playerAvatar = <ThreeFrame width={100} height={100} />

  return (
    <section
      style={{
        width: '100%',
        maxWidth: 900,
        margin: 0,
        border: '1px solid var(--ds-border, #333)',
        padding: 12,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
      onClick={node.type === 'auto' ? handleAutoClick : undefined}
    >
      {playerAvatar}
      {node.type === 'auto' && (
        <span style={{ opacity: 0.7, fontStyle: 'italic' }}>Click to continue…</span>
      )}
      {node.type === 'choice' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 0 }}>
          {node.options.map((opt, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleChoiceClick(i)
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
      {node.type === 'input' && (
        <form
          style={{ display: 'flex', gap: 8, flex: 1, minWidth: 0 }}
          onSubmit={(e) => {
            e.stopPropagation()
            handleInputSubmit(e)
          }}
        >
          <input name="dialogue-input" placeholder="…" autoComplete="off" style={{ flex: 1, padding: 8 }} />
          <button type="submit">Submit</button>
        </form>
      )}
    </section>
  )
}
