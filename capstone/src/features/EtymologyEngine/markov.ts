export type CorpusConfig = {
  text: string
  /**
   * Optional hook to normalize a token. Keep this here so we can later
   * adapt a Lewis Carroll JSON corpus without changing generation logic.
   */
  normalizeToken?: (token: string) => string
}

export type MarkovOptions = {
  order: number
}

type WeightedNext = { ch: string; weight: number }

export type MarkovModel = {
  order: number
  starts: string[]
  transitions: Map<string, WeightedNext[]>
}

const END = '\0'

function tokenizeWords(text: string): string[] {
  const matches = text.toLowerCase().match(/[a-z]+/g)
  return matches ?? []
}

export function buildMarkovModel(corpus: CorpusConfig, options: MarkovOptions): MarkovModel {
  const order = options.order
  if (order < 1 || order > 8) throw new Error(`Unsupported Markov order: ${order}`)

  const starts: string[] = []
  const transitionCounts = new Map<string, Map<string, number>>()

  const rawTokens = tokenizeWords(corpus.text)
  const tokens = corpus.normalizeToken ? rawTokens.map(corpus.normalizeToken) : rawTokens

  for (const w of tokens) {
    if (w.length <= order) continue
    starts.push(w.slice(0, order))

    for (let i = 0; i <= w.length - order; i++) {
      const prefix = w.slice(i, i + order)
      const next = i + order < w.length ? w[i + order] : END

      const byNext = transitionCounts.get(prefix) ?? new Map<string, number>()
      byNext.set(next, (byNext.get(next) ?? 0) + 1)
      transitionCounts.set(prefix, byNext)
    }
  }

  const transitions = new Map<string, WeightedNext[]>()
  for (const [prefix, byNext] of transitionCounts) {
    const weighted: WeightedNext[] = []
    for (const [ch, weight] of byNext) weighted.push({ ch, weight })
    transitions.set(prefix, weighted)
  }

  if (starts.length === 0 || transitions.size === 0) {
    throw new Error('Corpus too small to build Markov model')
  }

  return { order, starts, transitions }
}

function weightedChoice(items: WeightedNext[]): string {
  let total = 0
  for (const it of items) total += it.weight
  let r = Math.random() * total
  for (const it of items) {
    r -= it.weight
    if (r <= 0) return it.ch
  }
  return items[items.length - 1]?.ch ?? END
}

export type GenerateWordOptions = {
  minLength?: number
  maxLength?: number
  maxAttempts?: number
}

export function generateWord(model: MarkovModel, opts: GenerateWordOptions = {}): string {
  const minLength = opts.minLength ?? 4
  const maxLength = opts.maxLength ?? 12
  const maxAttempts = opts.maxAttempts ?? 50

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let word = model.starts[Math.floor(Math.random() * model.starts.length)] ?? ''
    if (!word) continue

    while (word.length < maxLength) {
      const prefix = word.slice(-model.order)
      const options = model.transitions.get(prefix)
      if (!options || options.length === 0) break

      const next = weightedChoice(options)
      if (next === END) break
      word += next
    }

    if (word.length >= minLength && word.length <= maxLength) return word
  }

  // As a fallback, return something deterministic-ish rather than throwing.
  const start = model.starts[0] ?? 'word'
  return start.slice(0, Math.max(1, Math.min(start.length, opts.maxLength ?? 12)))
}

