import type { ReactNode } from 'react'

export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <div
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
        backgroundColor: '#ffffff',
        color: '#1a1a1a',
      }}
    >
      {children}
    </div>
  )
}

