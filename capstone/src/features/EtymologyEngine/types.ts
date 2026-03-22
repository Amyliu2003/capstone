export interface EtymologyVariant {
  text: string
  pattern: string
  century: string
  origin_language: string
  citations: string[]
}

export interface EtymologyResponse {
  word: string
  variants: EtymologyVariant[]
}
