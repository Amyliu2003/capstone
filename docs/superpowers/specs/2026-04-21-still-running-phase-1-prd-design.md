# Still Running — Phase 1 PRD (Hackathon Rebase)

Date: 2026-04-21  
Timebox: ~20 hours (“Phase 1”)  
Repo branch context: `etymology-proto-26548`

## Summary

Phase 1 ships a **polished beginning** plus **one complete loop** (Etymology → Chess → π) and **one authored “chaos beat”** that foreshadows later escalation—while adding a **Presentation (Livestream) Mode** that exposes **recording-only** placeholder screens for Phase 2 beats (gallery/endings/escalation/shared π), clearly labeled and non-stateful.

## North Star (reconstructed)

**Still Running** critiques AI utilitarianism via a contamination loop: player-authored meaning becomes “contract,” contracts deform rules, and accumulated structure (π graph) reduces meaningful difference over time.

Anchor statements (from `capstone/storyboard v1.md`):

- **One Rule**: “Every advance produces more interpretation, and every accumulation reduces meaningful difference.”
- **Key phrases — do not change** (partial list):
  - `π是无限的，但你不是`
  - `heat death of the map not the machine`
  - `You're nothing but a pack of tokens`
  - `From here, there is no more generated content. Think your own thoughts.`
  - `Still Running...`

## Goals

- **G1 — Playable vertical slice**: A viewer can watch and understand the core loop in one sitting.
- **G2 — Tone + tutorial clarity**: The beginning teaches the contract mechanic without “system explainers.”
- **G3 — Contamination is legible**: The player can describe in one sentence how their definition “fed” the system.
- **G4 — Demo/recording readiness**: You can reliably capture screen recordings that imply Phase 2 scope without implementing it.

## Non-goals (Phase 1)

- Full gallery (llorrac exhibits), full Ending A, Ending B gating rules, multi-level chaos ramp (Squares 3–8), shared persistent π graph, Twine build.
- “Perfect” balance tuning across many levels.

## Target user experience (Phase 1)

### Episode 0 (polished beginning / onboarding)

- Player enters through the garden/mirror framing (existing 3D intro + dialogue + hand customization).
- Player arrives at Level 1 etymology prompt with the narrative frame established (“you are ecilA”).

### Episode 1: The ABC loop (one iteration)

**A — Etymology (meaning contract)**

- Player writes a definition for the level’s word.
- System returns **3 Humpty-style variants** plus **1 canonical Carroll option** (quiz of 4).
- Player selects one; the choice is recorded as a run-level “contract.”

**B — Chess (rules as negotiated)**

- Player completes the chess beat (puzzle or short play) that is *presentable* in a demo.
- At least one affordance hints that the contract is “in effect” (copy, UI, or a small rules nudge).

**C — π Graph (structure accumulates)**

- π transitions render as accumulating edges (already implemented).
- The loop advances to the next level or ends Phase 1 slice.

### “Chaos beat” (single authored escalation)

After the first loop completes (or immediately as it transitions), show **one clear authored moment** implying escalation (e.g., Red Queen urgency or a “rules slip” line + a small mechanical nudge).

Phase 1 requirement: **exactly one beat**—enough to signal later chaos, not to implement it.

## Current repo reality (baseline)

This PRD is intentionally rebased on what already exists in the codebase:

- **Core phase machine**: `etymology → chess → pi` in `GameStateProvider`.
- **Etymology “A” is already implemented** in `GameScene`:
  - Player definition → server returns 3 variants → client injects canonical Carroll option (4th) → user chooses 1 → stored in `levelHistory` with `isCanonical`.
- **Dialogue endpoint exists and is already wired** (`POST /api/dialogue`) via `GameScene` dialogue submission.
- **Save/load** exists via `localStorage` snapshots and settings scene.
- **Intro episode** exists (3D garden, mirror, dialogue, hand customization).

## Phase 1 scope (what we will build/finish)

### 1) Ship “Show & Tell scope” + one chaos beat (in-app)

**In scope**

- Episode 0 playable start-to-finish into the main game.
- Level 1: one clean ABC loop (etymology → chess → π).
- H.D. basic dialogue visible in the run.
- One authored chaos beat after loop 1.

**Out of scope**

- Gallery and endings as real gameplay; escalation Squares 3–8; shared persistent π.

### 2) Presentation (Livestream) Mode (Phase 1) + recording-only placeholders

**Mode definition**

Presentation Mode is a flag that exposes a small control panel for demos/recordings:

- Jump to playable segments (Episode 0, start Level 1, jump to Chess, jump to π).
- Trigger the “Chaos beat” on demand.
- Navigate to **recording-only preview screens** for Phase 2 beats.

**Guardrails**

- Preview screens are **clearly labeled** “Preview / Recording-only.”
- Preview screens **do not write save data** and do not mutate `GameState`.
- Mode is **not user-facing by default** (hidden toggle in Settings and/or URL query `?present=1`).

## Placeholder preview screens (recording-only; all included)

All preview screens have a persistent “Back to panel” action.

1) **Gallery preview (llorrac exhibits)**
- A gallery index + a few static exhibit pages (text-first, minimal assets).

2) **Ending A preview (condensed acceptance)**
- One static ending card, no gating.

3) **Ending B preview (refusal)**
- Must include verbatim: “From here, there is no more generated content. Think your own thoughts.”

4) **Squares 3–8 escalation preview (chaos montage)**
- A static montage page or timed text-card sequence of escalating one-liners.

5) **Shared persistent π graph preview (many agents)**
- A static page implying “many agents came before you,” optionally with an existing π graphic as backdrop.

## Success criteria (Phase 1)

- **S1 — Demo path**: Cold start → Episode 0 → Level 1 etymology quiz → chess beat → π beat → chaos beat completes without manual fixes.
- **S2 — Legibility**: After etymology confirm, at least one downstream beat (chess and/or π and/or dialogue) makes the contract feel “used.”
- **S3 — Recording**: Presentation Mode allows capturing placeholders for gallery/endings/escalation/shared π in <2 minutes.
- **S4 — Stability**: No crashes; save/load still works for the playable slice (preview screens never write).

## Open questions (intentionally deferred)

- What exact mechanic carries “contract contamination” into chess and π (beyond copy) for Squares 2–8?
- Will shared persistent π ever be server-hosted, or local-only for capstone timeline?
- What are the exact gating rules for Ending A vs Ending B in the final build?

## Phase 2 reminders (explicit follow-ups)

- **R1 — Multi-level chaos ramp (Squares 3–8)**: Implement real escalation across levels (mechanics + authored copy), not just montage.
- **R2 — Gallery (llorrac)**: Build navigable, content-complete exhibit rooms with progression gates.
- **R3 — Endings A/B**: Implement gating, branching, and “refusal” behavior (including removal of generated systems for Ending B).
- **R4 — Shared persistent π**: Decide storage (server vs local), schema, and privacy story; implement if required.
- **R5 — Locked copy audit**: Ensure all “Do Not Change” phrases remain verbatim in final UI and recordings.

