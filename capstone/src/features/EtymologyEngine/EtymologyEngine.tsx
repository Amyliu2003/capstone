import { useMemo, useState } from 'react'
import { fetchEtymology } from './api'
import { JABBERWOCKY } from './jabberwocky'
import { buildMarkovModel, generateWord, type CorpusConfig } from './markov'

type EngineState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; story: string }
  | { status: 'error'; message: string }

export type EtymologyCompleteResult = { chosenDefinitionIndex: number }

export type EtymologyEngineProps = {
  levelMode?: boolean
  levelWord?: string
  definitions?: string[]
  onComplete?: (result: EtymologyCompleteResult) => void
}

const defaultCorpus: CorpusConfig = { text: JABBERWOCKY }

export function EtymologyEngine(props: EtymologyEngineProps = {}) {
  const { levelMode, levelWord, definitions = [], onComplete } = props
  const model = useMemo(() => buildMarkovModel(defaultCorpus, { order: 4 }), [])
  const [word, setWord] = useState('')
  const [state, setState] = useState<EngineState>({ status: 'idle' })

  const canGenerate = word.trim().length > 0 && state.status !== 'loading'

  async function onGenerateEtymology() {
    if (!canGenerate) return
    const w = word.trim()
    setState({ status: 'loading' })
    try {
      const res = await fetchEtymology(w, {
        tone: 'deadpan',
        include: ['origin_language', 'century', 'semantic_shift', 'fake_citations'],
      })
      setState({ status: 'done', story: res.story })
    } catch (e) {
      setState({ status: 'error', message: e instanceof Error ? e.message : 'Unknown error' })
    }
  }

  function onGenerateNonsense() {
    const w = generateWord(model, { minLength: 4, maxLength: 12 })
    setWord(w)
    setState({ status: 'idle' })
  }

  if (levelMode && levelWord !== undefined && definitions.length >= 4 && onComplete) {
    return (
      <section style={{ display: 'grid', gap: 12 }}>
        <header style={{ display: 'grid', gap: 4 }}>
          <h2 style={{ margin: 0 }}>Etymology Engine</h2>
          <div style={{ fontSize: 14, opacity: 0.8 }}>
            Pick the definition that fits the word.
          </div>
        </header>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Word: {levelWord}</div>
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Choose one:</div>
          {definitions.map((text, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onComplete({ chosenDefinitionIndex: i })}
              style={{
                padding: 12,
                textAlign: 'left',
                cursor: 'pointer',
                border: '1px solid #333',
                borderRadius: 4,
                backgroundColor: '#fafafa',
              }}
            >
              {text}
            </button>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section style={{ display: 'grid', gap: 10 }}>
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
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0, padding: 8 }}>
            {state.story}
          </pre>
        )}
      </div>
    </section>
  )
}

