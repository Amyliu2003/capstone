import type { EtymologyResponse, EtymologyVariant } from './types'

export type EtymologyPromptConfig = {
  tone?: 'academic' | 'whimsical' | 'deadpan'
  include?: Array<'origin_language' | 'century' | 'semantic_shift' | 'fake_citations'>
}

export type { EtymologyResponse, EtymologyVariant } from './types'

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

export async function fetchEtymology(
  word: string,
  promptConfig?: EtymologyPromptConfig,
  playerDefinition?: string,
): Promise<EtymologyResponse> {
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
    const text = await res.text().catch(() => '')
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
    throw new Error('Malformed response from server')
  }
}
