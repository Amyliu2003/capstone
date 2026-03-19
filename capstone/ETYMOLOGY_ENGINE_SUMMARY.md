# Etymology Engine – Summary (Plan and Implementation)

This document summarizes the **Etymology Engine Prototype** as described in the plan and as implemented in the capstone app.

---

## 1. Goal (from plan)

Build a minimal React + TypeScript “Etymology Engine” that:

- Generates a **nonsense word** from a Jabberwocky-trained Markov chain (or accepts user input).
- Fetches a **fictional etymology** from an LLM (Anthropic or OpenAI) via a small local proxy server so the API key stays server-side.

---

## 2. Data flow (from plan)

```text
User input / random word  →  EtymologyEngine UI
         →  POST /api/etymology (word, optional promptConfig)
         →  Local Node proxy (server)
         →  Anthropic or OpenAI Messages API
         →  { word, story }  →  UI shows story
```

- **Random word:** Client builds a character n-gram Markov model from Jabberwocky and generates one word (configurable min/max length).
- **Etymology:** Client sends the word (and optional prompt config) to the proxy; server builds a prompt, calls the LLM, returns `{ word, story }`.

---

## 3. What was implemented

### 3.1 Client (React)

- **Component:** [`src/features/EtymologyEngine/EtymologyEngine.tsx`](src/features/EtymologyEngine/EtymologyEngine.tsx)
  - Word text input (user can type any word).
  - **“Generate Nonsense”** button: calls the Markov generator and sets the input to the new word.
  - **“Generate Etymology”** button: calls `fetchEtymology(word, promptConfig)` and shows loading / error / story.
  - Story is rendered in a `<pre>` (plain text, no extra styling).
- **API client:** [`src/features/EtymologyEngine/api.ts`](src/features/EtymologyEngine/api.ts)
  - `fetchEtymology(word, promptConfig?)` → `POST /api/etymology` with `{ word, promptConfig }`.
  - Types: `EtymologyPromptConfig` (tone, include options), `EtymologyResponse` (word, story).
  - Validates response shape and throws on error or malformed JSON.

### 3.2 Markov nonsense generator (client)

- **Corpus:** [`src/features/EtymologyEngine/jabberwocky.ts`](src/features/EtymologyEngine/jabberwocky.ts) – full “Jabberwocky” poem as a string constant.
- **Model and generator:** [`src/features/EtymologyEngine/markov.ts`](src/features/EtymologyEngine/markov.ts)
  - Character-level n-gram Markov chain (e.g. order 4).
  - `buildMarkovModel(corpus, options)` and `generateWord(model, { minLength, maxLength })`.
  - Uses word tokens from the corpus; safe stopping so generated “words” have sensible length.

### 3.3 “Through the Looking-Glass” style prompting (server)

- **Patterns and examples:** [`src/features/EtymologyEngine/etymology_patterns.ts`](src/features/EtymologyEngine/etymology_patterns.ts)
  - **Jabberwocky source words** with Humpty Dumpty–style explanations (e.g. brillig, slithy, toves, gyre, gimble, wabe, mimsy, borogove, mome, rath, outgrabe).
  - Pattern types (portmanteau, hybrid creature noun, Greek root, folk etymology, etc.).
  - **LLM system prompt context** used by the server to set tone and constraints.
- **Server prompt building** ([`server/server.ts`](server/server.ts)):
  - Retrieves a few example words from `etymology_patterns` (by similarity to the user’s word).
  - Builds a prompt that asks for a **clearly fictional** etymology with: invented origin language, century, semantic drift, fake citations.
  - Tone and “include” options come from `promptConfig` (e.g. tone: deadpan; include: origin_language, century, semantic_shift, fake_citations).

### 3.4 Server proxy and LLM

- **Endpoint:** `POST /api/etymology`
  - Body: `{ word: string, promptConfig?: { tone?, include? } }`.
  - Response: `{ word, story }` or 400/500 with a message.
- **LLM provider:** Chosen via env (no code change needed):
  - `ANTHROPIC_API_KEY` (+ optional `ANTHROPIC_MODEL`) for Anthropic.
  - `OPENAI_API_KEY` (+ optional `OPENAI_MODEL`) for OpenAI.
  - `LLM_PROVIDER=openai` or `anthropic` to force which one when both keys are set.
- **Flow:** Load `.env` from a fixed path next to the server → build prompt (with retrieval + few-shot from etymology_patterns) → call Anthropic Messages API or OpenAI Chat Completions → return story text.

### 3.5 Dev and config

- **Vite proxy:** `/api` is proxied to the local server (e.g. `http://localhost:8787`) so the browser can call `/api/etymology` without CORS.
- **Scripts:** `dev`, `dev:server`, `dev:all` (Vite + server via concurrently). Server listens on `PORT` (default 8787).
- **Env:** `.env.example` documents `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `LLM_PROVIDER`, `PORT`, and optional model names.

---

## 4. Files (plan vs actual)

| Plan | Actual |
|------|--------|
| `src/components/EtymologyEngine.tsx` | `src/features/EtymologyEngine/EtymologyEngine.tsx` |
| `src/etymology/jabberwocky.ts` | `src/features/EtymologyEngine/jabberwocky.ts` |
| `src/etymology/markov.ts` | `src/features/EtymologyEngine/markov.ts` |
| `src/etymology/api.ts` | `src/features/EtymologyEngine/api.ts` |
| — | `src/features/EtymologyEngine/etymology_patterns.ts` (Humpty-style patterns + LLM context) |
| `server/server.ts` | Same; also handles etymology prompt + Anthropic/OpenAI and chess/Stockfish. |
| `vite.config.ts` proxy | Present. |
| `.env.example` | Present. |

App entry still renders the Etymology Engine (and other features) via `App.tsx`; the Engine lives under `features/EtymologyEngine/` instead of `components/`.

---

## 5. How to run and test

1. `cd capstone` (inner app folder).
2. `npm install`.
3. Copy `.env.example` to `.env` and set at least one of `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` (and `LLM_PROVIDER=openai` if using OpenAI).
4. `npm run dev:all` (or start server and Vite separately).
5. In the app, open the Etymology Engine:
   - Click **Generate Nonsense** to fill the word field with a Jabberwocky-style word.
   - Optionally edit the word or type your own.
   - Click **Generate Etymology**; after loading, the fictional story appears below.

If you see “Missing ANTHROPIC_API_KEY” (or similar), ensure no old server is still bound to 8787 and restart with `npm run dev:all` (or the script that kills 8787 first).

---

## 6. Plan reference

The original plan is at:  
**`/Users/siera2149knock/.cursor/plans/etymology_engine_prototype_05412b38.plan.md`**

It describes the same high-level flow, Markov generator, single proxy endpoint, and React UI. The implementation adds:

- **Dual LLM support** (Anthropic + OpenAI) and `LLM_PROVIDER`.
- **Structured etymology patterns** and few-shot retrieval (Humpty-style examples) in the server prompt.
- **Optional prompt config** (tone, include) sent from the client and used when building the server prompt.
