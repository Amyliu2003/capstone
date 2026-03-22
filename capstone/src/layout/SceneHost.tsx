import type { CSSProperties, ReactNode } from 'react'

export type SceneHostProps = {
  header?: ReactNode
  footer?: ReactNode
  children: ReactNode
}

export function SceneHost({ header, footer, children }: SceneHostProps) {
  const mainStyle: CSSProperties = {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {header != null && <div style={{ flexShrink: 0 }}>{header}</div>}
      <div style={mainStyle}>{children}</div>
      {footer != null && <div style={{ flexShrink: 0 }}>{footer}</div>}
    </div>
  )
}

