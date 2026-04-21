# Capstone project — summary of work

This document summarizes what was implemented and refactored in the game (React + Vite), including layout, Pi graph behavior, modular design-system prep, and save/load controls.

---

## App shell & layout

- **No scrolling:** Root layout uses `overflow: hidden` on `html` / `body` / `#root`; main content areas use flex + `minHeight: 0` so the UI fits the viewport.
- **Shared outer frame:** Intro and game share the same outer container (`AppFrame`) inside `DesignSystemProvider`.
- **Scene flow:** `SceneRouter` keeps `GameStateProvider` mounted and switches between **Intro** (`IntroScene`) and **Game** (`GameScene`) so level/word state can survive “restart to intro” without losing `currentLevel`.

---

## Intro scene

- **3D garden (`IntroScene3D`):** Three.js scene with HDRI / grounded skybox (`/garden.exr`), ground fog, FPS-style **left-hand** rig from `fps-hands.glb`, and a **mirror** from `mirror.glb` (reflective surface + stencil-driven “suck” animation). WASD moves the camera on XZ with a minimum eye height above the floor.
- **Loading overlay (`LoadingGraph`):** Full-screen SVG “complete graph” dissolve + **Still Running…** hold while GLBs / env maps load; calls `onComplete` when assets are ready so the 3D scene does not flash uninitialized.
- **Narrative flow (`IntroScene`):** Staged state machine — mirror interaction triggers dialogue (`DialogueSequence`: llorrac / **H.D.** lines), then **`HandCustomizationOverlay`** (agent parameters stored in `GameState`), follow-up lines, second mirror sequence, and finally `onStart` into the main game. No separate **Done** button; progression is dialogue- and stage-driven.
- Uses `SceneHost` for consistent full-height, non-scrolling layout.

---

## Modular structure & design-system prep

- **`DesignSystemProvider`:** Hybrid approach — React context tokens (`useDesignSystem`) plus CSS variables (`--ds-bg`, `--ds-fg`, `--ds-border`, button colors, spacing, etc.) written to the provider container and `document.documentElement`.
- **Layout primitives:** `AppFrame`, `SceneHost`.
- **Primitives:** `DSButton` (styled via CSS variables).
- **Global CSS:** `index.css` uses those variables for `:root`, links, and buttons where applicable.
- **Barrel exports:** `src/hooks/index.ts` and `src/components/index.ts` re-export key hooks/components.

---

## Pi graph (`PiGraph` / `PiGraphCanvas`)

- **Data:** Edges from π digit transitions; level gates how many transitions are considered via `unlockedEdges` (from `currentLevel` in routing).
- **Static + animated edges:** Accumulated edges drawn with weight-based stroke; the “current” edge animates in, then commits to the static map (no full restart of the whole graph on each level visit).
- **Visuals:** Dark strokes aligned with design tokens; optional props for node/edge colors; `PiGraph` passes token colors from `useDesignSystem()`.
- **Responsive canvas:** Canvas size follows its container (`ResizeObserver`); node/label sizes scale with canvas size.
- **Save/load:** Pi animation state can be snapshotted via ref (`getSnapshot`) for persistence (see Game save below).

---

## Chess (`UnlawfulChessboard`)

- Snapshot API via **ref** (`getSnapshot`) for save: FEN, serialized board grid, move history, side to move.
- Hydration via `initialChessSnapshot` when loading a save (remount keyed by `runSeed`).

---

## Game state & progression

- **`GameStateProvider`:** Tracks `currentLevel`, `currentPhase` (`etymology` → `chess` → `pi`), and `levelHistory`.
- **Actions:** `advancePhase`, `resetGame`, `loadGameSnapshot`, `restartLevelToIntro` (same level, phase back to etymology, history cleared for that level).
- **`runSeed` + `initialChessSnapshot` / `initialPiSnapshot`:** Used so phase components remount and hydrate cleanly after load.

---

## Save / load / restart / settings UI

- **Storage:** Single-slot `localStorage` key `capstone.gameSnapshot.v1` (`src/gameSave/gameStorage.ts`).
- **Save payload:** Versioned snapshot: level, phase, `levelHistory`, plus optional **chess** and **pi** snapshots when saving from those phases.
- **Settings page:** Header has only **Settings**; clicking it **replaces** the main game area with `SettingsScene` (full “page” inside the frame): placeholder settings text, **Save / Load / Restart / Reset game**, and **Back** to return to the game.
- **Restart:** Calls `restartLevelToIntro` and returns to the intro scene while keeping the same level (word).

---

## Key files (reference)

| Area | Files |
|------|--------|
| Entry & shell | `src/App.tsx`, `src/main.tsx`, `src/index.css` |
| Design system | `src/designSystem/DesignSystemProvider.tsx`, `src/designSystem/components/DSButton.tsx`, `src/styles/theme.ts` |
| Layout | `src/layout/AppFrame.tsx`, `src/layout/SceneHost.tsx` |
| Scenes | `src/scenes/SceneRouter.tsx`, `src/scenes/GameScene.tsx`, `src/scenes/SettingsScene.tsx`, `src/components/IntroScene.tsx`, `src/components/DialogueSequence.tsx`, `src/components/HandCustomizationOverlay.tsx` |
| Intro 3D | `src/features/Intro/IntroScene3D.tsx`, `src/features/Intro/LoadingGraph.tsx`, `src/features/Hand/fpsHandModel.ts` |
| Game flow | `src/context/GameState.tsx`, `src/components/GameRouter.tsx` |
| Pi graph | `src/features/PiGraph/PiGraph.tsx`, `PiGraphCanvas.tsx`, `piDigits.ts` |
| Chess | `src/features/UnlawfulChessboard/UnlawfulChessboard.tsx` |
| Persistence | `src/gameSave/gameStorage.ts` |

---

## Notes / limitations

- **Exact resume:** Chess and Pi snapshots aim to restore in-phase state; transient UI (e.g. piece selection mid-animation) may reset on load.
- **Etymology phase:** Save from etymology stores level/phase/history only (no separate “engine” snapshot unless extended later).
- **WebGL context limit (UI previews):** Browser caps concurrent WebGL contexts (often ~8–16). Creating a `THREE.WebGLRenderer` per thumbnail (e.g. a grid of `ThreeFrame` previews) can trigger `WARNING: Too many active WebGL contexts` and `THREE.WebGLRenderer: Context Lost`.
  - Fix: add `enabled` / `rotate` props to `ThreeFrame` and **disable WebGL** (`enabled={false}`) for grids/thumbnails; keep **one** WebGL preview (center panel) and optionally a single static avatar.

---

*Generated as a project summary; adjust this file as features evolve.*
