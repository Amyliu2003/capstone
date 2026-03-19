import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '..', '.env')
dotenv.config({ path: envPath })

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY?.trim()
const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim()
const LLM_PROVIDER = (process.env.LLM_PROVIDER ?? '').toLowerCase() // 'openai' | 'anthropic'

// When both keys exist and LLM_PROVIDER is unset, default to Anthropic (backward compatible)
const useOpenAI =
  LLM_PROVIDER === 'openai' ? !!OPENAI_API_KEY : !!OPENAI_API_KEY && !ANTHROPIC_API_KEY
const useAnthropic =
  LLM_PROVIDER === 'anthropic' ? !!ANTHROPIC_API_KEY : !!ANTHROPIC_API_KEY

if (useOpenAI && !OPENAI_API_KEY) {
  // eslint-disable-next-line no-console
  console.error('[etymology server] LLM_PROVIDER=openai but OPENAI_API_KEY is missing. Put it in:', envPath)
  process.exit(1)
}
if (useAnthropic && !ANTHROPIC_API_KEY) {
  // eslint-disable-next-line no-console
  console.error('[etymology server] ANTHROPIC_API_KEY is missing (or set LLM_PROVIDER=openai). Put it in:', envPath)
  process.exit(1)
}
if (!useOpenAI && !useAnthropic) {
  // eslint-disable-next-line no-console
  console.error(
    '[etymology server] Set at least one of OPENAI_API_KEY or ANTHROPIC_API_KEY in',
    envPath,
    'Optional: LLM_PROVIDER=openai or LLM_PROVIDER=anthropic to choose.'
  )
  process.exit(1)
}
// eslint-disable-next-line no-console
console.log('[etymology server] LLM provider:', useOpenAI ? 'OpenAI' : 'Anthropic')

import { spawn } from 'child_process'
import express, { type Request, type Response } from 'express'

import { etymologyPatterns } from '../src/features/EtymologyEngine/etymology_patterns'

const STOCKFISH_PATH = process.env.STOCKFISH_PATH ?? 'stockfish'

type PromptConfig = {
  tone?: 'academic' | 'whimsical' | 'deadpan'
  include?: Array<'origin_language' | 'century' | 'semantic_shift' | 'fake_citations'>
}

type JabberwockySourceWord = (typeof etymologyPatterns.jabberwocky_source_words)[number]

function similarityScore(aRaw: string, bRaw: string): number {
  const a = aRaw.toLowerCase()
  const b = bRaw.toLowerCase()
  if (a === b) return 100

  // Shared prefix length
  let prefix = 0
  const maxPrefix = Math.min(a.length, b.length)
  while (prefix < maxPrefix && a[prefix] === b[prefix]) prefix++

  // Shared unique letters
  const setA = new Set(a)
  const setB = new Set(b)
  let shared = 0
  for (const ch of setA) {
    if (setB.has(ch)) shared++
  }

  return prefix * 3 + shared
}

function retrieveExamples(word: string, k = 4): JabberwockySourceWord[] {
  const items = etymologyPatterns.jabberwocky_source_words.slice()
  items.sort((a, b) => similarityScore(word, b.word) - similarityScore(word, a.word))
  return items.slice(0, Math.max(1, k))
}

function buildPrompt(word: string, promptConfig?: PromptConfig): string {
  const tone = promptConfig?.tone ?? 'deadpan'
  const include = new Set(promptConfig?.include ?? ['origin_language', 'century', 'semantic_shift', 'fake_citations'])

  const examples = retrieveExamples(word)
  const examplesBlock =
    examples.length === 0
      ? ''
      : [
          'Here are example entries to imitate:',
          '',
          ...examples.map((ex) =>
            [
              `Word: ${ex.word}`,
              `Explanation: ${ex.humpty_explanation}`,
              ex.pattern_type ? `Pattern: ${ex.pattern_type}` : '',
            ]
              .filter(Boolean)
              .join('\n'),
          ),
          '',
        ].join('\n')

  const bullets: string[] = []
  if (include.has('origin_language')) bullets.push('- Invent an origin language name and a plausible-sounding gloss.')
  if (include.has('century')) bullets.push('- Give an approximate century/date range for earliest attestation.')
  if (include.has('semantic_shift')) bullets.push('- Describe semantic drift across at least two stages.')
  if (include.has('fake_citations')) bullets.push('- Include 1–2 clearly fictional citations (book/article style).')

  return [
    etymologyPatterns.llm_system_prompt_context.prompt,
    '',
    examplesBlock,
    `Now write a clearly fictional etymology for the word: "${word}".`,
    `Tone: ${tone}.`,
    '',
    'Constraints:',
    '- Do NOT claim this is real history; keep it obviously playful but coherent.',
    '- Keep it to 2–4 short paragraphs.',
    '',
    'Include:',
    ...bullets,
  ]
    .filter((line) => line !== '')
    .join('\n')
}

async function anthropicMessages(prompt: string) {
  const model = process.env.ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-latest'

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 700,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Anthropic error: ${res.status}`)
  }

  const data: unknown = await res.json()
  const content =
    typeof data === 'object' && data !== null && 'content' in data ? (data as { content?: unknown }).content : undefined

  const firstText =
    Array.isArray(content) && content.length > 0
      ? content.find((c) => {
          if (typeof c !== 'object' || c === null) return false
          if (!('type' in c)) return false
          return (c as { type?: unknown }).type === 'text'
        })
      : undefined

  const text =
    typeof firstText === 'object' && firstText !== null && 'text' in firstText
      ? (firstText as { text?: unknown }).text
      : undefined
  if (typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Unexpected Anthropic response shape')
  }
  return text.trim()
}

async function openaiMessages(prompt: string): Promise<string> {
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 700,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `OpenAI error: ${res.status}`)
  }

  const data: unknown = await res.json()
  const choices =
    typeof data === 'object' && data !== null && 'choices' in data
      ? (data as { choices?: unknown }).choices
      : undefined
  const firstChoice = Array.isArray(choices) && choices.length > 0 ? choices[0] : undefined
  const message =
    typeof firstChoice === 'object' && firstChoice !== null && 'message' in firstChoice
      ? (firstChoice as { message?: unknown }).message
      : undefined
  const text =
    typeof message === 'object' && message !== null && 'content' in message
      ? (message as { content?: unknown }).content
      : undefined
  if (typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Unexpected OpenAI response shape')
  }
  return text.trim()
}

async function generateEtymology(prompt: string): Promise<string> {
  if (useOpenAI) return openaiMessages(prompt)
  return anthropicMessages(prompt)
}

const app = express()
app.use(express.json({ limit: '100kb' }))

app.post('/api/etymology', async (req: Request, res: Response) => {
  const word = req.body?.word
  const promptConfig = req.body?.promptConfig as PromptConfig | undefined

  if (typeof word !== 'string' || word.trim().length === 0) {
    res.status(400).send('Missing "word"')
    return
  }

  try {
    const prompt = buildPrompt(word.trim(), promptConfig)
    const story = await generateEtymology(prompt)
    res.json({ word: word.trim(), story })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg.includes('ANTHROPIC_API_KEY') || msg.includes('Missing ANTHROPIC')) {
      res.status(500).send(
        'An old server without your .env is still running. Stop it: run "lsof -ti :8787 | xargs kill" in a terminal, then from the capstone app folder run "npm run dev:fresh". To use OpenAI instead, add OPENAI_API_KEY and LLM_PROVIDER=openai to .env.'
      )
      return
    }
    res.status(500).send(msg)
  }
})

const STOCKFISH_MOVETIME_MS = 220

function parseStockfishOutput(out: string): { cp?: number; mate?: number; bestmove?: string } {
  let cp: number | undefined
  let mate: number | undefined
  let bestmove: string | undefined
  const bestmoveLine = out.split('\n').find((l) => l.startsWith('bestmove '))
  if (bestmoveLine) {
    const part = bestmoveLine.slice(9).trim().split(' ')[0]
    if (part && part !== '(none)') bestmove = part
  }
  const scoreLines = out.split('\n').filter((l) => l.includes(' score '))
  const lastScore = scoreLines[scoreLines.length - 1]
  if (lastScore) {
    const cpM = lastScore.match(/ score cp (-?\d+)/)
    const mateM = lastScore.match(/ score mate (-?\d+)/)
    if (cpM) cp = Number(cpM[1])
    if (mateM) mate = Number(mateM[1])
  }
  return { cp, mate, bestmove }
}

type StockfishWorker = {
  proc: ReturnType<typeof spawn>
  ready: boolean
  busy: boolean
  out: string
  resolve: ((r: { cp?: number; mate?: number; bestmove?: string }) => void) | null
  reject: ((e: Error) => void) | null
  timeoutId: ReturnType<typeof setTimeout> | null
  dataListener: ((chunk: Buffer) => void) | null
}

let stockfishWorker: StockfishWorker | null = null
const stockfishQueue: Array<{ fen: string; resolve: (r: { cp?: number; mate?: number; bestmove?: string }) => void; reject: (e: Error) => void }> = []

function getStockfishWorker(): Promise<StockfishWorker> {
  if (stockfishWorker) return Promise.resolve(stockfishWorker)
  return new Promise((resolve, reject) => {
    const proc = spawn(STOCKFISH_PATH, [], { stdio: ['pipe', 'pipe', 'pipe'] })
    let out = ''
    const failTimeout = setTimeout(() => {
      proc.kill('SIGKILL')
      stockfishWorker = null
      reject(new Error('Stockfish failed to become ready'))
    }, 8000)
    const onData = (chunk: Buffer) => {
      out += chunk.toString()
      if (out.includes('readyok')) {
        proc.stdout?.off('data', onData)
        proc.stderr?.off('data', () => {})
        clearTimeout(failTimeout)
        stockfishWorker = {
          proc,
          ready: true,
          busy: false,
          out: '',
          resolve: null,
          reject: null,
          timeoutId: null,
          dataListener: null,
        }
        resolve(stockfishWorker!)
      }
    }
    proc.stdout?.on('data', onData)
    proc.stderr?.on('data', (chunk: Buffer) => {
      out += chunk.toString()
    })
    proc.on('error', (err) => {
      stockfishWorker = null
      clearTimeout(failTimeout)
      reject(err)
    })
    proc.stdin?.write('uci\n')
    proc.stdin?.write('isready\n')
  })
}

function processStockfishQueue(w: StockfishWorker) {
  if (w.busy || stockfishQueue.length === 0) return
  const { fen, resolve, reject } = stockfishQueue.shift()!
  w.busy = true
  w.resolve = resolve
  w.reject = reject
  w.out = ''
  if (w.dataListener) {
    w.proc.stdout?.off('data', w.dataListener)
    w.dataListener = null
  }
  const onData = (chunk: Buffer) => {
    w.out += chunk.toString()
    if (w.out.includes('bestmove ')) {
      w.proc.stdout?.off('data', onData)
      w.dataListener = null
      const result = parseStockfishOutput(w.out)
      w.busy = false
      if (w.timeoutId) {
        clearTimeout(w.timeoutId)
        w.timeoutId = null
      }
      if (w.resolve) {
        w.resolve(result)
        w.resolve = null
        w.reject = null
      }
      processStockfishQueue(w)
    }
  }
  w.dataListener = onData
  w.proc.stdout?.on('data', onData)
  w.proc.stdin?.write(`position fen ${fen}\n`)
  w.proc.stdin?.write(`go movetime ${STOCKFISH_MOVETIME_MS}\n`)
  w.timeoutId = setTimeout(() => {
    w.proc.stdin?.write('stop\n')
  }, STOCKFISH_MOVETIME_MS + 350)
}

function runStockfishEval(fen: string): Promise<{ cp?: number; mate?: number; bestmove?: string }> {
  return new Promise((resolve, reject) => {
    stockfishQueue.push({ fen, resolve, reject })
    getStockfishWorker()
      .then(processStockfishQueue)
      .catch((err) => {
        while (stockfishQueue.length > 0) {
          const item = stockfishQueue.shift()!
          item.reject(err)
        }
      })
  })
}

app.post('/api/chess/evaluate', async (req: Request, res: Response) => {
  const fen = typeof req.body?.fen === 'string' ? req.body.fen.trim() : ''
  if (!fen) {
    res.status(400).json({ error: 'Missing "fen"' })
    return
  }
  try {
    const result = await runStockfishEval(fen)
    res.json(result)
  } catch (e) {
    res.status(503).json({
      error: 'Stockfish not available. Install it (e.g. brew install stockfish) or set STOCKFISH_PATH.',
      detail: e instanceof Error ? e.message : String(e),
    })
  }
})

const port = Number(process.env.PORT ?? 8787)
const server = app.listen(port, () => {
  console.log(`Etymology proxy listening on http://localhost:${port}`)
  console.log('  (If you see "Missing ANTHROPIC_API_KEY" in the app, kill the old server: lsof -ti :8787 | xargs kill)')
})
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[etymology server] Port ${port} is in use. Kill the other process: lsof -ti :${port} | xargs kill`)
  }
  process.exit(1)
})

