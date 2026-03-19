import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { LEVEL_CONFIG, type LevelConfig } from '../config/levels'

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
  advancePhase: (result: EtymologyResult | ChessResult | PiResult) => void
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

  const levelConfig = useMemo(
    () => LEVEL_CONFIG[currentLevel - 1] ?? null,
    [currentLevel],
  )

  const advancePhase = useCallback(
    (result: EtymologyResult | ChessResult | PiResult) => {
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

  const resetGame = useCallback(() => {
    setCurrentLevel(initialState.currentLevel)
    setCurrentPhase(initialState.currentPhase)
    setLevelHistory([])
  }, [])

  const value = useMemo<GameStateValue>(
    () => ({
      currentLevel,
      currentPhase,
      levelHistory,
      levelConfig,
      advancePhase,
      resetGame,
    }),
    [currentLevel, currentPhase, levelHistory, levelConfig, advancePhase, resetGame],
  )

  return <GameStateContext.Provider value={value}>{children}</GameStateContext.Provider>
}

export function useGameState(): GameStateValue {
  const ctx = useContext(GameStateContext)
  if (!ctx) throw new Error('useGameState must be used within GameStateProvider')
  return ctx
}
