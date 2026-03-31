import { useMemo, useState } from 'react'
import { ThreeFrame } from './ThreeFrame'

export type AgentParams = {
  color: 'ivory' | 'ink' | 'brass'
  size: 'small' | 'medium' | 'large'
  accessory: 'none' | 'ring' | 'bracelet'
}

export type HandCustomizationOverlayProps = {
  visible: boolean
  initial?: AgentParams
  onConfirm: (params: AgentParams) => void
}

const colors: Array<{ id: AgentParams['color']; label: string }> = [
  { id: 'ivory', label: 'Ivory' },
  { id: 'ink', label: 'Ink' },
  { id: 'brass', label: 'Brass' },
]

const sizes: Array<{ id: AgentParams['size']; label: string }> = [
  { id: 'small', label: 'Small' },
  { id: 'medium', label: 'Medium' },
  { id: 'large', label: 'Large' },
]

const accessories: Array<{ id: AgentParams['accessory']; label: string }> = [
  { id: 'none', label: 'None' },
  { id: 'ring', label: 'Ring' },
  { id: 'bracelet', label: 'Bracelet' },
]

type SectionKey = 'color' | 'size' | 'accessory'

function OptionGrid<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: Array<{ id: T; label: string }>
  onChange: (next: T) => void
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: 12,
      }}
    >
      {options.map((opt) => {
        const active = opt.id === value
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            style={{
              padding: 10,
              borderRadius: 12,
              border: active ? '1px solid rgba(255,255,255,0.55)' : '1px solid rgba(255,255,255,0.16)',
              background: active ? 'rgba(80,140,255,0.18)' : 'rgba(0,0,0,0.18)',
              color: '#f2f2f2',
              display: 'grid',
              gap: 8,
              justifyItems: 'center',
            }}
          >
            <div
              style={{
                borderRadius: 10,
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <ThreeFrame width={86} height={86} enabled={false} rotate={false} />
            </div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>{opt.label}</div>
          </button>
        )
      })}
    </div>
  )
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: Array<{ id: T; label: string }>
  onChange: (next: T) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
      {options.map((opt) => {
        const active = opt.id === value
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            style={{
              padding: '10px 12px',
              borderRadius: 999,
              border: active ? '1px solid rgba(255,255,255,0.8)' : '1px solid rgba(255,255,255,0.25)',
              background: active ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.25)',
              color: '#f2f2f2',
              fontSize: 13,
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export function HandCustomizationOverlay({ visible, initial, onConfirm }: HandCustomizationOverlayProps) {
  const defaults = useMemo<AgentParams>(
    () => initial ?? { color: 'ivory', size: 'medium', accessory: 'none' },
    [initial],
  )
  const [section, setSection] = useState<SectionKey>('color')
  const [color, setColor] = useState<AgentParams['color']>(defaults.color)
  const [size, setSize] = useState<AgentParams['size']>(defaults.size)
  const [accessory, setAccessory] = useState<AgentParams['accessory']>(defaults.accessory)

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1900,
        background: 'rgba(0,0,0,0.7)',
        display: 'grid',
        placeItems: 'center',
        padding: 18,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: 'min(1120px, 96vw)',
          height: 'min(640px, 86vh)',
          display: 'grid',
          gridTemplateColumns: '220px 1fr 320px',
          gap: 16,
          alignItems: 'stretch',
          boxSizing: 'border-box',
        }}
      >
        {/* Left: 3 categories */}
        <aside
          style={{
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'rgba(10,10,10,0.65)',
            borderRadius: 14,
            padding: 14,
            display: 'grid',
            gap: 10,
            alignContent: 'start',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              paddingBottom: 8,
              borderBottom: '1px solid rgba(255,255,255,0.12)',
              marginBottom: 6,
            }}
          >
            <ThreeFrame width={44} height={44} rotate={false} />
            <div
              style={{
                fontFamily: `"IM Fell English", "I.M. Fell English", Georgia, serif`,
                color: '#f2f2f2',
                fontSize: 18,
                letterSpacing: 0.2,
              }}
            >
              Make yourself.
            </div>
          </div>

          {(
            [
              { k: 'color' as const, label: 'Color' },
              { k: 'size' as const, label: 'Size' },
              { k: 'accessory' as const, label: 'Accessory' },
            ] satisfies Array<{ k: SectionKey; label: string }>
          ).map((it) => {
            const active = it.k === section
            return (
              <button
                key={it.k}
                type="button"
                onClick={() => setSection(it.k)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '12px 12px',
                  borderRadius: 10,
                  border: active ? '1px solid rgba(255,255,255,0.35)' : '1px solid rgba(255,255,255,0.14)',
                  background: active ? 'rgba(80,140,255,0.22)' : 'rgba(0,0,0,0.22)',
                  color: '#f2f2f2',
                  fontWeight: 650,
                  letterSpacing: 0.2,
                }}
              >
                {it.label}
              </button>
            )
          })}
        </aside>

        {/* Middle: Three.js scene placeholder */}
        <main
          style={{
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'rgba(10,10,10,0.55)',
            borderRadius: 14,
            padding: 14,
            display: 'grid',
            placeItems: 'center',
            boxSizing: 'border-box',
          }}
        >
          <ThreeFrame width={360} height={360} />
        </main>

        {/* Right: options + submit */}
        <section
          style={{
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'rgba(10,10,10,0.65)',
            borderRadius: 14,
            padding: 14,
            display: 'grid',
            gap: 14,
            alignContent: 'start',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.75, color: '#ddd', letterSpacing: 0.2 }}>
            {section === 'color' ? 'Color' : section === 'size' ? 'Size' : 'Accessory'}
          </div>

          {section === 'color' ? (
            <OptionGrid value={color} options={colors} onChange={setColor} />
          ) : section === 'size' ? (
            <OptionGrid value={size} options={sizes} onChange={setSize} />
          ) : (
            <OptionGrid value={accessory} options={accessories} onChange={setAccessory} />
          )}

          <div style={{ height: 1, background: 'rgba(255,255,255,0.12)' }} />

          <div style={{ fontSize: 12, opacity: 0.8, color: '#ddd' }}>Selected</div>
          <div style={{ fontSize: 13, color: '#f2f2f2', lineHeight: 1.35 }}>
            <div>Color: {color}</div>
            <div>Size: {size}</div>
            <div>Accessory: {accessory}</div>
          </div>

          <button
            type="button"
            onClick={() => onConfirm({ color, size, accessory })}
            style={{
              marginTop: 8,
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.22)',
              background: 'rgba(255,255,255,0.12)',
              color: '#f2f2f2',
              fontWeight: 700,
              width: '100%',
            }}
          >
            Submit
          </button>
        </section>
      </div>
    </div>
  )
}

