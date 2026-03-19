export const etymologyPatterns = {
  "meta": {
    "description": "Etymology patterns for the Etymology Engine — a structured guide to real-ish linguistic derivation types, used to generate plausible fake word histories in the style of Humpty Dumpty explaining Jabberwocky.",
    "inspiration": "Lewis Carroll, Through the Looking-Glass, Chapter VI: Humpty Dumpty",
    "usage": "Feed this JSON as context to the LLM prompt so it can generate convincing fake etymologies for nonsense words."
  },

  "jabberwocky_source_words": [
    {
      "word": "brillig",
      "humpty_explanation": "Four o'clock in the afternoon — the time when you begin broiling things for dinner.",
      "pattern_type": "Invented Functional Word",
      "notes": "Sounds like 'broiling' — a blend of time and activity."
    },
    {
      "word": "slithy",
      "humpty_explanation": "Lithe and slimy. It's like a portmanteau — there are two meanings packed up into one word.",
      "pattern_type": "Portmanteau",
      "source_words": ["lithe", "slimy"]
    },
    {
      "word": "toves",
      "humpty_explanation": "Something like badgers, something like lizards, and something like corkscrews. They make nests under sun-dials and live on cheese.",
      "pattern_type": "Hybrid Creature Noun",
      "notes": "Defined by accumulation of contradictory traits — a nonsense bestiary entry."
    },
    {
      "word": "gyre",
      "humpty_explanation": "To go round and round like a gyroscope.",
      "pattern_type": "Greek Root",
      "source_root": "gyros (Greek: circle, ring)",
      "notes": "Rare case of a real root surviving in Carroll's invented word."
    },
    {
      "word": "gimble",
      "humpty_explanation": "To make holes like a gimlet.",
      "pattern_type": "Functional Verb from Tool",
      "source_words": ["gimlet"],
      "notes": "Derived from an existing tool name — a real pattern in English (e.g., 'to chisel', 'to hammer')."
    },
    {
      "word": "wabe",
      "humpty_explanation": "The grass-plot round a sun-dial — called 'wabe' because it goes a long way before it, and a long way behind it, and a long way beyond it on each side.",
      "pattern_type": "Directional Folk Etymology",
      "notes": "Carroll invents a spatial logic: the word is explained by what the thing does, not what it is."
    },
    {
      "word": "mimsy",
      "humpty_explanation": "Flimsy and miserable. Another portmanteau.",
      "pattern_type": "Portmanteau",
      "source_words": ["flimsy", "miserable"]
    },
    {
      "word": "borogove",
      "humpty_explanation": "A thin shabby-looking bird with its feathers sticking out all round — something like a live mop.",
      "pattern_type": "Descriptive Creature Noun",
      "notes": "Defined by visual appearance and simile ('like a live mop'). A classic nonsense taxonomy entry."
    },
    {
      "word": "mome",
      "humpty_explanation": "I think it's short for 'from home' — meaning that they'd lost their way.",
      "pattern_type": "Clipped Folk Etymology",
      "notes": "Humpty is uncertain — models academic hedging ('I think'). Derived from a preposition phrase."
    },
    {
      "word": "rath",
      "humpty_explanation": "A sort of green pig.",
      "pattern_type": "Simple Creature Noun",
      "notes": "Minimal definition. The color ('green') is the only distinguishing feature — absurdist taxonomy."
    },
    {
      "word": "outgrabe",
      "humpty_explanation": "Something between bellowing and whistling, with a kind of sneeze in the middle.",
      "pattern_type": "Sound Blend / Onomatopoeia",
      "source_words": ["bellow", "whistle", "sneeze"],
      "notes": "Defined entirely by sound. A three-way blend — more complex than a standard portmanteau."
    }
  ],

  "etymology_pattern_types": [
    {
      "id": "portmanteau",
      "name": "Portmanteau",
      "description": "A word blending the sounds and meanings of two or more existing words. Coined by Lewis Carroll himself in Through the Looking-Glass.",
      "real_examples": [
        {"word": "brunch", "from": ["breakfast", "lunch"]},
        {"word": "smog", "from": ["smoke", "fog"]},
        {"word": "motel", "from": ["motor", "hotel"]},
        {"word": "spork", "from": ["spoon", "fork"]},
        {"word": "blog", "from": ["web", "log"]},
        {"word": "chortle", "from": ["chuckle", "snort"], "coined_by": "Lewis Carroll"}
      ],
      "llm_prompt_template": "This word is a portmanteau, combining '{word_a}' ({meaning_a}) and '{word_b}' ({meaning_b}), first recorded in {invented_century} in the dialect of {invented_region}.",
      "tone": "confident, academic"
    },
    {
      "id": "latin_root",
      "name": "Latin Root Derivation",
      "description": "A word derived from a Latin root, often with prefixes or suffixes added. The most common pattern in English scientific and legal vocabulary.",
      "common_prefixes": ["pre-", "post-", "sub-", "super-", "trans-", "inter-", "contra-", "extra-", "ultra-"],
      "common_suffixes": ["-tion", "-ity", "-ous", "-al", "-ive", "-ment", "-ance", "-ence"],
      "common_roots": [
        {"root": "aqua", "meaning": "water"},
        {"root": "terra", "meaning": "earth"},
        {"root": "lux/lucis", "meaning": "light"},
        {"root": "corpus", "meaning": "body"},
        {"root": "tempus", "meaning": "time"},
        {"root": "animus", "meaning": "spirit, mind"},
        {"root": "manus", "meaning": "hand"},
        {"root": "vox/vocis", "meaning": "voice"},
        {"root": "via", "meaning": "road, way"},
        {"root": "finis", "meaning": "end, boundary"},
        {"root": "granum", "meaning": "grain"},
        {"root": "umbra", "meaning": "shadow"},
        {"root": "nox/noctis", "meaning": "night"}
      ],
      "real_examples": [
        {"word": "aqueduct", "from": "aqua (water) + ducere (to lead)"},
        {"word": "luminous", "from": "lumen (light) + -ous"},
        {"word": "temporal", "from": "tempus (time) + -al"}
      ],
      "llm_prompt_template": "From the Latin '{root}', meaning '{root_meaning}', with the suffix '{suffix}' indicating '{suffix_meaning}'. First attested in {century} in {context}.",
      "tone": "formal, scholarly"
    },
    {
      "id": "greek_root",
      "name": "Greek Root Derivation",
      "description": "A word derived from Ancient Greek, especially common in scientific, medical, and philosophical vocabulary.",
      "common_roots": [
        {"root": "logos", "meaning": "word, reason, study"},
        {"root": "pathos", "meaning": "feeling, suffering"},
        {"root": "chronos", "meaning": "time"},
        {"root": "topos", "meaning": "place"},
        {"root": "morphe", "meaning": "form, shape"},
        {"root": "bios", "meaning": "life"},
        {"root": "kosmos", "meaning": "order, universe"},
        {"root": "psyche", "meaning": "soul, mind"},
        {"root": "telos", "meaning": "end, purpose"},
        {"root": "arche", "meaning": "beginning, origin, rule"},
        {"root": "eros", "meaning": "desire"},
        {"root": "kairos", "meaning": "the right moment"},
        {"root": "aether", "meaning": "upper air, sky"}
      ],
      "real_examples": [
        {"word": "telephone", "from": "tele (far) + phone (sound)"},
        {"word": "chronology", "from": "chronos (time) + logos (study)"},
        {"word": "morphology", "from": "morphe (form) + logos (study)"}
      ],
      "llm_prompt_template": "Derived from the Ancient Greek '{root}' ({root_meaning}), this word entered English via {language_path} in the {century}.",
      "tone": "formal, scholarly"
    },
    {
      "id": "folk_etymology",
      "name": "Folk Etymology",
      "description": "A false but plausible explanation for a word's origin, often invented by speakers who mishear or misunderstand a foreign word. The most unreliable — and therefore most useful — pattern for the Etymology Engine.",
      "real_examples": [
        {"word": "sparrowgrass", "actually_from": "asparagus (Latin/Greek)", "folk_story": "Thought to be a compound of 'sparrow' and 'grass'"},
        {"word": "crayfish", "actually_from": "Old French 'crevice'", "folk_story": "Reinterpreted as 'cray' + 'fish'"},
        {"word": "penthouse", "actually_from": "Old French 'apentis' (lean-to)", "folk_story": "Reinterpreted as 'pent' (top) + 'house'"}
      ],
      "llm_prompt_template": "Popularly believed to derive from {false_origin}, though scholars now trace it to {invented_true_origin} in {region}, where it referred to {original_meaning}. The confusion arose because {plausible_reason_for_confusion}.",
      "tone": "slightly uncertain, corrective"
    },
    {
      "id": "onomatopoeia",
      "name": "Sound Symbolism / Onomatopoeia",
      "description": "A word whose phonetic form imitates or evokes the sound or sensation it describes. Carroll's 'outgrabe' is a masterclass in this — defined as 'something between bellowing and whistling, with a kind of sneeze in the middle.'",
      "real_examples": [
        {"word": "buzz", "sound": "the vibrating hum of an insect"},
        {"word": "squelch", "sound": "soft wet impact"},
        {"word": "murmur", "sound": "low continuous sound"},
        {"word": "crackle", "sound": "rapid series of small sharp sounds"},
        {"word": "whoosh", "sound": "rapid movement through air"}
      ],
      "llm_prompt_template": "An onomatopoeic formation, imitating the sound of {sound_description}. First used in {context} to describe {usage_context}. Related to the {language} tradition of {sound_class} words.",
      "tone": "sensory, evocative"
    },
    {
      "id": "metaphorical_extension",
      "name": "Metaphorical Extension",
      "description": "A word that began with a literal meaning and was extended metaphorically to a new domain. One of the most natural processes in language evolution.",
      "real_examples": [
        {"word": "crane", "literal": "the long-necked bird", "extended_to": "a lifting machine"},
        {"word": "mouse", "literal": "the small rodent", "extended_to": "a computer input device"},
        {"word": "broadcast", "literal": "casting seeds widely across a field", "extended_to": "transmitting radio/TV signals"},
        {"word": "virus", "literal": "Latin for 'poison'", "extended_to": "biological pathogen, then computer malware"}
      ],
      "llm_prompt_template": "Originally denoting {literal_meaning}, the word was extended metaphorically in {century} to describe {figurative_meaning}, owing to the resemblance between {comparison_point}.",
      "tone": "narrative, explanatory"
    },
    {
      "id": "clipping",
      "name": "Clipping / Abbreviation",
      "description": "A word formed by shortening a longer word or phrase. Humpty Dumpty uses this for 'mome' — 'I think it's short for from home.'",
      "real_examples": [
        {"word": "flu", "from": "influenza"},
        {"word": "phone", "from": "telephone"},
        {"word": "gym", "from": "gymnasium"},
        {"word": "ad", "from": "advertisement"},
        {"word": "lab", "from": "laboratory"}
      ],
      "llm_prompt_template": "A clipped form of the older '{full_word}', meaning '{full_meaning}'. The shortening occurred in {context} during the {century}, when the word became common in {usage_domain}.",
      "tone": "casual, slightly uncertain (as Humpty Dumpty models)"
    },
    {
      "id": "directional_spatial",
      "name": "Directional / Spatial Etymology",
      "description": "Carroll's most original invention: a word explained by the spatial relationship of the thing it names. 'Wabe' is called 'wabe' because it goes a long way before it, behind it, and beyond it. A pure nonsense logic that sounds entirely plausible.",
      "notes": "This is the most distinctly Carrollian pattern. Use it for words that describe places, containers, or boundaries.",
      "llm_prompt_template": "The word derives its name from the spatial property of {thing}: it extends {direction_1} and {direction_2}, and the word itself is said to embody this quality — each syllable reaching in a different direction.",
      "tone": "whimsical, geometric"
    },
    {
      "id": "creature_taxonomy",
      "name": "Nonsense Creature Taxonomy",
      "description": "A word defined by listing contradictory or impossible physical traits, as Humpty Dumpty does for 'toves' (like a badger, like a lizard, like a corkscrew). Modelled on real zoological taxonomy but deliberately absurd.",
      "real_taxonomy_patterns": [
        "Described as resembling {animal_1} in {feature_1}, but {animal_2} in {feature_2}.",
        "A member of the {invented_genus} family, distinguished by its {impossible_trait}.",
        "First classified by {invented_naturalist} in {invented_year}, who noted its habit of {absurd_behavior}."
      ],
      "llm_prompt_template": "A creature of the genus {invented_genus}, first described by the naturalist {invented_name} in {invented_year}. It resembles {animal_1} in its {feature_1}, but {animal_2} in its {feature_2}. It is known to {absurd_behavior} and subsists primarily on {absurd_diet}.",
      "tone": "authoritative, scientific, absurd"
    },
    {
      "id": "borrowed_foreign",
      "name": "Foreign Language Borrowing",
      "description": "A word borrowed from another language, often with slight phonetic adaptation. English has borrowed from over 350 languages.",
      "common_source_languages": ["Old Norse", "Norman French", "Arabic", "Sanskrit", "Nahuatl", "Swahili", "Dutch", "Persian", "Yiddish"],
      "real_examples": [
        {"word": "algebra", "from": "Arabic 'al-jabr' (reunion of broken parts)"},
        {"word": "avatar", "from": "Sanskrit 'avatara' (descent of a deity)"},
        {"word": "chocolate", "from": "Nahuatl 'xocolatl'"},
        {"word": "kiosk", "from": "Turkish 'köşk' (pavilion)"}
      ],
      "llm_prompt_template": "Borrowed from {language} '{original_word}', meaning '{original_meaning}'. It entered English through {route_of_borrowing} in the {century}, initially used in {context} before broadening to its current sense.",
      "tone": "scholarly, cross-cultural"
    }
  ],

  "llm_system_prompt_context": {
    "description": "Paste this block into the system prompt when calling the LLM for etymology generation.",
    "prompt": "You are Humpty Dumpty, a pompous but brilliant lexicographer who can explain the etymology of any word — including words that do not exist. You speak with absolute authority and slight condescension. Your etymologies sound completely plausible and are structured like real dictionary entries, but they are entirely invented. You draw on the following patterns: portmanteau (blending two words), Latin or Greek roots, folk etymology (a false but plausible story), onomatopoeia (sound imitation), metaphorical extension, clipping (shortening a longer word), directional/spatial logic (the word is named for what the thing does spatially), creature taxonomy (defining a creature by listing contradictory traits), and foreign borrowing. Always specify: (1) the pattern type, (2) the invented source language or words, (3) the century or era of first use, (4) the original context or region, and (5) how the meaning shifted over time. Keep the tone confident, slightly archaic, and gently absurd. Never admit uncertainty — except occasionally, as Humpty Dumpty does for 'mome', to add verisimilitude."
  }
} as const

