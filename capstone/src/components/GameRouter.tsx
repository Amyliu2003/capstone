import { useCallback, type CSSProperties, type Ref } from 'react'
import { useGameState } from '../context/GameState'
import { PiGraph } from '../features/PiGraph/PiGraph'
import { UnlawfulChessboard, type UnlawfulChessboardHandle } from '../features/UnlawfulChessboard/UnlawfulChessboard'
import type { PiGraphCanvasHandle } from '../features/PiGraph/PiGraphCanvas'
import type { ChessResult, PiResult } from '../context/GameState'

export type GameRouterProps = {
  chessRef?: Ref<UnlawfulChessboardHandle>
  piRef?: Ref<PiGraphCanvasHandle>
}

export function GameRouter(props: GameRouterProps = {}) {
  const { chessRef, piRef } = props
  const { currentLevel, currentPhase, levelConfig, advancePhase, initialChessSnapshot, initialPiSnapshot, runSeed } = useGameState()

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

  const containerStyle: CSSProperties = {
    height: '100%',
    minHeight: 0,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  }

  if (currentPhase === 'etymology' && levelConfig) {
    return (
      <div style={containerStyle}>
        <section style={{ padding: '0 4px', fontSize: 14, opacity: 0.85 }}>
          Use the dialogue below to enter your definition and continue.
        </section>
      </div>
    )
  }

  if (currentPhase === 'chess' && levelConfig) {
    return (
      <div style={containerStyle}>
        <UnlawfulChessboard
          key={runSeed}
          ref={chessRef}
          disabledRule={levelConfig.disabledRule}
          initialChessSnapshot={initialChessSnapshot}
          onComplete={onChessComplete}
        />
      </div>
    )
  }

  if (currentPhase === 'pi') {
    return (
      <div style={containerStyle}>
        <PiGraph
          key={runSeed}
          ref={piRef}
          unlockedEdges={currentLevel}
          onComplete={() => onPiComplete({} as PiResult)}
          initialPiSnapshot={initialPiSnapshot}
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
