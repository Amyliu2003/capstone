import { useEffect, useMemo, useState } from 'react'
import { DialogueBox } from '../../components/DialogueBox'
import { DSButton } from '../../designSystem/components/DSButton'
import { fetchEtymology, fetchParaphraseDefinition } from './api'
import { JABBERWOCKY } from './jabberwocky'
import { buildMarkovModel, generateWord, type CorpusConfig } from './markov'
import type { EtymologyVariant } from './types'

type EngineState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; variants: EtymologyVariant[] }
  | { status: 'error'; message: string }

export type EtymologyEngineProps = {
  levelMode?: boolean
  levelWord?: string
  /** Player’s definition (for H.D. echo after confirm in level mode). */
  playerDefinition?: string
  /** Four or more LLM + distractor variants; pick one to complete. */
  variants?: EtymologyVariant[]
  onComplete?: (chosen: EtymologyVariant) => void
}

const defaultCorpus: CorpusConfig = { text: JABBERWOCKY }

/** Label for choice cards: `variant.text` only — never `explanation`, the full object, or stringified JSON. */
function variantCardLabel(variant: EtymologyVariant): string {
  const text = variant.text
  if (text.length > 100) {
    // eslint-disable-next-line no-console
    console.warn('[EtymologyEngine] variant.text longer than 100 characters — possible regression.', text.length)
  }
  return text
}

export type EtymologyQuizRadioListProps = {
  variants: EtymologyVariant[]
  selected: number | null
  onSelect: (i: number) => void
  onConfirm: () => void
}

/** Radio-style quiz list + full-width Confirm (used in level mode and GameScene). */
export function EtymologyQuizRadioList({ variants, selected, onSelect, onConfirm }: EtymologyQuizRadioListProps) {
  // eslint-disable-next-line no-console
  console.log('variants count:', variants.length)
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        gap: 10,
        background: '#fffdf8',
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          paddingLeft: 12,
          paddingRight: 12,
          paddingTop: 4,
          paddingBottom: 4,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {variants.map((variant, i) => (
          <div
            key={i}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(i)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect(i)
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '12px 16px',
              cursor: 'pointer',
              borderLeft: selected === i ? '3px solid var(--ds-fg, #1a1a1a)' : '3px solid transparent',
              background: selected === i ? 'rgba(0,0,0,0.06)' : 'transparent',
              color: 'var(--ds-fg, #1a1a1a)',
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                border: '2px solid var(--ds-fg, #1a1a1a)',
                flexShrink: 0,
                marginTop: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-hidden
            >
              {selected === i ? (
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: 'var(--ds-fg, #1a1a1a)',
                  }}
                />
              ) : null}
            </div>
            <span
              style={{
                flex: 1,
                textAlign: 'left',
                fontSize: 14,
                lineHeight: 1.45,
                whiteSpace: 'pre-wrap',
              }}
            >
              {variantCardLabel(variant)}
            </span>
          </div>
        ))}
      </div>
      <div style={{ paddingLeft: 12, paddingRight: 12, paddingBottom: 8, flexShrink: 0 }}>
        <DSButton type="button" disabled={selected === null} onClick={onConfirm} style={{ width: '100%', padding: '12px 16px' }}>
          Confirm
        </DSButton>
      </div>
    </div>
  )
}

export function EtymologyEngine(props: EtymologyEngineProps = {}) {
  const { levelMode, levelWord, playerDefinition: levelPlayerDefinition = '', variants = [], onComplete } = props
  const model = useMemo(() => buildMarkovModel(defaultCorpus, { order: 4 }), [])
  const [word, setWord] = useState('')
  const [playerDefinition, setPlayerDefinition] = useState<string>('')
  /** Humpty paraphrase of `playerDefinition` for the 4th option; empty if not yet run or failed. */
  const [paraphrasedDefinition, setParaphrasedDefinition] = useState<string>('')
  const [state, setState] = useState<EngineState>({ status: 'idle' })
  const [selected, setSelected] = useState<number | null>(null)
  /** Level mode: after Confirm, show H.D. echo then call onComplete. */
  const [levelEcho, setLevelEcho] = useState<{ line: string; chosen: EtymologyVariant } | null>(null)

  const canGenerate = word.trim().length > 0 && state.status !== 'loading'

  function playerFourthVariant(fourthText: string): EtymologyVariant {
    return {
      text: fourthText,
      pattern: 'Player',
      century: '',
      origin_language: '',
      citations: [],
    }
  }

  async function onGenerateEtymology() {
    if (!canGenerate) return
    const w = word.trim()
    const pd = playerDefinition.trim()
    setState({ status: 'loading' })
    setParaphrasedDefinition('')
    try {
      const etymReq = fetchEtymology(
        w,
        {
          tone: 'deadpan',
          include: ['origin_language', 'century', 'semantic_shift', 'fake_citations'],
        },
        playerDefinition || undefined,
      )
      if (!pd) {
        const res = await etymReq
        setState({ status: 'done', variants: res.variants })
        return
      }
      const [res, para] = await Promise.all([
        etymReq,
        fetchParaphraseDefinition(pd).catch(() => null as string | null),
      ])
      const paraOk = para != null && para.trim().length > 0 ? para.trim() : ''
      setParaphrasedDefinition(paraOk)
      const fourthText = paraOk || pd
      setState({ status: 'done', variants: [...res.variants, playerFourthVariant(fourthText)] })
    } catch (e) {
      setState({ status: 'error', message: e instanceof Error ? e.message : 'Unknown error' })
    }
  }

  useEffect(() => {
    if (playerDefinition.trim()) {
      void onGenerateEtymology()
    }
    // Intentionally only when the player’s definition changes (not on every render of onGenerateEtymology).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerDefinition])

  useEffect(() => {
    if (!levelEcho || !onComplete) return
    const id = window.setTimeout(() => {
      onComplete(levelEcho.chosen)
      setLevelEcho(null)
    }, 1500)
    return () => window.clearTimeout(id)
  }, [levelEcho, onComplete])

  function onGenerateNonsense() {
    const w = generateWord(model, { minLength: 4, maxLength: 12 })
    setWord(w)
    setState({ status: 'idle' })
  }

  if (levelMode && levelWord !== undefined && variants.length >= 4 && onComplete) {
    if (levelEcho) {
      return (
        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            height: '100%',
            minHeight: 0,
          }}
        >
          <DialogueBox
            visible={true}
            node={{ type: 'auto', npc: levelEcho.line }}
            onAdvance={() => {}}
            npcOnly
          />
        </section>
      )
    }

    return (
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          height: '100%',
          minHeight: 0,
        }}
      >
        <header style={{ display: 'grid', gap: 4, flexShrink: 0 }}>
          <h2 style={{ margin: 0 }}>Etymology Engine</h2>
          <div style={{ fontSize: 14, opacity: 0.8 }}>
            Pick the definition that fits the word.
          </div>
        </header>
        <div style={{ fontSize: 18, fontWeight: 600, flexShrink: 0 }}>Word: {levelWord}</div>
        <EtymologyQuizRadioList
          variants={variants}
          selected={selected}
          onSelect={setSelected}
          onConfirm={() => {
            if (selected === null) return
            const chosen = variants[selected]!
            const echoLine = levelPlayerDefinition.trim()
              ? `Just as you said — "${levelPlayerDefinition.trim()}." Very good.`
              : `Very good.`
            setLevelEcho({ line: echoLine, chosen })
          }}
        />
      </section>
    )
  }

  return (
    <section style={{ display: 'grid', gap: 10 }} data-paraphrased-definition={paraphrasedDefinition || undefined}>
      <header style={{ display: 'grid', gap: 4 }}>
        <h2 style={{ margin: 0 }}>Etymology Engine</h2>
        <div style={{ fontSize: 14, opacity: 0.8 }}>
          Enter a word, or generate nonsense from a Jabberwocky-trained Markov chain.
        </div>
      </header>

      <label style={{ display: 'grid', gap: 6, alignItems: 'start' }}>
        <div>Word</div>
        <input
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="e.g. frumious / bandersnatch / your own"
          style={{ padding: 8 }}
        />
      </label>

      <DialogueBox
        visible={true}
        node={{
          type: 'input',
          npc: 'What does your word mean? Write a short definition.',
          onSubmit: (text) => {
            setPlayerDefinition(text)
          },
          disabled: state.status === 'loading',
        }}
        onAdvance={() => {}}
      />

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={onGenerateNonsense} disabled={state.status === 'loading'}>
          Generate Nonsense
        </button>
        <button type="button" onClick={onGenerateEtymology} disabled={!canGenerate}>
          Generate Etymology
        </button>
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        <div>Etymology</div>
        {state.status === 'idle' && (
          <div style={{ opacity: 0.8 }}>Generate an etymology to see the story here.</div>
        )}
        {state.status === 'loading' && <div>Loading…</div>}
        {state.status === 'error' && <div style={{ color: 'crimson' }}>{state.message}</div>}
        {state.status === 'done' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              padding: 12,
              background: '#fffdf8',
              borderRadius: 8,
            }}
          >
            {state.variants.map((variant, i) => (
              <p key={i} style={{ margin: 0, fontSize: 14, lineHeight: 1.45, textAlign: 'left', color: 'var(--ds-fg, #1a1a1a)' }}>
                {variantCardLabel(variant)}
              </p>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
