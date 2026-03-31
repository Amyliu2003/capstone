# Capstone — Humpty Dumpty’s playground

A browser game built with **React**, **TypeScript**, and **Vite**: progress through **etymology** (LLM-generated nonsense word histories in a Carroll / Humpty Dumpty style), **chess** (custom board with Stockfish), and a **π transition graph** — with save/load and a small design-token layer.

---

## Features

| Area | What it does |
|------|----------------|
| **Etymology** | Markov-generated or hand-typed words; optional player definition; LLM returns structured variants via a local API proxy (keys stay on the server). |
| **Chess** | `UnlawfulChessboard` + `chess.js` + embedded Stockfish; snapshots for persistence. |
| **Pi graph** | Digits of π drive edge transitions; canvas scales with the layout; level-gated edges. |
| **Game flow** | Intro → game with phases `etymology` → `chess` → `pi`; `GameStateProvider` holds level and history. |
| **Save / load** | Versioned `localStorage` snapshot (`capstone.gameSnapshot.v1`); settings UI for save, load, restart. |

> [!NOTE]
> Detailed implementation notes live in [`docs/blog/PROJECT_SUMMARY.md`](docs/blog/PROJECT_SUMMARY.md). Etymology engine design notes: [`docs/blog/ETYMOLOGY_ENGINE_SUMMARY.md`](docs/blog/ETYMOLOGY_ENGINE_SUMMARY.md).

---

## Prerequisites

- **Node.js** (LTS recommended) and **npm**
- For **etymology**: at least one of **`ANTHROPIC_API_KEY`** or **`OPENAI_API_KEY`** in `.env` (see below)
- **Stockfish** available on your `PATH` unless you set `STOCKFISH_PATH` (used by the server for chess analysis routes)

---

## Quick start

From the project root (the folder that contains `package.json`):

```bash
npm install
```

### Frontend only (no LLM / API)

```bash
npm run dev
```

Opens the Vite dev server (default **http://localhost:5173**).

### Full stack (Vite + API server)

```bash
npm run dev:all
```

Runs Vite and the Express server in parallel. The API listens on **http://localhost:8787** by default; the dev server **proxies `/api`** to that port (see `vite.config.ts`).

> [!TIP]
> Use `npm run dev:fresh` as an alias for `dev:all` if you prefer a single command name.

---

## Configuration

Create a **`.env`** file in the **`capstone`** app directory (next to `package.json`). The Node server loads it from there.

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | Anthropic API key (Messages API) |
| `OPENAI_API_KEY` | OpenAI API key (Chat Completions) |
| `LLM_PROVIDER` | Optional: `openai` or `anthropic` when both keys exist |
| `ANTHROPIC_MODEL` / `OPENAI_MODEL` | Optional model overrides |
| `PORT` | API server port (default **8787**) |
| `STOCKFISH_PATH` | Path to Stockfish binary if not on `PATH` |

> [!WARNING]
> If the app shows errors about a missing Anthropic key while your `.env` is correct, an old process may still be bound to port **8787**. Stop it, then restart:  
> `lsof -ti :8787 | xargs kill`  
> Then run `npm run dev:all` again from the `capstone` folder.

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Vite dev server only |
| `npm run dev:server` | Express + etymology/chess API (`tsx server/server.ts`) |
| `npm run dev:all` / `dev:fresh` | Vite + API together (kills stale listener on 8787 first) |
| `npm run build` | `tsc -b` then production Vite build → `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |

---

## Project structure (overview)

```text
capstone/
├── server/
│   └── server.ts          # Express: /api/etymology, Stockfish proxy, etc.
├── src/
│   ├── App.tsx            # Shell: design system + frame + scene router
│   ├── components/        # Intro, GameRouter, DialogueBox, …
│   ├── context/           # GameStateProvider
│   ├── designSystem/      # DesignSystemProvider, DSButton, tokens
│   ├── features/          # EtymologyEngine, PiGraph, UnlawfulChessboard, …
│   ├── gameSave/          # localStorage snapshot helpers
│   ├── layout/            # AppFrame, SceneHost
│   ├── scenes/            # SceneRouter, GameScene, SettingsScene
│   └── styles/            # theme defaults
├── public/
└── package.json
```

---

## Tech stack

- **UI:** React 19, TypeScript, Vite 7
- **3D (avatars / frames):** React Three Fiber, drei, three.js
- **Motion:** GSAP (where used)
- **Chess:** chess.js, Stockfish (via server / `stockfish` package where applicable)
- **Server:** Express 5, `tsx`, `dotenv`; LLM calls via `fetch` to Anthropic or OpenAI

---

## Learn more

- [Vite](https://vite.dev/)
- [React](https://react.dev/)
