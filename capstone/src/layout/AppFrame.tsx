import type { ReactNode } from 'react'

export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <div
      className="font-base"
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: 'min(100vw, calc(100dvh * 9 / 16))',
        height: '100dvh',
        aspectRatio: '9 / 16',
        minHeight: 0,
        margin: 0,
        boxSizing: 'border-box',
        overflow: 'hidden',
        backgroundColor: 'var(--sr-app-bg, #f5f0e8)',
        color: 'var(--sr-app-fg, #2c2418)',
      }}
    >
      {children}
    </div>
  )
}

