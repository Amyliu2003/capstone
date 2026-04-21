# All projects — Still Running (Capstone 2026)

**Still Running** is a browser-based capstone work that critiques AI utilitarianism through a *Through the Looking-Glass* lens: bilingual play, ecilA framing, and a contamination loop where definitions, chess behavior, and a π-derived graph feed each other. This document is the umbrella **north-star + alignment checklist** for the narrative/production spec versus what the repo actually implements today.

---

## Non-negotiables

- **Verbatim / fixed language**: Project identity phrases and thesis lines agreed for the build should stay verbatim where specified (including bilingual ecilA framing where it appears in copy).
- **Source fidelity for Humpty**: Dialogue and definitions should align with Carroll’s Humpty Dumpty passages where the design calls for direct fidelity; [docs/blog/THROUGH_THE_LOOKING_GLASS.md](docs/blog/THROUGH_THE_LOOKING_GLASS.md) is the in-repo text archive for reference.
- **Tonal guardrails**: The critique of utilitarian “optimization” of language should remain legible in mechanics and copy, not only in README text.

---

## Modules (intent)

### Etymology

Player-facing goal: author or choose definitions that become the semantic ground for the run. System metaphor: words are **contracts**—who gets to mean what shapes what happens next. The game routes etymology as the first phase per level (`GameStateProvider`: `currentPhase` includes `etymology`).

### Chess

Player-facing goal: play (including “unlawful” moves where the design allows) so that board behavior reflects the contamination from the word phase. System metaphor: rules as **negotiated** or **broken** on purpose. Implemented as `UnlawfulChessboard` with snapshot save/load.

### Pi graph

Player-facing goal: watch π digit transitions accumulate as edges and unlock with progression. System metaphor: **statistical structure** made visible—optimization without human meaning. Implemented as a **canvas** visualization (`PiGraph` → `PiGraphCanvas`), not a D3 force layout.

---

## Architecture alignment: storyboard / spec → repo → gap

| Area | Storyboard / production intent | Repo reality (current) | Gap / next step |
|------|-------------------------------|-------------------------|-----------------|
| **Pi visualization** | Force-directed graph (e.g. D3) in some specs | Custom **Canvas 2D** graph: digit nodes, transition weights, `PiGraphCanvas` + `piDigits.ts` | Treat D3 as **optional upgrade**; schedule only if visuals or layout require it. |
| **Dialogue pipeline** | RiveScript → LLM chat loop for Humpty | **`POST /api/dialogue`** in `server/server.ts`: RiveScript (`dialogue.rive`) with LLM fallback; expects `message` + `gameState` | **`DialogueBox` has no `fetch` to `/api/dialogue`**. GameScene wires dialogue UI to **etymology** (`fetchEtymology` / `api.ts`), not the chat endpoint. **Server ready; client wiring pending** for full chat loop. |
| **Etymology API** | Player definitions feeding variants / paraphrase | **`POST /api/etymology`**, **`POST /api/etymology/paraphrase`**; client uses etymology flow from `GameScene` + `EtymologyEngine` | Extend prompts / level-specific config as narrative requires; already integrated for core loop. |
| **Persistence** | Shared persistent π graph, cross-session “agent” identity (in fuller spec) | **Single-slot `localStorage`** (`capstone.gameSnapshot.v1`): level, phase, `levelHistory`, optional chess/pi snapshots | **No shared server-side graph**; no `playerWords[]` / multi-agent numbering in schema. **Phase-2** if required by narrative. |
| **Hands / mouth** | Live2D or similar 2D rig in some production tiers | **Three.js** `IntroScene3D`: `fps-hands.glb`, `mirror.glb`, HDRI + `LoadingGraph` overlay; dialogue + `HandCustomizationOverlay` in `IntroScene` | Tier: **Show & Tell** = current 3D path; **Live2D** = separate pipeline if pursued later. |
| **Unified flow** | Older notes: “three modules as separate tabs” | **Single `GameScene`**: phases **etymology → chess → pi** with `DialogueBox` (split top/bottom: NPC-only + interactive) | Episode 0–8 structure and gallery are **content/routing** work on top of this spine. |

---

## Milestones (Spring 2026)

| Milestone | Target | Status |
|-----------|--------|--------|
| Show & Tell demo | ~**Mar 31, 2026** | Past target (confirm shipped vs deferred) |
| Paper — Results / Evaluation draft pressure | ~**Apr 7, 2026** | Past target (confirm draft status) |
| Thesis / final deliverables week | Late Spring 2026 (per program) | Planned |

**Scheduling note:** The **demo vs writing** squeeze between Show & Tell and the paper is real. Use a **two-track weekly plan**: one track ships a vertical slice in the build; the other maintains a **Results / Evaluation** skeleton fed by what the build actually does.

---

## Show & Tell acceptance criteria (testable)

These are credible minimums for a slice demo; adjust to match program wording.

- [ ] **Episode 0–style intro playable**: 3D intro (`IntroScene3D`, `LoadingGraph`) → scripted dialogue and hand customization → enter game (`IntroScene` / `SceneRouter`).
- [ ] **One full level loop**: etymology → chess → pi completes for at least one level with stable save/load if demo requires resume.
- [ ] **H.D. voice visible**: NPC copy path live (e.g. top `DialogueBox` `npcOnly` line or equivalent) with project tone.
- [ ] **Contamination legible**: a player definition choice affects downstream phase (chess and/or pi) in a way the player can describe in one sentence.
- [ ] **No critical dependency on unfinished systems**: e.g. do not block the demo on shared persistent π graph unless that ship has landed.

**Deferred (“Part 2”)**: full gallery, dual endings, shared persistent graph, full RiveScript chat in UI—flag explicitly if not in the demo build.

---

## Open questions (max 5)

1. **Shared π graph hosting**: Will any cross-player or cross-session graph live on a server, or stay local-only for the capstone timeline?
2. **Agent / player numbering**: If the story requires numbered agents or runs, where does that state live (schema vs pure copy)?
3. **Ending A / B triggers**: What exact `GameState` / level flags gate endings when implemented?
4. **`/api/dialogue` in UI**: Single chat surface vs split with etymology—one component owns POSTs or shared hook?
5. **Bilingual scope for demo**: Which strings are locked for Show & Tell vs post-demo?

---

## Key files (quick reference)

| Concern | Location |
|---------|----------|
| Intro (3D + loading + customization) | `src/components/IntroScene.tsx`, `src/features/Intro/IntroScene3D.tsx`, `src/features/Intro/LoadingGraph.tsx` |
| Phase machine | `src/context/GameState.tsx` |
| Main game UI | `src/scenes/GameScene.tsx` |
| Dialogue presentation | `src/components/DialogueBox.tsx` |
| Pi (canvas) | `src/features/PiGraph/PiGraph.tsx`, `PiGraphCanvas.tsx` |
| Etymology client API | `src/features/EtymologyEngine/api.ts` |
| Dialogue + etymology + chess APIs | `server/server.ts` |
| Save format | `src/gameSave/gameStorage.ts`, [docs/blog/PROJECT_SUMMARY.md](docs/blog/PROJECT_SUMMARY.md) |
