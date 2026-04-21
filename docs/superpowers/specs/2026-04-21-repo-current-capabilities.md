# Still Running — Repo capabilities snapshot (as of 2026-04-21)

This document answers: **what this repository contains right now** and **what you can actually run/demo today**, separate from the fuller production storyboard/PRD ambitions.

## What this repo is

A **browser-based game prototype** (React + TypeScript + Vite) with a small **Express** server for LLM-backed endpoints and chess tooling. The intended experience is a phased loop:

`etymology → chess → π`

…plus an **intro** sequence before the main game.

## How to run it (today)

From the app folder that contains `capstone/package.json`:

```bash
npm install
```

### Frontend only (no LLM / no local API)

```bash
npm run dev
```

### Full stack (recommended for etymology + dialogue)

```bash
npm run dev:all
```

This runs Vite + `server/server.ts` together (see `capstone/package.json` scripts).

**Environment**: create `capstone/.env` next to `capstone/package.json` (server loads it). At minimum, configure LLM keys as described in `capstone/README.md`.

## What works in the product build (high confidence)

### Scene flow

- **Intro → Game**: `capstone/src/scenes/SceneRouter.tsx` gates the app between `IntroScene` and `GameScene`.

### Core gameplay loop (implemented)

- **Phase machine**: `capstone/src/context/GameState.tsx` tracks `currentPhase` as `etymology | chess | pi` and advances across phases.
- **Etymology (level flow)**:
  - Player-authored definition input
  - Server returns **3 structured variants**
  - Client adds a **4th canonical Carroll option**, shuffles, and runs a **radio quiz + confirm**
  - Result is stored in `levelHistory` (`playerDefinition`, `chosenVariantIndex`, `isCanonical`)
  - Primary UI wiring lives in `capstone/src/scenes/GameScene.tsx` + `capstone/src/features/EtymologyEngine/*`
- **Chess**: `capstone/src/features/UnlawfulChessboard/UnlawfulChessboard.tsx` (plus server-side Stockfish plumbing in `capstone/server/server.ts`).
- **π graph**: `capstone/src/features/PiGraph/*` (canvas-based visualization; level-gated edges).
- **Dialogue (H.D. chat path)**: `GameScene` can call `POST /api/dialogue` (server implements RiveScript + LLM fallback in `server/server.ts`).

### Persistence (implemented)

- **Single-slot save** in `localStorage` (`capstone/src/gameSave/gameStorage.ts`) with a versioned snapshot format.
- **Settings UI** supports save/load/restart flows (wired through `GameScene` / `SettingsScene`).

### Intro (implemented on the active feature branch)

- **3D intro** is driven by `capstone/src/features/Intro/IntroScene3D.tsx` and mounted from `capstone/src/components/IntroScene.tsx`.
- **Loading overlay** exists as `capstone/src/features/Intro/LoadingGraph.tsx` (used while heavy assets load).
- **Public 3D/HDR assets** live under `capstone/public/` (EXR/GLB/etc.).

## What exists as documentation (not necessarily fully implemented)

These files are valuable for **alignment and critique**, but should not be mistaken for “already shipped mechanics” unless referenced by working code:

- `docs/superpowers/specs/2026-04-21-still-running-master-prd.md` (master PRD + pipeline intent)
- `docs/superpowers/specs/2026-04-21-still-running-phase-1-prd-design.md` (timeboxed slice)
- `docs/superpowers/specs/insight.md` (presentation script / demo narrative)
- `capstone/docs/blog/*` (implementation summaries / alignment notes)

## Known “spec vs code” gaps to keep in mind

These are common places where storyboards describe a future system:

- **Full contamination memory**: storyboards may describe chat + chess history feeding the next etymology prompt as a unified object; verify what is actually passed in `POST /api/etymology` / `POST /api/dialogue` payloads on your branch before claiming it live in demo.
- **Shared persistent π graph / multi-player persistence**: may be documented as a goal; the current prototype uses **local** snapshot persistence unless a server-backed store is explicitly implemented and wired.

## Practical demo checklist (fast)

- [ ] `npm run dev:all` starts without port conflicts (if `5173` is taken, Vite may choose another port).
- [ ] Intro loads (3D + loading overlay dismisses) and transitions into the game.
- [ ] Level 1 runs: etymology → chess → π without hard crashes.
- [ ] Save/load roundtrip works for your intended demo path.
