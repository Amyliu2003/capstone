import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { theme } from '../styles/theme'

export type DesignSystemTokens = {
  colors: {
    fg: string
    bg: string
    subtle: string
    border: string
    buttonBg: string
    buttonFg: string
    buttonBgHover: string
    link: string
    linkHover: string
  }
  radius: number
  space: {
    1: number
    2: number
    3: number
  }
}

const DesignSystemContext = createContext<DesignSystemTokens | null>(null)

export type DesignSystemProviderProps = {
  children: ReactNode
  overrideTokens?: Partial<DesignSystemTokens>
}

function buildTokens(overrides?: Partial<DesignSystemTokens>): DesignSystemTokens {
  const base: DesignSystemTokens = {
    colors: {
      fg: theme.colors.fg,
      bg: theme.colors.bg,
      subtle: theme.colors.subtle,
      border: '#333',
      buttonBg: '#1a1a1a',
      buttonFg: '#ffffff',
      buttonBgHover: '#646cff',
      link: '#646cff',
      linkHover: '#535bf2',
    },
    radius: 8,
    space: { 1: 8, 2: 12, 3: 18 },
  }

  if (!overrides) return base
  return {
    ...base,
    ...overrides,
    colors: { ...base.colors, ...(overrides.colors ?? {}) },
    space: { ...base.space, ...(overrides.space ?? {}) },
  }
}

function setCssVars(tokens: DesignSystemTokens, root: HTMLElement) {
  root.style.setProperty('--ds-fg', tokens.colors.fg)
  root.style.setProperty('--ds-bg', tokens.colors.bg)
  root.style.setProperty('--ds-subtle', tokens.colors.subtle)
  root.style.setProperty('--ds-border', tokens.colors.border)
  root.style.setProperty('--ds-radius', `${tokens.radius}px`)

  root.style.setProperty('--ds-space-1', `${tokens.space[1]}px`)
  root.style.setProperty('--ds-space-2', `${tokens.space[2]}px`)
  root.style.setProperty('--ds-space-3', `${tokens.space[3]}px`)

  root.style.setProperty('--ds-button-bg', tokens.colors.buttonBg)
  root.style.setProperty('--ds-button-fg', tokens.colors.buttonFg)
  root.style.setProperty('--ds-button-bg-hover', tokens.colors.buttonBgHover)
  root.style.setProperty('--ds-link', tokens.colors.link)
  root.style.setProperty('--ds-link-hover', tokens.colors.linkHover)
}

export function DesignSystemProvider({ children, overrideTokens }: DesignSystemProviderProps) {
  const tokens = useMemo(() => buildTokens(overrideTokens), [overrideTokens])
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    setCssVars(tokens, containerRef.current)
    // Enable global CSS to use theme variables.
    setCssVars(tokens, document.documentElement)
  }, [tokens])

  return (
    <div ref={containerRef}>
      <DesignSystemContext.Provider value={tokens}>{children}</DesignSystemContext.Provider>
    </div>
  )
}

export function useDesignSystem(): DesignSystemTokens {
  const ctx = useContext(DesignSystemContext)
  if (!ctx) throw new Error('useDesignSystem must be used within DesignSystemProvider')
  return ctx
}

