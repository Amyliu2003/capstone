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
import RiveScript from 'rivescript'

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

function buildEtymologyPrompt(word: string, _promptConfig?: PromptConfig, playerDefinition?: string): string {
  const examples = retrieveExamples(word)
  const examplesBlock =
    examples.length === 0
      ? ''
      : [
          'Examples of the ONLY acceptable style:',
          '',
          ...examples.map((ex) => `${ex.word}: ${ex.humpty_explanation}`),
          '',
        ].join('\n')

  const playerLine =
    playerDefinition
      ? `The player described this word as: "${playerDefinition}". You MUST incorporate at least one word or short phrase from the player's input verbatim into one of the three variants — woven into the prose naturally, not quoted. Do not sanitize or replace their vocabulary.\n`
      : ''

  const humptySystemPrompt =
    "You are Humpty Dumpty. You explain words the way Carroll wrote you: one or two short declarative sentences, completely confident, slightly absurd, never academic. You do not write dictionary entries. You do not list origins, centuries, or semantic drift. You just say what the word means, as if it were obvious. Example: 'Brillig means four o'clock in the afternoon — the time when you begin broiling things for dinner.' Example: 'Slithy means lithe and slimy — two meanings packed into one word.' That is all."

  return [
    humptySystemPrompt,
    '',
    examplesBlock,
    playerLine,
    `Now write a clearly fictional etymology for the word: "${word}".`,
    '',
    'Constraints:',
    '- ONE or TWO sentences maximum. If you write three sentences, you have failed.',
    '- Concrete and physical — describe what a person does, feels, or experiences. Not abstract concepts.',
    '- The three variants MUST have completely different meanings. Not the same idea with different words.',
    '',
    'Output format:',
    'Return ONLY this JSON, no other text:',
    '[',
    '  {"text": "ONE sentence, max 20 words, Humpty Dumpty style", "pattern": "type", "century": "Nth century", "origin_language": "name", "citations": ["source, year"]},',
    '  {"text": "ONE sentence, max 20 words, completely different meaning", "pattern": "type", "century": "Nth century", "origin_language": "name", "citations": ["source, year"]},',
    '  {"text": "ONE sentence, max 20 words, completely different meaning again", "pattern": "type", "century": "Nth century", "origin_language": "name", "citations": ["source, year"]}',
    ']',
    '',
    'The `text` field is ONE SHORT SENTENCE ONLY. Everything else goes in the other fields. Do NOT put Explanation, Pattern, Date, Semantic Drift, or Citations inside `text`.',
    'You MUST return exactly 3 objects in the array. If you return fewer than 3, you have failed.',
  ]
    .filter((line) => line !== '')
    .join('\n')
}

/** Find the index of the `]` that closes the array starting at `start` (respects strings). */
function findEndOfJsonArray(s: string, start: number): number {
  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < s.length; i++) {
    const ch = s[i]
    if (inString) {
      if (escape) {
        escape = false
        continue
      }
      if (ch === '\\') {
        escape = true
        continue
      }
      if (ch === '"') {
        inString = false
      }
      continue
    }
    if (ch === '"') {
      inString = true
      continue
    }
    if (ch === '[') depth++
    if (ch === ']') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

function repairLlmJson(raw: string): string {
  // Strip markdown fences if present
  const s = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
  const start = s.indexOf('[')
  if (start === -1) throw new Error('No JSON array found in LLM response')
  const end = findEndOfJsonArray(s, start)
  if (end === -1) throw new Error('Unbalanced JSON array in LLM response')
  return s.slice(start, end + 1)
}

const TEMPLATES = [
  (w: string) =>
    `${w} means the feeling just before something important happens, though nobody agrees on what.`,
  (w: string) =>
    `${w} is what you call it when two things are almost the same but neither will admit it.`,
  (w: string) =>
    `${w} derives from an old word for 'Thursday' in a language that only had four days.`,
]

/** Humpty Dumpty–style example explanations from Carroll (jabberwocky_source_words). */
const HUMPTY_FALLBACK_TEMPLATES: Array<(w: string) => string> =
  etymologyPatterns.jabberwocky_source_words.map(
    (entry) => (w: string) => `${w}: ${entry.humpty_explanation}`,
  )

function generateTemplateFallback(word: string): string {
  const pool = [...TEMPLATES, ...HUMPTY_FALLBACK_TEMPLATES]
  return pool[Math.floor(Math.random() * pool.length)](word)
}

/** Same shape as client `EtymologyVariant` (features/EtymologyEngine/types). */
type EtymologyVariantPayload = {
  text: string
  pattern: string
  century: string
  origin_language: string
  citations: string[]
}

function buildEtymologyFallbackVariants(word: string, playerDefinition?: string): EtymologyVariantPayload[] {
  const a = generateTemplateFallback(word)
  const b = generateTemplateFallback(word)
  const pd = playerDefinition?.trim()
  const c =
    pd && pd.length > 0
      ? `${word} means ${pd.split(/\s+/).slice(0, 6).join(' ')}. (Or so you insist.)`
      : generateTemplateFallback(word)
  return [
    { text: a, pattern: 'Fallback', century: '—', origin_language: '—', citations: [] },
    { text: b, pattern: 'Fallback', century: '—', origin_language: '—', citations: [] },
    { text: c, pattern: 'Fallback', century: '—', origin_language: '—', citations: [] },
  ]
}

function normalizeVariant(item: unknown, word: string): EtymologyVariantPayload {
  if (item && typeof item === 'object') {
    const obj = item as Record<string, unknown>
    return {
      text: typeof obj.text === 'string' ? obj.text : generateTemplateFallback(word),
      pattern: typeof obj.pattern === 'string' ? obj.pattern : 'Unknown',
      century: typeof obj.century === 'string' ? obj.century : 'Unknown',
      origin_language: typeof obj.origin_language === 'string' ? obj.origin_language : 'Unknown',
      citations: Array.isArray(obj.citations)
        ? obj.citations.filter((c): c is string => typeof c === 'string')
        : [],
    }
  }
  if (typeof item === 'string') {
    const text = item.match(/Explanation:\s*([\s\S]*?)(?=\s*Pattern:|$)/)?.[1]?.trim()
    const pattern = item.match(/Pattern:\s*([^\n]+)/)?.[1]?.trim()
    return {
      text: text ?? generateTemplateFallback(word),
      pattern: pattern ?? 'Unknown',
      century: 'Unknown',
      origin_language: 'Unknown',
      citations: [],
    }
  }
  return {
    text: generateTemplateFallback(word),
    pattern: 'Unknown',
    century: 'Unknown',
    origin_language: 'Unknown',
    citations: [],
  }
}

/** Parse LLM JSON into 3 variant objects (tolerates markdown fences; legacy string[] supported). */
function parseVariantsFromLlmText(raw: string, word: string): EtymologyVariantPayload[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(repairLlmJson(raw))
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(`Failed to parse LLM JSON: ${msg}`)
  }
  if (!Array.isArray(parsed)) {
    throw new Error('LLM did not return an array')
  }

  const items = parsed.slice(0, 3)
  while (items.length < 3) items.push(null)
  return items.map((item) => normalizeVariant(item, word))
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
      max_tokens: 1200,
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

  const textBlocks =
    Array.isArray(content) && content.length > 0
      ? content.filter((c) => {
          if (typeof c !== 'object' || c === null) return false
          if (!('type' in c)) return false
          return (c as { type?: unknown }).type === 'text'
        })
      : []

  const text = textBlocks
    .map((block) => {
      if (typeof block === 'object' && block !== null && 'text' in block) {
        const t = (block as { text?: unknown }).text
        return typeof t === 'string' ? t : ''
      }
      return ''
    })
    .join('')

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
      max_tokens: 1200,
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

function buildParaphrasePrompt(text: string): string {
  const safe = text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  return `Rewrite the following in the style of Humpty Dumpty — one short confident sentence, concrete and physical, no academic language. Keep the core meaning. Input: '${safe}'`
}

const app = express()
app.use(express.json({ limit: '100kb' }))

type DialogueGameState = { level: number; phase: string; word?: string }

const dialogueBot = new RiveScript()
const dialogueRivePath = path.join(__dirname, 'dialogue.rive')
const dialogueBotReady = dialogueBot.loadFile(dialogueRivePath).then(() => {
  dialogueBot.sortReplies()
})

function buildDialogueSystemPrompt(word?: string): string {
  const w = (word ?? '').trim()
  const wordClause = w ? `current word '${w}'` : `current word ''`
  return (
    "You are Humpty Dumpty. The player is talking to you during a word puzzle game.\n" +
    'Respond in 1-2 short sentences only. Stay in character: confident, slightly\n' +
    'obtuse, never helpful in a direct way, never break the fourth wall.\n' +
    `If they mention the ${wordClause}, you may reference it obliquely.\n` +
    'Never say you are an AI. Never explain the game. Never apologize.'
  )
}

async function callLlmForDialogue(message: string, gameState: DialogueGameState): Promise<string> {
  const sys = buildDialogueSystemPrompt(gameState.word)
  const prompt = `${sys}\n\nPlayer: ${message}\nHumpty Dumpty:`
  return generateEtymology(prompt)
}

async function getDialogueResponse(
  message: string,
  gameState: DialogueGameState,
): Promise<{ response: string; source: 'rivescript' | 'llm' }> {
  await dialogueBotReady
  const rsReply = await dialogueBot.replyAsync('localuser', message)
  const isDefaultFallback =
    rsReply.includes('explain all the poems') || rsReply === 'ERR: No Reply Matched'

  if (!isDefaultFallback) {
    return { response: rsReply, source: 'rivescript' }
  }

  const llmResponse = await callLlmForDialogue(message, gameState)
  return { response: llmResponse.trim(), source: 'llm' }
}

app.post('/api/dialogue', async (req: Request, res: Response) => {
  const rawMessage = req.body?.message
  const rawGameState = req.body?.gameState
  if (typeof rawMessage !== 'string' || rawMessage.trim().length === 0) {
    res.status(400).send('Missing "message"')
    return
  }
  if (!rawGameState || typeof rawGameState !== 'object') {
    res.status(400).send('Missing "gameState"')
    return
  }
  const gs = rawGameState as Record<string, unknown>
  const level = typeof gs.level === 'number' ? gs.level : Number(gs.level)
  const phase = typeof gs.phase === 'string' ? gs.phase : String(gs.phase ?? '')
  const word = typeof gs.word === 'string' ? gs.word : undefined
  if (!Number.isFinite(level) || !phase) {
    res.status(400).send('Malformed "gameState"')
    return
  }

  try {
    const out = await getDialogueResponse(rawMessage.trim(), { level, phase, word })
    res.json(out)
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

app.post('/api/etymology/paraphrase', async (req: Request, res: Response) => {
  const raw = req.body?.text
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    res.status(400).json({ error: 'Missing "text"' })
    return
  }
  const text = raw.trim()
  try {
    const prompt = buildParaphrasePrompt(text)
    const rewritten = await generateEtymology(prompt)
    res.json({ text: rewritten.trim() })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg.includes('ANTHROPIC_API_KEY') || msg.includes('Missing ANTHROPIC')) {
      res.status(500).send(
        'An old server without your .env is still running. Stop it: run "lsof -ti :8787 | xargs kill" in a terminal, then from the capstone app folder run "npm run dev:fresh". To use OpenAI instead, add OPENAI_API_KEY and LLM_PROVIDER=openai to .env.',
      )
      return
    }
    res.status(500).send(msg)
  }
})

app.post('/api/etymology', async (req: Request, res: Response) => {
  const word = req.body?.word
  const promptConfig = req.body?.promptConfig as PromptConfig | undefined
  const rawPlayerDef = req.body?.playerDefinition
  const playerDefinition =
    typeof rawPlayerDef === 'string' && rawPlayerDef.trim().length > 0 ? rawPlayerDef.trim() : undefined

  if (typeof word !== 'string' || word.trim().length === 0) {
    res.status(400).send('Missing "word"')
    return
  }

  try {
    const trimmedWord = word.trim()
    const prompt = buildEtymologyPrompt(trimmedWord, promptConfig, playerDefinition)
    const story = await generateEtymology(prompt)
    const variants = parseVariantsFromLlmText(story, trimmedWord)
    // eslint-disable-next-line no-console
    console.log('[etymology] raw LLM output:', story)
    // eslint-disable-next-line no-console
    console.log('[etymology] parsed variants:', variants)
    res.json({ word: word.trim(), variants })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg.includes('ANTHROPIC_API_KEY') || msg.includes('Missing ANTHROPIC')) {
      res.status(500).send(
        'An old server without your .env is still running. Stop it: run "lsof -ti :8787 | xargs kill" in a terminal, then from the capstone app folder run "npm run dev:fresh". To use OpenAI instead, add OPENAI_API_KEY and LLM_PROVIDER=openai to .env.'
      )
      return
    }
    // Fallback: keep the prototype playable even if the LLM fails transiently.
    // eslint-disable-next-line no-console
    console.warn('[etymology] fallback variants used:', msg)
    res.status(200).json({ word: word.trim(), variants: buildEtymologyFallbackVariants(word.trim(), playerDefinition), fallback: true })
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

