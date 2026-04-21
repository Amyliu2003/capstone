# Unlawful Chessboard – Summary of Work Done

This document summarizes the implementation and fixes for the **Unlawful Chessboard** feature in the capstone project.

---

## 1. Unlawful Chessboard (core)

- **What it is:** An interactive 8×8 chess board where **unlawful moves are allowed**: you can move pieces to any square. Legal moves are recorded in standard algebraic notation (SAN); illegal moves are recorded with a `from-to` style and marked as unlawful.
- **Stack:** React, TypeScript, **chess.js** for game state and move validation, **GSAP** for piece animation.
- **Rendering:** SVG board with simple piece shapes (circles, rects, paths). Click a piece (your color only), then a square to move; the piece animates to the target, then the board state and move list update.
- **Turn rule:** Only the side to move can select pieces; opponent pieces are dimmed and not clickable. Click the same square to deselect, or another of your pieces to change selection.
- **Reset:** “Reset board” clears the position and move history.

---

## 2. Stockfish integration

- **Purpose:** Evaluate the current position so the UI can show who is winning.
- **Server ([`server/server.ts`](server/server.ts)):**
  - **Persistent worker:** One long-lived Stockfish process is started and reused (no spawn per request). Requests are queued and processed one at a time.
  - **Endpoint:** `POST /api/chess/evaluate` with body `{ fen: string }`. Returns `{ cp?, mate?, bestmove? }` or 503 if Stockfish is unavailable.
  - **Speed:** `movetime` set to 220 ms for quicker responses; timeout sends `stop` if the search runs too long.
- **Client:** After each completed move (when the board state is final), the app builds FEN from the current board and turn, calls the evaluate API, and stores the result. Stockfish status is shown in the header (e.g. “Stockfish: +0.25”, “Mate in 3”, “Evaluating…”, or “Unavailable”).
- **FEN:** `boardStateToFEN(boardState, currentTurn, fullMove)` in the chessboard component builds a FEN string from the 8×8 board for the evaluate request.
- **Config:** Optional `STOCKFISH_PATH` in `.env`; otherwise the server uses the `stockfish` command on `PATH` (e.g. `brew install stockfish`). Documented in `.env.example`.

---

## 3. Vertical evaluation bar

- **Placement:** A vertical bar to the **left** of the board, same height as the board, narrow width (~14 px).
- **Meaning:** Top segment = White’s advantage, bottom segment = Black’s advantage. 50/50 = equal. The split is derived from Stockfish’s `cp` (centipawns) or `mate` (mate in N).
- **Animation:** When the evaluation updates, the split between the light (white) and dark segments animates with GSAP (e.g. 0.4 s, power2.out).

---

## 4. Move record panel

- **Content:** Lists all moves (legal SAN or unlawful `from-to`). Turn and move list update as soon as a move is made.
- **Fixes applied:**
  - **Text visibility:** Panel and text use explicit dark color (`#1a1a1a`) so the move record is readable on the light background.
  - **Layout:** Panel has `minHeight`, `flexShrink: 0`, and clear “Move record” heading so it stays visible and doesn’t collapse.

---

## 5. Available move indicators

- When you **select a piece**, every square it can move to (by current chess.js legal moves) is highlighted:
  - **Empty square:** small filled dot in the center.
  - **Square with enemy piece (capture):** circle outline (ring).
- Unlawful moves are still allowed: you can click any square to move there; the dots/rings only show legal targets.

---

## 6. Dev server and API errors

- **Port 8787:** `npm run dev:all` now kills any process already using port 8787 before starting, so the API server can bind and the Vite proxy to `/api` works (avoids ECONNREFUSED).
- **Evaluation errors:** If the evaluate request fails (e.g. server not running, Stockfish missing), the UI shows a clear message (e.g. “Server not running. Start with: npm run dev:all” or “Stockfish not available. Install: brew install stockfish”) instead of a raw HTTP or network error.

---

## 7. Planned: toggleable rules (“meaningless” chess)

A **Rules** panel is planned so players can disable specific rules and make the game “meaningless”:

| Toggle | Effect when ON (rule disabled) |
|--------|---------------------------------|
| **Disable draws** | No game end for stalemate, 50-move, threefold, or insufficient material. |
| **Disable checkmate** | No “X wins”; game doesn’t end by checkmate. |
| **Disable check** | No “Check” warning; moving into check allowed. |
| **Disable en passant** | En passant not offered as legal. |
| **Disable castling** | Castling not offered as legal. |
| **Disable pawn promotion** | No promotion UI; auto-queen or similar. |
| **Allow unlawful moves** | Any move is allowed (current behavior). When OFF, only moves legal under the other toggles are playable. |

Implementation plan is in the project’s plan file (toggleable chess rules); not yet implemented in code.

---

## Files touched

- **`capstone/src/features/UnlawfulChessboard/UnlawfulChessboard.tsx`** – Board UI, move handling, FEN, evaluation state, eval bar, move record, move targets, error messaging.
- **`capstone/server/server.ts`** – Stockfish worker, queue, `POST /api/chess/evaluate`, parsing of `cp`/`mate`/`bestmove`.
- **`capstone/.env.example`** – `STOCKFISH_PATH` and install note.
- **`capstone/package.json`** – `dev:all` script updated to free port 8787 before starting.

---

## How to run

1. From the inner `capstone` folder: `npm run dev:all` (starts Vite and the API server; kills any process on 8787 first).
2. Install Stockfish for evaluation: `brew install stockfish` (or set `STOCKFISH_PATH` in `.env`).
3. Open the app, go to the Unlawful Chessboard, make moves; the evaluation bar and Stockfish text will update after each move (if the server and Stockfish are available).
