import { useMemo, useRef, useState } from 'react'
import { GameRouter } from '../components/GameRouter'
import { DialogueBox, type DialogueNode } from '../components/DialogueBox'
import { useGameState } from '../context/GameState'
import { DSButton } from '../designSystem/components/DSButton'
import { readGameSnapshot, writeGameSnapshot, clearGameSnapshot, type GameSnapshotV1 } from '../gameSave/gameStorage'
import type { UnlawfulChessboardHandle } from '../features/UnlawfulChessboard/UnlawfulChessboard'
import type { PiGraphCanvasHandle } from '../features/PiGraph/PiGraphCanvas'
import { SettingsScene } from './SettingsScene'

function getPlaceholderDefinitions(word: string): string[] {
  return [
    `[A] ${word} — from Old Jabberwock *${word}*, "to gleam at four o'clock".`,
    `[B] ${word} — a portmanteau of *slim* and *lithe*; cf. Carroll (1871).`,
    `[C] ${word} — from Latin *${word}are*, "to gyre"; first attested 1542.`,
    `[D] ${word} — Humpty Dumpty: "it means something like borogoves."`,
  ]
}

export function GameScene({ onRestartToIntro }: { onRestartToIntro: () => void }) {
  const { currentLevel, currentPhase, levelConfig, advancePhase, resetGame, levelHistory, loadGameSnapshot, restartLevelToIntro } =
    useGameState()

  const chessRef = useRef<UnlawfulChessboardHandle | null>(null)
  const piRef = useRef<PiGraphCanvasHandle | null>(null)
  const [page, setPage] = useState<'game' | 'settings'>('game')

  const dialogueNode = useMemo<DialogueNode | null>(() => {
    if (currentPhase === 'etymology' && levelConfig) {
      return {
        type: 'choice',
        npc: `What does "${levelConfig.word}" mean? Pick one.`,
        options: getPlaceholderDefinitions(levelConfig.word),
        onSelect: (i: number) => {
          advancePhase({ chosenDefinitionIndex: i })
        },
      }
    }
    if (currentPhase === 'chess') {
      return { type: 'auto', npc: 'Complete the puzzle above.' }
    }
    if (currentPhase === 'pi') {
      return { type: 'auto', npc: 'Continue when ready.' }
    }
    return { type: 'auto', npc: '—' }
  }, [currentPhase, levelConfig, advancePhase])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        width: '100%',
        height: '100%',
        minHeight: 0,
        margin: 0,
        boxSizing: 'border-box',
      }}
    >
      {page === 'game' && (
        <div style={{ flexShrink: 0 }}>
          <DialogueBox visible={true} node={dialogueNode} onAdvance={() => {}} npcOnly />
        </div>
      )}

      <header
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <span style={{ fontWeight: 600 }}>Level {currentLevel}</span>
        <span style={{ fontSize: 14, opacity: 0.85 }}>
          Phase: {currentPhase === 'etymology' ? 'Etymology' : currentPhase === 'chess' ? 'Chess' : 'Pi Graph'}
        </span>
        <DSButton type="button" onClick={() => setPage('settings')}>
          Settings
        </DSButton>
      </header>

      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {page === 'settings' ? (
          <SettingsScene
            onBack={() => setPage('game')}
            onSave={() => {
              const snapshot: GameSnapshotV1 = {
                version: 1,
                currentLevel,
                currentPhase,
                levelHistory,
              }

              if (currentPhase === 'chess') {
                const chess = chessRef.current?.getSnapshot()
                if (!chess) return
                snapshot.chess = chess
              }
              if (currentPhase === 'pi') {
                const pi = piRef.current?.getSnapshot()
                if (!pi) return
                snapshot.pi = pi
              }

              writeGameSnapshot(snapshot)
            }}
            onLoad={() => {
              const snap = readGameSnapshot()
              if (!snap) return
              loadGameSnapshot(snap)
              setPage('game')
            }}
            onRestart={() => {
              restartLevelToIntro()
              setPage('game')
              onRestartToIntro()
            }}
            onResetGame={() => {
              clearGameSnapshot()
              resetGame()
              setPage('game')
            }}
          />
        ) : (
          <GameRouter chessRef={chessRef} piRef={piRef} />
        )}
      </div>

      {page === 'game' && (
        <div style={{ flexShrink: 0 }}>
          <DialogueBox visible={true} node={dialogueNode} onAdvance={() => {}} />
        </div>
      )}
    </div>
  )
}

