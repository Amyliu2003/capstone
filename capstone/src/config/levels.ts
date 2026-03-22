export type LevelConfig = {
  word: string
  disabledRule: string
  /** Humpty Dumpty’s explanation in Carroll (Through the Looking-Glass, Ch. VI). */
  canonicalDefinition: string
  /** At least four strings — legacy / optional distractors; not used by current etymology flow. */
  definitions: string[]
}

/** Hardcoded level config (1–8). Placeholder words and rules; rule-disabling not wired yet. */
export const LEVEL_CONFIG: LevelConfig[] = [
  {
    word: 'brillig',
    disabledRule: 'en_passant',
    canonicalDefinition:
      "Four o'clock in the afternoon — the time when you begin broiling things for dinner.",
    definitions: [
      'The time of day when one begins to broil dinner.',
      'Slithy and smooth; said of a surface.',
      'A nonsense adjective from Carroll meaning unclear.',
      'A kind of small badger-like creature.',
    ],
  },
  {
    word: 'slithy',
    disabledRule: 'castling',
    canonicalDefinition:
      "Lithe and slimy. It's like a portmanteau — there are two meanings packed up into one word.",
    definitions: [
      'Lithe and slimy combined; agile and oozy.',
      'Strictly vertical; upright.',
      'A past tense of “slithe,” to slide.',
      'Cold to the touch; frosty.',
    ],
  },
  {
    word: 'toves',
    disabledRule: 'check',
    canonicalDefinition:
      'Something like badgers, something like lizards, and something like corkscrews. They make nests under sun-dials and live on cheese.',
    definitions: [
      'Badgers, lizards, or corkscrew hybrids that gyre.',
      'Plural of “tove,” a unit of weight.',
      'Smooth stones used for skipping on water.',
      'A dialect word for potatoes.',
    ],
  },
  {
    word: 'gyre',
    disabledRule: 'checkmate',
    canonicalDefinition: 'To go round and round like a gyroscope.',
    definitions: [
      'To revolve or spin in a circle.',
      'A spiral staircase in a tower.',
      'To gyrate nervously before speaking.',
      'A fence or enclosure for cattle.',
    ],
  },
  {
    word: 'gimble',
    disabledRule: 'draws',
    canonicalDefinition: 'To make holes like a gimlet.',
    definitions: [
      'To make holes as with a gimlet.',
      'To gambol or frisk about playfully.',
      'To grumble under one’s breath.',
      'To assemble a hinge incorrectly.',
    ],
  },
  {
    word: 'wabe',
    disabledRule: 'pawn_promotion',
    canonicalDefinition:
      "The grass-plot round a sun-dial — called 'wabe' because it goes a long way before it, and a long way behind it, and a long way beyond it on each side.",
    definitions: [
      'The grass plot around a sundial.',
      'The cry of a borogove when disturbed.',
      'A web woven by a “wabe-spider.”',
      'A shallow pool left by the tide.',
    ],
  },
  {
    word: 'mimsy',
    disabledRule: 'en_passant',
    canonicalDefinition: 'Flimsy and miserable. Another portmanteau.',
    definitions: [
      'Flimsy and miserable combined.',
      'Prim, affected, and over-dainty.',
      'Misty and dim; hard to see through.',
      'Mimicking in a mocking way.',
    ],
  },
  {
    word: 'borogove',
    disabledRule: 'castling',
    canonicalDefinition:
      'A thin shabby-looking bird with its feathers sticking out all round — something like a live mop.',
    definitions: [
      'A shabby bird resembling a parrot with a thin voice.',
      'A heraldic beast, half goat and half dove.',
      'A smooth marble used in children’s games.',
      'A borrowed garment; a hand-me-down coat.',
    ],
  },
]

export const TOTAL_LEVELS = LEVEL_CONFIG.length
