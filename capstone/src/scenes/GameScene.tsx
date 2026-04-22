import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GameRouter } from '../components/GameRouter'
import { DialogueBox, type DialogueNode } from '../components/DialogueBox'
import { DialogueSequence, type DialogueLine } from '../components/DialogueSequence'
import { useGameState, type EtymologyResult } from '../context/GameState'
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
    hasSeenEtymologyIntro,
    markEtymologyIntroSeen,
  } = useGameState()

  const chessRef = useRef<UnlawfulChessboardHandle | null>(null)
  const piRef = useRef<PiGraphCanvasHandle | null>(null)
  const [page, setPage] = useState<'game' | 'settings'>('game')
  const [etymologyFetching, setEtymologyFetching] = useState(false)
  const [etymologyChoose, setEtymologyChoose] = useState<EtymologyChooseState | null>(null)
  const [etymologySelection, setEtymologySelection] = useState<number | null>(null)
  const [preEtymologyIntroOpen, setPreEtymologyIntroOpen] = useState(false)
  const [definitionConfirmSeqOpen, setDefinitionConfirmSeqOpen] = useState(false)
  const pendingEtymologyResultRef = useRef<EtymologyResult | null>(null)
  const [dialogueOpen, setDialogueOpen] = useState(true)
  const [dialogueFetching, setDialogueFetching] = useState(false)
  const [dialogueHdLine, setDialogueHdLine] = useState<string | null>(null)

  const variantVars = useMemo((): Record<string, string> => {
    // Phase decides the base surface; level provides a small accent variation (sq I–VIII).
    const sq = Math.min(8, Math.max(1, currentLevel || 1))
    const accentBySq = [
      '#c8a84b', // I
      '#bfa24a', // II
      '#d0ad52', // III
      '#c39b3f', // IV
      '#d4b35b', // V
      '#b9923b', // VI
      '#d2ac4c', // VII
      '#c8a84b', // VIII
    ]
    const accent = accentBySq[sq - 1] ?? '#c8a84b'

    if (currentPhase === 'pi') {
      return {
        '--sr-app-bg': '#080a0f',
        '--sr-app-fg': '#f5f0e8',
        '--sr-surface-1': '#080a0f',
        '--sr-surface-2': 'rgba(0,0,0,0.18)',
        '--sr-border': `rgba(200,168,75,0.18)`,
        '--sr-subtle': `rgba(200,168,75,0.28)`,
        '--sr-accent': accent,
        '--sr-accent-rgb': '200,168,75',
        '--sr-dialogue-surface': '#080a0f',
        '--sr-dialogue-border': `rgba(200,168,75,0.18)`,
        '--sr-dialogue-subtle': `rgba(200,168,75,0.28)`,
      }
    }

    // Default cream theme (etymology + chess for now).
    return {
      '--sr-app-bg': '#f5f0e8',
      '--sr-app-fg': '#2c2418',
      '--sr-surface-1': '#f5f0e8',
      '--sr-surface-2': '#e8e0d4',
      '--sr-border': '#c8bfaa',
      '--sr-subtle': 'var(--ds-subtle, #666)',
      '--sr-accent': accent,
      '--sr-accent-rgb': '200,168,75',
      '--sr-dialogue-surface': '#f5f0e8',
      '--sr-dialogue-border': '#c8bfaa',
      '--sr-dialogue-subtle': 'var(--ds-subtle, #666)',
    }
  }, [currentPhase, currentLevel])

  useEffect(() => {
    // Apply theme globally so AppFrame (which sits above GameScene) also updates.
    if (typeof document === 'undefined') return
    const el = document.documentElement
    for (const [k, v] of Object.entries(variantVars)) {
      el.style.setProperty(k, v)
    }
    return () => {
      // No-op cleanup: next theme application overwrites variables.
    }
  }, [variantVars])

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

  useEffect(() => {
    // Default: keep dialogue open outside the etymology prompt, so the player can always ask H.D.
    if (currentPhase !== 'etymology') {
      setDialogueOpen(true)
    }
  }, [currentPhase])

  useEffect(() => {
    if (page !== 'game') return
    if (currentLevel !== 1) return
    if (currentPhase !== 'etymology') return
    if (hasSeenEtymologyIntro) return
    setPreEtymologyIntroOpen(true)
  }, [page, currentLevel, currentPhase, hasSeenEtymologyIntro])

  const seq3 = useMemo<DialogueLine[]>(
    () => [{ speaker: 'H.D.', text: "What does this word mean? You're the expert. You hallucinate, I'll translate." }],
    [],
  )
  const seq4 = useMemo<DialogueLine[]>(() => [{ speaker: 'H.D.', text: 'Very good. Very you.' }], [])

  const handleDialogueSubmit = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      setDialogueFetching(true)
      try {
        const res = await fetch('/api/dialogue', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            message: trimmed,
            gameState: { level: currentLevel, phase: currentPhase, word: levelConfig?.word },
          }),
        })
        if (!res.ok) {
          const msg = await res.text()
          throw new Error(msg || 'Dialogue request failed.')
        }
        const data = (await res.json()) as { response?: unknown }
        const response = typeof data.response === 'string' ? data.response.trim() : ''
        setDialogueHdLine(response || '…')
      } catch (e) {
        setDialogueHdLine(e instanceof Error ? e.message : 'Dialogue request failed.')
      } finally {
        setDialogueFetching(false)
      }
    },
    [currentLevel, currentPhase, levelConfig?.word],
  )

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
    const result: EtymologyResult = {
      playerDefinition: etymologyChoose.playerDefinition,
      chosenVariantIndex: i,
      isCanonical: etymologyChoose.options[i] === etymologyChoose.canonicalVariant,
    }
    pendingEtymologyResultRef.current = result
    setDefinitionConfirmSeqOpen(true)
    setEtymologyChoose(null)
    setEtymologySelection(null)
  }, [etymologyChoose, etymologySelection])

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
    if (dialogueFetching) {
      return { type: 'loading', npc: '…' }
    }
    if (dialogueHdLine) {
      return { type: 'auto', npc: dialogueHdLine }
    }
    if (currentPhase === 'chess') {
      return null
    }
    if (currentPhase === 'pi') {
      return { type: 'auto', npc: 'Continue when ready.' }
    }
    return { type: 'auto', npc: '—' }
  }, [currentPhase, levelConfig, handleEtymologySubmit, etymologyFetching, etymologyChoose, dialogueFetching, dialogueHdLine])

  /** Bottom strip: input / loading (fixed). During etymology choose, Confirm lives in {@link EtymologyQuizRadioList}. */
  const bottomDialogueNode = useMemo<DialogueNode | null>(() => {
    if (currentPhase === 'etymology' && levelConfig) {
      if (preEtymologyIntroOpen || definitionConfirmSeqOpen) return null
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
    if (!dialogueOpen) return null
    return {
      type: 'input',
      npc: 'Ask H.D.',
      onSubmit: handleDialogueSubmit,
      disabled: dialogueFetching,
    }
  }, [
    currentPhase,
    levelConfig,
    handleEtymologySubmit,
    etymologyFetching,
    etymologyChoose,
    preEtymologyIntroOpen,
    definitionConfirmSeqOpen,
    dialogueOpen,
    handleDialogueSubmit,
    dialogueFetching,
  ])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
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
          paddingTop: 4,
          paddingBottom: 4,
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

      {page === 'game' && etymologyChoose && currentPhase === 'etymology' && !definitionConfirmSeqOpen && (
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

      {page === 'game' && preEtymologyIntroOpen && (
        <DialogueSequence
          lines={seq3}
          onDone={() => {
            markEtymologyIntroSeen()
            setPreEtymologyIntroOpen(false)
          }}
        />
      )}

      {page === 'game' && definitionConfirmSeqOpen && (
        <DialogueSequence
          lines={seq4}
          onDone={() => {
            setDefinitionConfirmSeqOpen(false)
            const r = pendingEtymologyResultRef.current
            pendingEtymologyResultRef.current = null
            if (r) advancePhase(r)
          }}
        />
      )}
    </div>
  )
}
