# Still Running — UI Redesign PRD
*Typography + Visual Design Pass · Pre-Final Presentation*  
*April 2026 · Based on repo snapshot 2026-04-21*

## Overview

This document covers the UI redesign requirements for four screens in Still Running:

1. **Etymology Phase (definition selection)** — `src/features/EtymologyEngine/EtymologyEngine.tsx`
2. **Chess Phase (Unlawful Chessboard)** — `src/features/UnlawfulChessboard/UnlawfulChessboard.tsx`
3. **Hand Customization (“Make yourself.”)** — location TBC in `src/features/Intro/` or `src/scenes/`
4. **Pi Graph** — `src/features/PiGraph/PiGraph.tsx` + `PiGraphCanvas.tsx`

All changes are **typography and visual layer only**. **No game logic, state management, API calls, or component interfaces** are modified.

## What the repo actually has (repo snapshot 2026-04-21)

| Feature | Status | Notes |
|---|---|---|
| Etymology 3 LLM variants | ✅ working | Server returns 3 variants; **client adds Carroll 4th option** and shuffles |
| Carroll 4th option | ✅ working | Added client-side; `isCanonical` already recorded in `levelHistory` |
| Stockfish cp evaluation | ✅ working | `POST /api/chess/evaluate` in `server.ts`; `{ cp, mate, bestmove }` returned |
| Pi Graph | ✅ working | **Canvas-based** (`PiGraphCanvas.tsx`), NOT D3 force-directed |
| Dialogue (H.D.) | ✅ working | RiveScript + LLM fallback via `POST /api/dialogue` |
| Contamination loop | ⚠️ partial | Verify full pipeline on current branch before claiming in demo |
| Shared Pi graph (multiplayer) | ❌ not yet | Currently local `localStorage` only |
| Design system | ✅ exists | `src/designSystem/` — `DesignSystemProvider`, `DSButton`, `theme.ts` |

## Important: existing design system

The repo has `src/designSystem/` with `theme.ts` and `DSButton`. Before adding new CSS variables, check `theme.ts` for existing tokens. New tokens should be added there, not as one-off inline styles.

## Design System Principles (applies to all screens)

### Fonts

Add to `src/index.css` or `index.html` via Google Fonts:

```css
@import url('https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=IM+Fell+Double+Pica:ital@0;1&family=Share+Tech+Mono&display=swap');
```

Then add to `src/designSystem/theme.ts`:

```ts
fonts: {
  imFell: "'IM Fell English', Palatino, serif",
  imFellDP: "'IM Fell Double Pica', Georgia, serif",
  mono: "'Share Tech Mono', 'Courier New', monospace",
  // ...existing tokens
}
```

### Three character voices = three UI registers

| Character | Sensory organ | UI register |
|---|---|---|
| H.D. | Mouth | Collage typography — mixed serif fonts, varied sizes, slight rotation, word-by-word snap animation |
| Red Queen | Ear | Sound (Web Speech API) + waveform visualization. No prose text rendered. |
| ecilA (player) | Hand | Cursor · click · chatbox input · typewriter audio on keypress |

### Carroll original quote treatment

Whenever a Carroll original quote appears (not H.D., not system):

- Font: IM Fell English italic only — single unified voice
- No rotation, no size mixing, no glitch, no animation
- Left border: `border-left: 1.5px solid currentColor`
- Attribution: Share Tech Mono, 9px, `opacity: 0.5`, below the quote
- Arrives all at once (already composed)

### Color tokens (add to `theme.ts`)

```ts
// New tokens — check theme.ts first for any overlap
cream:  '#f5f0e8'  // primary background (light screens)
navy:   '#1a1f2e'  // dark backgrounds, buttons
ink:    '#2c2418'  // primary text on cream
gold:   '#c8a84b'  // Pi graph, Red Queen bar, agent params values
ghost:  '#9a9080'  // secondary text, mono labels
pale:   '#e8e0d4'  // collage chip backgrounds
```

---

## Screen 1 — Etymology Phase
**File:** `src/features/EtymologyEngine/EtymologyEngine.tsx`

### Repo notes

- Carroll 4th option is **already added client-side** — server returns 3 variants, client appends canonical + shuffles. `isCanonical` already in `levelHistory`. No server changes.
- Use/extend existing `DSButton` at `src/designSystem/components/DSButton.tsx`.

### Current state

- Generic system-font radio button form
- H.D. label and question in plain text
- All 4 options visually identical
- Carroll original option (option 4) indistinguishable from LLM options

### Required changes

#### 1.1 H.D. question header — collage treatment

Replace the plain heading with a collage typography component.

**Spec:**

- Small mono label “H.D.” above (Share Tech Mono, 9px, `--ghost`, letter-spacing 0.14em, uppercase)
- Question rendered as flex-wrap div of individual word `<span>` elements
- Each span gets deterministic (word-index seeded) randomized:
  - `font-family`: one of [IM Fell English, IM Fell Double Pica, Georgia, Times New Roman]
  - `font-size`: from pool [13px, 17px, 22px, 28px] weighted toward middle
  - `font-weight`: 400 or 700
  - `font-style`: italic or normal
  - `transform: rotate()`: between -2deg and +2deg
- Key word (the Jabberwocky word being defined) gets `background: --navy; color: --cream; padding: 1px 5px`
- Deterministic: same word always renders the same style across re-renders

#### 1.2 Jabberwocky word highlight

Above the options list, add a standalone word display:

```
[jabberwocky word]    ← IM Fell English italic, 28px bold, background #f0d080, padding 0 8px
```

With faint attribution: “Jabberwocky · line N” in Share Tech Mono 9px ghost.

#### 1.3 Options 1–3 (LLM variants)

- Font: IM Fell English, 14px, upright (not italic), `--ink`
- Line height: 1.65
- Replace browser default radio input with custom circle: 16px, `border: 1.5px solid --ghost`, border-radius 50%
- Selected state: filled `--navy` circle with inner `--cream` ring (`box-shadow: inset 0 0 0 3px --cream`)
- Separator: `border-bottom: 0.5px solid #e8e0d4` between options

#### 1.4 Option 4 (Carroll original) — subtle distinction only

**The distinction must not be obvious.** Players should feel a difference, not see a label.

- Font: IM Fell English, **italic**, 14px — this is the only visual difference
- Same size, same color, same radio button as options 1–3
- Do NOT add any “Carroll” label or indicator

#### 1.5 Confirm button

- Background: `--navy`, color: `--cream`
- Font: Share Tech Mono, 12px, letter-spacing 0.1em, uppercase
- Full width, border-radius 2px
- Label: “Confirm” (unchanged)

#### 1.6 Chat hint below confirm

```
"or enter your own definition below ↓"
```

IM Fell English italic, 11px, `--ghost`.

---

## Screen 2 — Chess Phase
**File:** `src/features/UnlawfulChessboard/UnlawfulChessboard.tsx`  
**Server:** `server/server.ts` — `POST /api/chess/evaluate` returns `{ cp, mate, bestmove }`

### Current state (problems)

- “Unlawful Chessboard” header is too literal
- Developer/debug text visible to players
- Verbose instruction paragraph
- Red Queen cp evaluation not surfaced
- Eval bar hard to read
- Generic buttons

### Required changes

#### 2.1 Remove

- Remove “Unlawful Chessboard” heading entirely
- Remove any “Disabled rule: X (not wired yet)” label entirely
- Remove verbose instruction paragraph (“Click a piece…”) entirely

#### 2.2 H.D. rule announcement — replaces the header

H.D.’s rule announcement becomes the headline of the chess phase.

**Spec:**

- Small mono label “H.D.” (Share Tech Mono, 8px, `--ghost`, letter-spacing 0.14em, uppercase)
- Rule text rendered as collage (same system as Screen 1 header)

Template strings per behavior tag:

| Tag | H.D. says |
|---|---|
| en_passant disabled | “Oh, and— no *en passant* this round. I find it so terribly fussy, don't you?” |
| castling disabled | “No castling this round. I find it so fussy, don't you?” |
| freeze | “Some pieces would rather not move today. I find that very sensible.” |
| rotate | “The knights will move sideways from now on. I've always preferred it that way.” |
| disappear | “Certain squares have become — let's say — optional.” |
| swap | “The bishops have decided to trade opinions. I encouraged it.” |
| mirror | “Everything is reversed today. It usually is.” |

#### 2.3 Level/phase bar

Keep existing level/phase info; add side-to-move right-aligned. Font: Share Tech Mono.

#### 2.4 Eval bar

- Width: 10px
- Position: left of board, full board height
- Top: `--navy` (black)
- Bottom: `#d4c4a0` (white)
- Proportion driven by Stockfish cp value (existing logic; visual update only)

#### 2.5 Red Queen cp bar — NEW

Add full-width dark strip directly below the board:

```
[ RED QUEEN label ] [ cp value ] [ !! / ? / ?? symbol ] [ italic line ]
```

Spec:

- Background: `--navy`
- “RED QUEEN”: Share Tech Mono, 8px, `#4a5060`, uppercase
- cp value: Share Tech Mono, 10px, `--ghost`
- Symbol: IM Fell Double Pica, 20px bold, `--cream`
- Line: IM Fell English italic, 13px, `#c8bfaa`

cp → symbol + line mapping:

| cp change | Symbol | Red Queen line |
|---|---|---|
| +300 or more | !! | “Better. Not good enough. Again.” |
| +100 to +300 | ! | “That'll do. Move.” |
| ±50 | — | *(silence — render nothing)* |
| −100 to −300 | ? | “Wrong, as usual.” |
| −300 or more | ?? | “That wouldn't be at all the thing.” |
| Forced (1 legal move) | □ | “Of course. There was only one move.” |
| Zugzwang | — | “All the ways about here belong to me.” |

#### 2.6 Action row

- Left: ghost button “Reset”
- Center: progress indicator “Move N of ~5”
- Right: solid button “Continue →”

#### 2.7 Chat area

- Player is “hand” (ecilA): remove mouth imagery; use hand silhouette
- Placeholder: “say something…” — IM Fell English italic, 11px, `--ghost`
- H.D. reply: IM Fell English italic, 11px, `#8b7355`

---

## Screen 3 — Hand Customization
**File:** confirm location in repo (mounted from Intro flow; do not change canvas mount logic)

### Required changes (visual only)

#### 3.1 H.D. collage question replaces “Make yourself.”

- Remove “Make yourself.” entirely
- Add collage:
  - “Who are you?”
  - “You must know yourself before you come in.”

#### 3.2 Agent params block

Replace a neutral “Selected…” list with:

```
agent.params {
  color:     ivory
  size:      medium
  accessory: none
  id:        #—
}
```

Share Tech Mono; values in `--gold`.

#### 3.3 Confirm button

- Label: “Confirm parameters →”
- Background: `--cream`, text: `--navy`
- Share Tech Mono, 10px, uppercase

---

## Screen 4 — Pi Graph
**File:** `src/features/PiGraph/PiGraph.tsx` + `PiGraphCanvas.tsx`

### Repo notes

- Canvas-based graph (not D3 force layout)
- Level-gated edges
- Local persistence only (for now)

### Required changes (visual only)

- Atmosphere: dark background + scanlines + subtle gold glow
- Remove literal headers/technical labels
- Add “8-square path” header (I–VIII)
- Add `π = 3.14159…` digit strip under canvas
- Use llorrac line after level 3:
  - “It looks like a path to the eighth square. It is not a path.”

---

## Sound Design (conceptual PRD section)

This section defines *desired* audio behavior; implementation may be staged.

- ecilA: labor sounds (typing/selecting/moving)
- Red Queen: voice (Web Speech API), minimal/no prose text
- H.D.: silent; collage typography is the voice

---

## Acceptance criteria

The UI redesign is complete when:

- Etymology header uses deterministic collage; option 4 is italic-only; no explicit “Carroll” labeling.
- Chess removes debug headings; adds Red Queen cp strip + symbol mapping; silence is truly silent.
- Hand customization uses H.D. collage prompts + `agent.params` block with gold values.
- Pi Graph has dark altar-stage framing, digit strip, and reduced technical labeling.

