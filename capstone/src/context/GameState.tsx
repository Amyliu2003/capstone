import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { LEVEL_CONFIG, type LevelConfig } from '../config/levels'
import type { ChessSnapshot, GameSnapshotV1, PiGraphSnapshot } from '../gameSave/gameStorage'

export type GamePhase = 'etymology' | 'chess' | 'pi'

export type LevelHistoryEntry = {
  chosenDefinitionIndex?: number
  moves?: Array<{ notation: string; illegal?: boolean }>
}

export type GameStateValue = {
  currentLevel: number
  currentPhase: GamePhase
  levelHistory: LevelHistoryEntry[]
  levelConfig: LevelConfig | null
  runSeed: number
  initialChessSnapshot: ChessSnapshot | null
  initialPiSnapshot: PiGraphSnapshot | null
  advancePhase: (result: EtymologyResult | ChessResult | PiResult) => void
  loadGameSnapshot: (snapshot: GameSnapshotV1) => void
  restartLevelToIntro: () => void
  resetGame: () => void
}

export type EtymologyResult = { chosenDefinitionIndex: number }
export type ChessResult = { moves: Array<{ notation: string; illegal?: boolean }> }
export type PiResult = Record<string, never>

const initialState = {
  currentLevel: 1,
  currentPhase: 'etymology' as GamePhase,
  levelHistory: [] as LevelHistoryEntry[],
}

const GameStateContext = createContext<GameStateValue | null>(null)

export function GameStateProvider({ children }: { children: React.ReactNode }) {
  const [currentLevel, setCurrentLevel] = useState(initialState.currentLevel)
  const [currentPhase, setCurrentPhase] = useState<GamePhase>(initialState.currentPhase)
  const [levelHistory, setLevelHistory] = useState<LevelHistoryEntry[]>([])
  const [runSeed, setRunSeed] = useState(0)
  const [initialChessSnapshot, setInitialChessSnapshot] = useState<ChessSnapshot | null>(null)
  const [initialPiSnapshot, setInitialPiSnapshot] = useState<PiGraphSnapshot | null>(null)

  const levelConfig = useMemo(
    () => LEVEL_CONFIG[currentLevel - 1] ?? null,
    [currentLevel],
  )

  const advancePhase = useCallback(
    (result: EtymologyResult | ChessResult | PiResult) => {
      // Clear pending snapshots once the user continues the flow.
      setInitialChessSnapshot(null)
      setInitialPiSnapshot(null)

      setLevelHistory((prev) => {
        const next = [...prev]
        while (next.length < currentLevel) next.push({})
        const entry = next[currentLevel - 1] ?? {}
        if ('chosenDefinitionIndex' in result) {
          next[currentLevel - 1] = { ...entry, chosenDefinitionIndex: result.chosenDefinitionIndex }
        } else if ('moves' in result) {
          next[currentLevel - 1] = { ...entry, moves: result.moves }
        }
        return next
      })

      if (currentPhase === 'etymology') {
        setCurrentPhase('chess')
      } else if (currentPhase === 'chess') {
        setCurrentPhase('pi')
      } else {
        setCurrentPhase('etymology')
        setCurrentLevel((l) => Math.min(l + 1, 8))
      }
    },
    [currentLevel, currentPhase],
  )

  const loadGameSnapshot = useCallback((snapshot: GameSnapshotV1) => {
    setCurrentLevel(snapshot.currentLevel)
    setCurrentPhase(snapshot.currentPhase)
    setLevelHistory(snapshot.levelHistory)
    setInitialChessSnapshot(snapshot.chess ?? null)
    setInitialPiSnapshot(snapshot.pi ?? null)
    setRunSeed((s) => s + 1)
  }, [])

  const restartLevelToIntro = useCallback(() => {
    setCurrentPhase('etymology')
    setLevelHistory((prev) => {
      const next = [...prev]
      while (next.length < currentLevel) next.push({})
      next[currentLevel - 1] = {}
      return next
    })
    setInitialChessSnapshot(null)
    setInitialPiSnapshot(null)
    setRunSeed((s) => s + 1)
  }, [currentLevel])

  const resetGame = useCallback(() => {
    setCurrentLevel(initialState.currentLevel)
    setCurrentPhase(initialState.currentPhase)
    setLevelHistory([])
    setInitialChessSnapshot(null)
    setInitialPiSnapshot(null)
    setRunSeed((s) => s + 1)
  }, [])

  const value = useMemo<GameStateValue>(
    () => ({
      currentLevel,
      currentPhase,
      levelHistory,
      levelConfig,
      runSeed,
      initialChessSnapshot,
      initialPiSnapshot,
      advancePhase,
      loadGameSnapshot,
      restartLevelToIntro,
      resetGame,
    }),
    [
      currentLevel,
      currentPhase,
      levelHistory,
      levelConfig,
      runSeed,
      initialChessSnapshot,
      initialPiSnapshot,
      advancePhase,
      loadGameSnapshot,
      restartLevelToIntro,
      resetGame,
    ],
  )

  return <GameStateContext.Provider value={value}>{children}</GameStateContext.Provider>
}

export function useGameState(): GameStateValue {
  const ctx = useContext(GameStateContext)
  if (!ctx) throw new Error('useGameState must be used within GameStateProvider')
  return ctx
}
