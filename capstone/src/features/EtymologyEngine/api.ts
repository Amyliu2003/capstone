import type { EtymologyResponse, EtymologyVariant } from './types'

export type EtymologyPromptConfig = {
  tone?: 'academic' | 'whimsical' | 'deadpan'
  include?: Array<'origin_language' | 'century' | 'semantic_shift' | 'fake_citations'>
}

export type { EtymologyResponse, EtymologyVariant } from './types'

function buildClientFallbackVariants(word: string, playerDefinition?: string): EtymologyVariant[] {
  const w = word.trim() || 'word'
  const pd = playerDefinition?.trim()
  const v0: EtymologyVariant = {
    text: `${w} means the feeling just before something important happens, though nobody agrees on what.`,
    pattern: 'Fallback',
    century: '—',
    origin_language: '—',
    citations: [],
  }
  const v1: EtymologyVariant = {
    text: `${w} is what you call it when two things are almost the same but neither will admit it.`,
    pattern: 'Fallback',
    century: '—',
    origin_language: '—',
    citations: [],
  }
  const v2: EtymologyVariant = {
    text: pd && pd.length > 0 ? `${w} means ${pd.split(/\s+/).slice(0, 6).join(' ')}. (Or so you insist.)` : `${w} derives from an old word for 'Thursday' in a language that only had four days.`,
    pattern: 'Fallback',
    century: '—',
    origin_language: '—',
    citations: [],
  }
  return [v0, v1, v2]
}

function isEtymologyVariant(v: unknown): v is EtymologyVariant {
  if (!v || typeof v !== 'object') return false
  const obj = v as Record<string, unknown>
  return (
    typeof obj.text === 'string' &&
    typeof obj.pattern === 'string' &&
    typeof obj.century === 'string' &&
    typeof obj.origin_language === 'string' &&
    Array.isArray(obj.citations) &&
    obj.citations.every((c) => typeof c === 'string')
  )
}

function validateResponse(data: unknown): EtymologyResponse {
  if (!data || typeof data !== 'object') throw new Error('Malformed response from server')
  const d = data as Record<string, unknown>
  if (typeof d.word !== 'string') throw new Error('Malformed response from server')
  if (!Array.isArray(d.variants) || d.variants.length !== 3 || !d.variants.every(isEtymologyVariant))
    throw new Error('Malformed response from server')
  return d as unknown as EtymologyResponse
}

/** If server still returns legacy `variants: string[]`, map into {@link EtymologyVariant} shape. */
function tryLegacyStringVariants(data: unknown): EtymologyResponse | null {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (typeof d.word !== 'string' || !Array.isArray(d.variants) || d.variants.length !== 3) return null
  if (!d.variants.every((x) => typeof x === 'string')) return null
  const word = d.word
  const strings = d.variants as string[]
  return {
    word,
    variants: strings.map((text) => ({
      text,
      pattern: '',
      century: '',
      origin_language: '',
      citations: [],
    })),
  }
}

/** Humpty-style rewrite of the player’s definition; used as a 4th quiz option. */
export async function fetchParaphraseDefinition(text: string): Promise<string> {
  const res = await fetch('/api/etymology/paraphrase', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(t || `Paraphrase failed: ${res.status}`)
  }
  const data: unknown = await res.json()
  if (!data || typeof data !== 'object' || typeof (data as { text?: unknown }).text !== 'string') {
    throw new Error('Malformed paraphrase response')
  }
  return (data as { text: string }).text.trim()
}

export async function fetchEtymology(
  word: string,
  promptConfig?: EtymologyPromptConfig,
  playerDefinition?: string,
): Promise<EtymologyResponse> {
  try {
    const res = await fetch('/api/etymology', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        word,
        promptConfig,
        ...(playerDefinition != null && playerDefinition.trim() !== '' ? { playerDefinition: playerDefinition.trim() } : {}),
      }),
    })

    if (!res.ok) {
      // Keep 400s loud (bad request), but fall back for server-side 5xx.
      const text = await res.text().catch(() => '')
      if (res.status >= 500) {
        return { word: word.trim(), variants: buildClientFallbackVariants(word, playerDefinition) }
      }
      throw new Error(text || `Request failed: ${res.status}`)
    }

    const data: unknown = await res.json()
    // eslint-disable-next-line no-console
    console.log('[etymology api] raw response:', JSON.stringify(data, null, 2))
    try {
      return validateResponse(data)
    } catch {
      const legacy = tryLegacyStringVariants(data)
      if (legacy) return legacy
      return { word: word.trim(), variants: buildClientFallbackVariants(word, playerDefinition) }
    }
  } catch {
    // Network / proxy failure (server down): client fallback keeps the loop playable.
    return { word: word.trim(), variants: buildClientFallbackVariants(word, playerDefinition) }
  }
}
