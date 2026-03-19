export type ThemeTokens = {
  // Intentionally minimal for now; later Figma MCPs can populate this.
  colors: {
    fg: string
    bg: string
    subtle: string
  }
}

export const theme: ThemeTokens = {
  colors: {
    fg: '#111',
    bg: '#fff',
    subtle: '#666',
  },
}

