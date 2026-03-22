import type { ReactNode } from 'react'

export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: 12,
        width: '100%',
        maxWidth: 900,
        height: '100%',
        minHeight: 0,
        margin: 0,
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
        color: '#1a1a1a',
      }}
    >
      {children}
    </div>
  )
}

