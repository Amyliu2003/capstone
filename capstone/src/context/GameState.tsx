import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { LEVEL_CONFIG, type LevelConfig } from '../config/levels'
import type { ChessSnapshot, GameSnapshotV1, PiGraphSnapshot } from '../gameSave/gameStorage'
import type { AgentParams } from '../components/HandCustomizationOverlay'

export type GamePhase = 'etymology' | 'chess' | 'pi'

export type LevelHistoryEntry = {
  chosenDefinitionIndex?: number
  /** Player-authored definition for the etymology phase (current flow). */
  playerDefinition?: string
  /** Index into the 4 shuffled options (0–3). */
  chosenVariantIndex?: number
  /** Whether the player picked Carroll / Humpty’s canonical definition. */
  isCanonical?: boolean
  moves?: Array<{ notation: string; illegal?: boolean }>
}

export type GameStateValue = {
  currentLevel: number
  currentPhase: GamePhase
  levelHistory: LevelHistoryEntry[]
  levelConfig: LevelConfig | null
  runSeed: number
  agentParams: AgentParams
  /** Level-1-only intro line before the first etymology input. */
  hasSeenEtymologyIntro: boolean
  initialChessSnapshot: ChessSnapshot | null
  initialPiSnapshot: PiGraphSnapshot | null
  advancePhase: (result: EtymologyResult | ChessResult | PiResult) => void
  setAgentParams: (next: AgentParams) => void
  markEtymologyIntroSeen: () => void
  loadGameSnapshot: (snapshot: GameSnapshotV1) => void
  restartLevelToIntro: () => void
  resetGame: () => void
}

export type EtymologyResult = {
  playerDefinition: string
  chosenVariantIndex: number
  isCanonical: boolean
}
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
  const [agentParams, setAgentParams] = useState<AgentParams>({ color: 'ivory', size: 'medium', accessory: 'none' })
  const [hasSeenEtymologyIntro, setHasSeenEtymologyIntro] = useState(false)
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
        if ('playerDefinition' in result && 'chosenVariantIndex' in result) {
          const er = result as EtymologyResult
          next[currentLevel - 1] = {
            ...entry,
            playerDefinition: er.playerDefinition,
            chosenVariantIndex: er.chosenVariantIndex,
            isCanonical: er.isCanonical,
          }
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

  const markEtymologyIntroSeen = useCallback(() => {
    setHasSeenEtymologyIntro(true)
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
    setAgentParams({ color: 'ivory', size: 'medium', accessory: 'none' })
    setHasSeenEtymologyIntro(false)
    setRunSeed((s) => s + 1)
  }, [])

  const value = useMemo<GameStateValue>(
    () => ({
      currentLevel,
      currentPhase,
      levelHistory,
      levelConfig,
      runSeed,
      agentParams,
      hasSeenEtymologyIntro,
      initialChessSnapshot,
      initialPiSnapshot,
      advancePhase,
      setAgentParams,
      markEtymologyIntroSeen,
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
      agentParams,
      hasSeenEtymologyIntro,
      initialChessSnapshot,
      initialPiSnapshot,
      advancePhase,
      setAgentParams,
      markEtymologyIntroSeen,
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
