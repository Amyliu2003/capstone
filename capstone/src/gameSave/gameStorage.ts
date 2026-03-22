import type { GamePhase, LevelHistoryEntry } from '../context/GameState'

export const GAME_SNAPSHOT_STORAGE_KEY = 'capstone.gameSnapshot.v1'

export type SerializedBoardCell = { type: string; color: 'w' | 'b' } | null
export type SerializedBoardState = SerializedBoardCell[][]

export type ChessSnapshot = {
  fen: string
  boardState: SerializedBoardState
  moveHistory: Array<{ moveNumber: number; notation: string; illegal?: boolean }>
  currentTurn: 'w' | 'b'
}

export type PiGraphTransitions = Record<string, Record<string, number>>

export type PiGraphSnapshot = {
  transitions: PiGraphTransitions
  currentFrom: number | null
  currentTo: number | null
  progress: number
  digitsShown: number
  transitionCount: number
  globalCycleWeight: number
  frameCount: number
}

export type GameSnapshotV1 = {
  version: 1
  currentLevel: number
  currentPhase: GamePhase
  levelHistory: LevelHistoryEntry[]
  chess?: ChessSnapshot
  pi?: PiGraphSnapshot
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isBoardState(value: unknown): value is SerializedBoardState {
  if (!Array.isArray(value) || value.length !== 8) return false
  return value.every((row) => {
    if (!Array.isArray(row) || row.length !== 8) return false
    return row.every((cell) => {
      if (cell === null) return true
      return (
        isRecord(cell) &&
        typeof cell.type === 'string' &&
        (cell.color === 'w' || cell.color === 'b')
      )
    })
  })
}

function isChessSnapshot(value: unknown): value is ChessSnapshot {
  if (!isRecord(value)) return false
  return (
    typeof value.fen === 'string' &&
    isBoardState(value.boardState) &&
    Array.isArray(value.moveHistory) &&
    (value.currentTurn === 'w' || value.currentTurn === 'b')
  )
}

// Best-effort validation: avoid throwing on corrupted storage.
function normalizeAndValidateSnapshot(value: unknown): GameSnapshotV1 | null {
  if (!isRecord(value)) return null
  if (value.version !== 1) return null
  const currentLevel = value.currentLevel
  if (typeof currentLevel !== 'number' || !Number.isInteger(currentLevel) || currentLevel < 1 || currentLevel > 8) {
    return null
  }
  const currentPhase = value.currentPhase
  if (currentPhase !== 'etymology' && currentPhase !== 'chess' && currentPhase !== 'pi') return null
  if (!Array.isArray(value.levelHistory)) return null

  const out: GameSnapshotV1 = {
    version: 1,
    currentLevel,
    currentPhase,
    levelHistory: value.levelHistory as LevelHistoryEntry[],
  }

  if ('chess' in value && value.chess != null && isChessSnapshot(value.chess)) {
    out.chess = value.chess
  }
  if ('pi' in value && value.pi != null) {
    // For now, keep pi snapshot best-effort and trust numbers/shape if it parses.
    if (isRecord(value.pi) && 'transitions' in value.pi) {
      out.pi = value.pi as PiGraphSnapshot
    }
  }
  return out
}

export function writeGameSnapshot(snapshot: GameSnapshotV1): void {
  try {
    localStorage.setItem(GAME_SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    // ignore quota errors
  }
}

export function readGameSnapshot(): GameSnapshotV1 | null {
  try {
    const raw = localStorage.getItem(GAME_SNAPSHOT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    return normalizeAndValidateSnapshot(parsed)
  } catch {
    return null
  }
}

export function clearGameSnapshot(): void {
  try {
    localStorage.removeItem(GAME_SNAPSHOT_STORAGE_KEY)
  } catch {
    // ignore
  }
}

