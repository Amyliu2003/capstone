import { useMemo, useState } from 'react'
import { GameStateProvider, useGameState } from './context/GameState'
import { GameRouter } from './components/GameRouter'
import { DialogueBox, type DialogueNode } from './components/DialogueBox'
import { IntroScene } from './components/IntroScene'

function getPlaceholderDefinitions(word: string): string[] {
  return [
    `[A] ${word} — from Old Jabberwock *${word}*, "to gleam at four o'clock".`,
    `[B] ${word} — a portmanteau of *slim* and *lithe*; cf. Carroll (1871).`,
    `[C] ${word} — from Latin *${word}are*, "to gyre"; first attested 1542.`,
    `[D] ${word} — Humpty Dumpty: "it means something like borogoves."`,
  ]
}

function GameShell() {
  const { currentLevel, currentPhase, levelConfig, advancePhase, resetGame } = useGameState()

  const dialogueNode = useMemo<DialogueNode | null>(() => {
    if (currentPhase === 'etymology' && levelConfig) {
      return {
        type: 'choice',
        npc: `What does "${levelConfig.word}" mean? Pick one.`,
        options: getPlaceholderDefinitions(levelConfig.word),
        onSelect: (i: number) => {
          console.log('[Dialogue] choice selected', i)
          advancePhase({ chosenDefinitionIndex: i })
        },
      }
    }
    if (currentPhase === 'chess') {
      return {
        type: 'auto',
        npc: 'Complete the puzzle above.',
      }
    }
    if (currentPhase === 'pi') {
      return {
        type: 'auto',
        npc: 'Continue when ready.',
      }
    }
    return { type: 'auto', npc: '—' }
  }, [currentPhase, levelConfig, advancePhase])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 12,
        width: '100%',
        maxWidth: 900,
        height: '100%',
        minHeight: 0,
        margin: 0,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ flexShrink: 0 }}>
        <DialogueBox
          visible={true}
          node={dialogueNode}
          onAdvance={() => console.log('[Dialogue] advance')}
          npcOnly
        />
      </div>
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
        <button type="button" onClick={resetGame}>
          Reset game
        </button>
      </header>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <GameRouter />
      </div>
      <div style={{ flexShrink: 0 }}>
        <DialogueBox
          visible={true}
          node={dialogueNode}
          onAdvance={() => console.log('[Dialogue] advance')}
        />
      </div>
    </div>
  )
}

function App() {
  const [started, setStarted] = useState(false)

  if (!started) {
    return <IntroScene onStart={() => setStarted(true)} />
  }

  return (
    <GameStateProvider>
      <GameShell />
    </GameStateProvider>
  )
}

export default App
