import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type DSButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  children: ReactNode
}

export function DSButton({ children, style, ...rest }: DSButtonProps) {
  return (
    <button
      {...rest}
      style={{
        backgroundColor: 'var(--ds-button-bg, #1a1a1a)',
        color: 'var(--ds-button-fg, #ffffff)',
        borderRadius: 'var(--ds-radius, 8px)',
        border: '1px solid var(--ds-border, #333)',
        padding: '0.6em 1.2em',
        cursor: rest.disabled ? 'not-allowed' : 'pointer',
        transition: 'filter 0.2s',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (rest.disabled) return
        const el = e.currentTarget
        el.style.filter = 'brightness(1.05)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        el.style.filter = ''
      }}
    >
      {children}
    </button>
  )
}

