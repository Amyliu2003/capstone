import { useCallback } from 'react'
import { useGameState } from '../context/GameState'
import { PiGraph } from '../features/PiGraph/PiGraph'
import { UnlawfulChessboard } from '../features/UnlawfulChessboard/UnlawfulChessboard'
import type { ChessResult, PiResult } from '../context/GameState'

export function GameRouter() {
  const { currentLevel, currentPhase, levelConfig, advancePhase } = useGameState()

  const onChessComplete = useCallback(
    (result: ChessResult) => {
      advancePhase(result)
    },
    [advancePhase],
  )

  const onPiComplete = useCallback(
    (result: PiResult) => {
      advancePhase(result)
    },
    [advancePhase],
  )

  const containerStyle: React.CSSProperties = {
    height: '100%',
    minHeight: 0,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  }

  if (currentPhase === 'etymology' && levelConfig) {
    return (
      <section style={containerStyle}>
        <p>Pick a definition in the dialogue below.</p>
      </section>
    )
  }

  if (currentPhase === 'chess' && levelConfig) {
    return (
      <div style={containerStyle}>
        <UnlawfulChessboard
          disabledRule={levelConfig.disabledRule}
          onComplete={onChessComplete}
        />
      </div>
    )
  }

  if (currentPhase === 'pi') {
    return (
      <div style={containerStyle}>
        <PiGraph
          unlockedEdges={currentLevel}
          onComplete={onPiComplete}
        />
      </div>
    )
  }

  return (
    <section style={containerStyle}>
      <p>Loading level…</p>
    </section>
  )
}
