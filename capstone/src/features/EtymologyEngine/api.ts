export type EtymologyPromptConfig = {
  tone?: 'academic' | 'whimsical' | 'deadpan'
  include?: Array<'origin_language' | 'century' | 'semantic_shift' | 'fake_citations'>
}

export type EtymologyResponse = {
  word: string
  story: string
}

export async function fetchEtymology(word: string, promptConfig?: EtymologyPromptConfig): Promise<EtymologyResponse> {
  const res = await fetch('/api/etymology', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ word, promptConfig }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Request failed: ${res.status}`)
  }

  const data: unknown = await res.json()
  if (
    !data ||
    typeof data !== 'object' ||
    !('word' in data) ||
    !('story' in data) ||
    typeof (data as { word?: unknown }).word !== 'string' ||
    typeof (data as { story?: unknown }).story !== 'string'
  ) {
    throw new Error('Malformed response from server')
  }

  return data as EtymologyResponse
}

