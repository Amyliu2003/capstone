import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GameRouter } from '../components/GameRouter'
import { DialogueBox, type DialogueNode } from '../components/DialogueBox'
import { useGameState } from '../context/GameState'
import { DSButton } from '../designSystem/components/DSButton'
import { fetchEtymology, type EtymologyPromptConfig } from '../features/EtymologyEngine/api'
import { EtymologyQuizRadioList } from '../features/EtymologyEngine/EtymologyEngine'
import type { EtymologyVariant } from '../features/EtymologyEngine/types'
import { readGameSnapshot, writeGameSnapshot, clearGameSnapshot, type GameSnapshotV1 } from '../gameSave/gameStorage'
import type { UnlawfulChessboardHandle } from '../features/UnlawfulChessboard/UnlawfulChessboard'
import type { PiGraphCanvasHandle } from '../features/PiGraph/PiGraphCanvas'
import { SettingsScene } from './SettingsScene'

const ETYMOLOGY_PROMPT: EtymologyPromptConfig = {
  tone: 'deadpan',
  include: ['origin_language', 'century', 'semantic_shift', 'fake_citations'],
}

function shuffleFourOptions<T>(items: [T, T, T, T]): T[] {
  const a: T[] = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const t = a[i]!
    a[i] = a[j]!
    a[j] = t
  }
  return a
}

/** Hardcoded Carroll / Humpty option shape for the 4th quiz choice (client-side only). */
function carrollCanonicalVariant(canonicalText: string): EtymologyVariant {
  return {
    text: canonicalText,
    pattern: 'Carroll (Through the Looking-Glass, Ch. VI — Humpty Dumpty)',
    century: '1871',
    origin_language: 'English',
    citations: ['Lewis Carroll, Through the Looking-Glass, Chapter VI'],
  }
}

type EtymologyChooseState = {
  options: EtymologyVariant[]
  canonicalVariant: EtymologyVariant
  playerDefinition: string
}

export function GameScene({ onRestartToIntro }: { onRestartToIntro: () => void }) {
  const {
    currentLevel,
    currentPhase,
    levelConfig,
    advancePhase,
    resetGame,
    levelHistory,
    loadGameSnapshot,
    restartLevelToIntro,
    runSeed,
  } = useGameState()

  const chessRef = useRef<UnlawfulChessboardHandle | null>(null)
  const piRef = useRef<PiGraphCanvasHandle | null>(null)
  const [page, setPage] = useState<'game' | 'settings'>('game')
  const [etymologyFetching, setEtymologyFetching] = useState(false)
  const [etymologyChoose, setEtymologyChoose] = useState<EtymologyChooseState | null>(null)
  const [etymologySelection, setEtymologySelection] = useState<number | null>(null)

  useEffect(() => {
    setEtymologyChoose(null)
  }, [runSeed])

  useEffect(() => {
    setEtymologySelection(null)
  }, [etymologyChoose])

  useEffect(() => {
    if (currentPhase !== 'etymology') {
      setEtymologyChoose(null)
      setEtymologyFetching(false)
    }
  }, [currentPhase])

  const handleEtymologySubmit = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || !levelConfig || etymologyChoose) return
      setEtymologyFetching(true)
      try {
        const { variants } = await fetchEtymology(levelConfig.word, ETYMOLOGY_PROMPT, trimmed)
        const [v0, v1, v2] = variants
        if (v0 == null || v1 == null || v2 == null) {
          throw new Error('Expected 3 variants from server.')
        }
        const canonicalVariant = carrollCanonicalVariant(levelConfig.canonicalDefinition)
        const merged = shuffleFourOptions([v0, v1, v2, canonicalVariant])
        if (!merged.includes(canonicalVariant)) {
          throw new Error('Could not place canonical definition in options.')
        }
        setEtymologyChoose({
          options: merged,
          canonicalVariant,
          playerDefinition: trimmed,
        })
      } catch (e) {
        // eslint-disable-next-line no-alert
        alert(e instanceof Error ? e.message : 'Failed to generate etymology.')
      } finally {
        setEtymologyFetching(false)
      }
    },
    [levelConfig, etymologyChoose],
  )

  const handleEtymologyConfirm = useCallback(() => {
    if (!etymologyChoose || etymologySelection === null) return
    const i = etymologySelection
    advancePhase({
      playerDefinition: etymologyChoose.playerDefinition,
      chosenVariantIndex: i,
      isCanonical: etymologyChoose.options[i] === etymologyChoose.canonicalVariant,
    })
    setEtymologyChoose(null)
  }, [etymologyChoose, etymologySelection, advancePhase])

  /** Top H.D. strip: question only (fixed). */
  const topDialogueNode = useMemo<DialogueNode | null>(() => {
    if (currentPhase === 'etymology' && levelConfig) {
      if (etymologyFetching) {
        return { type: 'loading', npc: 'Tokenizing your input...' }
      }
      if (etymologyChoose) {
        return { type: 'auto', npc: `Which definition best fits "${levelConfig.word}"?` }
      }
      return {
        type: 'input',
        npc: `What does "${levelConfig.word}" mean? Write your own definition below.`,
        onSubmit: handleEtymologySubmit,
        disabled: etymologyFetching,
      }
    }
    if (currentPhase === 'chess') {
      return { type: 'auto', npc: 'Complete the puzzle above.' }
    }
    if (currentPhase === 'pi') {
      return { type: 'auto', npc: 'Continue when ready.' }
    }
    return { type: 'auto', npc: '—' }
  }, [currentPhase, levelConfig, handleEtymologySubmit, etymologyFetching, etymologyChoose])

  /** Bottom strip: input / loading (fixed). During etymology choose, Confirm lives in {@link EtymologyQuizRadioList}. */
  const bottomDialogueNode = useMemo<DialogueNode | null>(() => {
    if (currentPhase === 'etymology' && levelConfig) {
      if (etymologyFetching) {
        return { type: 'loading', npc: 'Tokenizing your input...' }
      }
      if (etymologyChoose) {
        return null
      }
      return {
        type: 'input',
        npc: `What does "${levelConfig.word}" mean? Write your own definition below.`,
        onSubmit: handleEtymologySubmit,
        disabled: etymologyFetching,
      }
    }
    if (currentPhase === 'chess') {
      return { type: 'auto', npc: 'Complete the puzzle above.' }
    }
    if (currentPhase === 'pi') {
      return { type: 'auto', npc: 'Continue when ready.' }
    }
    return { type: 'auto', npc: '—' }
  }, [currentPhase, levelConfig, handleEtymologySubmit, etymologyFetching, etymologyChoose])

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
          <DialogueBox visible={true} node={topDialogueNode} onAdvance={() => {}} npcOnly />
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

      {page === 'game' && etymologyChoose && currentPhase === 'etymology' && (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <EtymologyQuizRadioList
            variants={etymologyChoose.options}
            selected={etymologySelection}
            onSelect={setEtymologySelection}
            onConfirm={handleEtymologyConfirm}
          />
        </div>
      )}

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
          <DialogueBox visible={true} node={bottomDialogueNode} onAdvance={() => {}} />
        </div>
      )}
    </div>
  )
}
