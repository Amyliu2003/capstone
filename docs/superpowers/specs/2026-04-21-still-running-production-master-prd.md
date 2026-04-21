# Still Running — Production Master PRD (Storyboard v3 Rebase)

Date: 2026-04-21  
Branch: `main`  
Primary narrative source: `capstone/storybaord.md` (Full Storyboard v3)

## 0) What this doc is

This is the **production PRD**: the master reference that connects narrative intent to implementable pipelines and UI components. It is rebased on the current in-repo storyboard (`capstone/storybaord.md`) and updated with the new typography component spec (Collage + Glitch + Flicker).

## 1) North Star (locked)

> **Every advance produces more interpretation, and every accumulation reduces meaningful difference.**

**Key phrases — do not change**

- `π是无限的，但你不是`
- `heat death of the map not the machine`
- `You're nothing but a pack of tokens`
- `From here, there is no more generated content. Think your own thoughts.`
- `Still Running...`
- `Which do you think it was?`
- `I can't stand this any longer.`

## 2) Modules (promise)

- **Etymology**: player-authored meaning becomes a contract.
- **Chess**: contract deforms rules; Stockfish evaluation becomes Red Queen voice.
- **π Graph**: accumulation/structure is made visible; “progress” is infinite and therefore impossible.

## 3) Production contamination loop (system pipeline)

### 3.1 Definition → variants → tag → chess deformation → history → next prompt

From storyboard v3, the intended loop is:

```text
Player definition input
  → POST /api/etymology/paraphrase  → Carroll-register rewrite stored as Option 4
  → Player selects 1 of 4 options
  → chosen variant has { text, pattern, century, origin_language, citations }
  → pattern/tag maps to chess deformation (rotate/disappear/swap/freeze/mirror/…)
  → chess moves logged as SAN into playerHistory[]
  → playerHistory[] fed into next /api/etymology prompt
  → player’s earlier words appear in new definitions without announcement
```

### 3.2 Chat → dialogue response → contamination memory

```text
Player chat message
  → POST /api/dialogue { message, gameState }
  → RiveScript match else LLM fallback
  → message appended to playerWords[] (contamination memory)
  → playerWords[] can feed next etymology prompt
```

## 4) Behavior tags (Etymology → Chess)

Storyboard v3 proposes ~10 tags:

- `rotate`, `disappear`, `swap`, `freeze`, `mirror`, `consume`, `invert`, `duplicate`, `silence`, `drift`

**Requirement**

- H.D. announces the rule change in Carroll tone (short, confident).
- Chess visibly changes behavior (not just copy).

## 5) Stockfish → Red Queen voice mapping

Storyboard v3 production mapping:

- cp change → symbol:
  - `!!`, `!`, _(silence)_, `?`, `??`, `□` (forced), plus special cases (zugzwang, unlawful move)
- Red Queen tone constraints:
  - declarative, never “because”, no compound sentences, occasional unexpected warmth
  - “wrong” is procedural, not angry

## 6) UI components (new)

### 6.1 `CollageText` (collage + glitch + flicker typography)

Production note to incorporate:

> 技术上做的事很简单——每个词一个`<span>`，每个span有不同的font-family + size + weight + rotate。随机性是手写的，但可以程序化。

#### 6.1.1 Layer model (3 overlays)

1) **Collage layer**
   - each word is a `<span>`
   - deterministic “random” per word index:
     - `font-family`: IM Fell English variants (English / Double Pica / DW Pica)
     - `font-size`, `font-weight` (400/700), optional italic
     - `transform: rotate()` in a small range

2) **Glitch layer**
   - `::before` and `::after`
   - `clip-path: inset()` slices (horizontal + vertical)
   - red/blue offsets, `translateX/skewX`
   - `steps(1)` to “jump frames”

3) **Flicker layer**
   - opacity keyframes applied to selected word indices

#### 6.1.2 Component API

Create: `src/components/CollageText/CollageText.tsx`

```ts
export interface CollageTextProps {
  words: string[]
  intensity?: 'low' | 'medium' | 'high'
  glitch?: number[]
  flicker?: number[]
  className?: string
}
```

**Determinism requirement**

- Seed randomness from **word index** so output is stable across renders/reloads.

#### 6.1.3 Intended uses

- Render key “system voice” moments (e.g., “Still Running…”, contamination echoes, Ending cards).
- Support subtle deformation escalation (Square 6 “UI begins subtly deforming”) without rewriting whole layouts.

## 7) Phase gating (what’s Phase 1 vs Phase 2+)

- **Phase 1**: Episode 0 + one loop + one chaos beat (plus recording placeholders).
- **Phase 2+**: shared persistent π graph, Twine gallery, real Squares 3–8 escalation, Ending A/B gating, full contamination memory (chat + chess → prompt).

