export type LevelConfig = {
  word: string
  disabledRule: string
}

/** Hardcoded level config (1–8). Placeholder words and rules; rule-disabling not wired yet. */
export const LEVEL_CONFIG: LevelConfig[] = [
  { word: 'brillig', disabledRule: 'en_passant' },
  { word: 'slithy', disabledRule: 'castling' },
  { word: 'toves', disabledRule: 'check' },
  { word: 'gyre', disabledRule: 'checkmate' },
  { word: 'gimble', disabledRule: 'draws' },
  { word: 'wabe', disabledRule: 'pawn_promotion' },
  { word: 'mimsy', disabledRule: 'en_passant' },
  { word: 'borogove', disabledRule: 'castling' },
]

export const TOTAL_LEVELS = LEVEL_CONFIG.length
