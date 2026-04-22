import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Chess, type Square } from 'chess.js'
import { gsap } from 'gsap'
import type { ChessSnapshot, SerializedBoardState } from '../../gameSave/gameStorage'

const EVAL_BAR_WIDTH = 14
const EVAL_BAR_ANIMATION_DURATION = 0.4

const STARTING_FEN_BLACK_TO_MOVE = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1'

/** Maps cp/mate to 0–100 (50 = equal, >50 = black advantage). */
function evaluationToBarPercent(evaluation: Evaluation): number {
  if (!evaluation) return 50
  if (evaluation.mate !== undefined) {
    // mate > 0 = black mates sooner (black POV)
    if (evaluation.mate > 0) return 5
    if (evaluation.mate < 0) return 95
    return 50
  }
  if (evaluation.cp !== undefined) {
    const clip = Math.max(-50, Math.min(50, evaluation.cp / 10))
    // cp > 0 = black advantage (black POV): shrink white bar, grow dark bar.
    return 50 - clip
  }
  return 50
}

type Piece = { type: string; color: string }
type BoardCell = Piece | null
type BoardState = (BoardCell)[][]

const SQUARE_SIZE = 56
const BOARD_SIZE = 8 * SQUARE_SIZE

function cloneBoard(board: BoardState): BoardState {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)))
}

function indexToSquare(row: number, col: number): string {
  const file = String.fromCharCode(97 + col)
  const rank = 8 - row
  return `${file}${rank}`
}

function squareToIndex(square: string): { row: number; col: number } {
  const file = square.charCodeAt(0) - 97
  const rank = 8 - parseInt(square[1] ?? '1', 10)
  return { row: rank, col: file }
}

const PIECE_LETTER: Record<string, string> = {
  p: '',
  n: 'N',
  b: 'B',
  r: 'R',
  q: 'Q',
  k: 'K',
}

function formatIllegalMove(piece: Piece, from: string, to: string): string {
  const letter = PIECE_LETTER[piece.type] ?? ''
  return `${letter}${from}-${to}`
}

function boardStateToFEN(board: BoardState, turn: 'w' | 'b', fullMove = 1): string {
  const pieceToChar = (c: BoardCell): string => {
    if (!c) return ''
    const letter = c.type === 'p' ? '' : (PIECE_LETTER[c.type] ?? c.type.toUpperCase())
    return c.color === 'w' ? letter.toUpperCase() : letter.toLowerCase()
  }
  const rows: string[] = []
  for (let row = 0; row < 8; row++) {
    let run = 0
    let rank = ''
    for (let col = 0; col < 8; col++) {
      const p = pieceToChar(board[row][col])
      if (p) {
        if (run > 0) {
          rank += run
          run = 0
        }
        rank += p
      } else run++
    }
    if (run > 0) rank += run
    rows.push(rank)
  }
  return `${rows.join('/')} ${turn} KQkq - 0 ${fullMove}`
}

type MoveRecord = { moveNumber: number; notation: string; illegal?: boolean }

type Evaluation = { cp?: number; mate?: number; bestmove?: string } | null

type RedQueenFeedback = {
  symbol: '!!' | '!' | '?' | '??' | '□' | ''
  line: string
  deltaCp: number | null
}

function PieceSvg({ piece, size }: { piece: Piece; size: number }) {
  const s = size
  const isWhite = piece.color === 'w'
  const fill = isWhite ? '#f0f0f0' : '#1a1a1a'
  const stroke = isWhite ? '#333' : '#ccc'

  switch (piece.type) {
    case 'p': {
      return (
        <circle cx={s / 2} cy={s / 2} r={s * 0.2} fill={fill} stroke={stroke} strokeWidth={1.5} />
      )
    }
    case 'r': {
      const w = s * 0.22
      const h = s * 0.5
      return (
        <rect
          x={(s - w) / 2}
          y={(s - h) / 2}
          width={w}
          height={h}
          rx={2}
          fill={fill}
          stroke={stroke}
          strokeWidth={1.5}
        />
      )
    }
    case 'n': {
      return (
        <path
          d={`M ${s * 0.5} ${s * 0.2} L ${s * 0.75} ${s * 0.5} L ${s * 0.6} ${s * 0.8} L ${s * 0.4} ${s * 0.65} L ${s * 0.25} ${s * 0.5} Z`}
          fill={fill}
          stroke={stroke}
          strokeWidth={1.5}
        />
      )
    }
    case 'b': {
      const r = s * 0.18
      return (
        <ellipse cx={s / 2} cy={s / 2} rx={r} ry={r * 1.4} fill={fill} stroke={stroke} strokeWidth={1.5} />
      )
    }
    case 'q': {
      const r = s * 0.22
      return (
        <circle cx={s / 2} cy={s / 2} r={r} fill={fill} stroke={stroke} strokeWidth={1.5} />
      )
    }
    case 'k': {
      const r = s * 0.2
      return (
        <circle cx={s / 2} cy={s / 2} r={r} fill={fill} stroke={stroke} strokeWidth={2} />
      )
    }
    default:
      return <circle cx={s / 2} cy={s / 2} r={s * 0.15} fill={fill} stroke={stroke} strokeWidth={1} />
  }
}

type MovingPiece = { piece: Piece; fromRow: number; fromCol: number; toRow: number; toCol: number }

export type ChessCompleteResult = {
  moves: Array<{ notation: string; illegal?: boolean }>
}

export type UnlawfulChessboardProps = {
  disabledRule?: string
  initialChessSnapshot?: ChessSnapshot | null
  onComplete?: (result: ChessCompleteResult) => void
}

export type UnlawfulChessboardHandle = {
  getSnapshot: () => ChessSnapshot
}

export const UnlawfulChessboard = forwardRef<UnlawfulChessboardHandle, UnlawfulChessboardProps>(
  function UnlawfulChessboard(props: UnlawfulChessboardProps = {}, ref) {
    const { disabledRule, initialChessSnapshot, onComplete } = props
  const gameRef = useRef(new Chess(STARTING_FEN_BLACK_TO_MOVE))
  const [boardState, setBoardState] = useState<BoardState>(() =>
    cloneBoard(new Chess(STARTING_FEN_BLACK_TO_MOVE).board() as BoardState),
  )
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null)
  const [movingPiece, setMovingPiece] = useState<MovingPiece | null>(null)
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([])
  const [currentTurn, setCurrentTurn] = useState<'w' | 'b'>('b')
  const [evaluation, setEvaluation] = useState<Evaluation>(null)
  const [evaluationLoading, setEvaluationLoading] = useState(false)
  const [evaluationError, setEvaluationError] = useState<string | null>(null)
  const movingRef = useRef<SVGGElement>(null)
  const evalBarWhiteRef = useRef<HTMLDivElement>(null)
  const evalBarDarkRef = useRef<HTMLDivElement>(null)
  const lastBarPercentRef = useRef(50)
  const prevCpRef = useRef<number | null>(null)
  const [muted, setMuted] = useState(false)
  const [redQueenFeedback, setRedQueenFeedback] = useState<RedQueenFeedback | null>(null)
  const [lineVisible, setLineVisible] = useState(false)
  const [displayedLine, setDisplayedLine] = useState('')

    // Hydrate exact gameplay state when loading a saved game.
    useEffect(() => {
      if (!initialChessSnapshot) return
      const snap = initialChessSnapshot
      gameRef.current = new Chess(snap.fen)
      setBoardState(cloneBoard(snap.boardState as unknown as BoardState))
      setMoveHistory(snap.moveHistory)
      setCurrentTurn(snap.currentTurn)
      setSelected(null)
      setMovingPiece(null)
      setEvaluation(null)
      setEvaluationLoading(false)
      setEvaluationError(null)
    }, [initialChessSnapshot])

    useImperativeHandle(
      ref,
      () => ({
        getSnapshot: () => ({
          fen: gameRef.current.fen(),
          boardState: cloneBoard(boardState) as unknown as SerializedBoardState,
          moveHistory,
          currentTurn,
        }),
      }),
      [boardState, moveHistory, currentTurn],
    )

  useEffect(() => {
    if (movingPiece || moveHistory.length === 0) {
      if (moveHistory.length === 0) setEvaluation(null)
      return
    }
    const fen = boardStateToFEN(boardState, currentTurn, Math.floor(moveHistory.length / 2) + 1)
    let cancelled = false
    setEvaluationLoading(true)
    setEvaluationError(null)
    fetch('/api/chess/evaluate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fen }),
    })
      .then(async (r) => {
        const text = await r.text()
        if (r.ok) {
          try {
            return JSON.parse(text) as { cp?: number; mate?: number; bestmove?: string }
          } catch {
            return {}
          }
        }
        try {
          const j = JSON.parse(text) as { error?: string }
          throw new Error(j?.error ?? `Request failed (${r.status})`)
        } catch (e) {
          if (e instanceof SyntaxError) throw new Error(`Request failed (${r.status})`)
          throw e
        }
      })
      .then((data: { cp?: number; mate?: number; bestmove?: string }) => {
        if (!cancelled) {
          setEvaluation(data)
          setEvaluationError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setEvaluation(null)
          const msg =
            err instanceof Error
              ? err.message
              : 'Stockfish unavailable'
          const friendly =
            msg.includes('Failed to fetch') || msg.includes('ECONNREFUSED') || msg.includes('NetworkError')
              ? 'Server not running. Start with: npm run dev:all'
              : msg
          setEvaluationError(friendly)
        }
      })
      .finally(() => {
        if (!cancelled) setEvaluationLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [boardState, currentTurn, moveHistory.length, movingPiece])

  const recordMove = useCallback((notation: string, illegal: boolean) => {
    setMoveHistory((prev) => {
      const moveNumber = Math.floor(prev.length / 2) + 1
      return [...prev, { moveNumber, notation, illegal }]
    })
  }, [])

  const handleSquareClick = useCallback(
    (row: number, col: number) => {
      if (movingPiece) return

      const cell = boardState[row][col]

      if (selected) {
        if (selected.row === row && selected.col === col) {
          setSelected(null)
          return
        }
        if (cell && cell.color === currentTurn) {
          setSelected({ row, col })
          return
        }
        const sr = selected.row
        const sc = selected.col
        const piece = boardState[sr][sc]
        if (!piece) return

        const from = indexToSquare(sr, sc)
        const to = indexToSquare(row, col)
        const game = gameRef.current
        const legal = game.move({ from, to })
        const notation = legal ? legal.san : formatIllegalMove(piece, from, to)
        const isIllegal = !legal

        recordMove(notation, isIllegal)
        setCurrentTurn((t) => (t === 'w' ? 'b' : 'w'))

        const next = cloneBoard(boardState)
        next[sr][sc] = null
        next[row][col] = piece
        setSelected(null)
        setMovingPiece({ piece, fromRow: sr, fromCol: sc, toRow: row, toCol: col })
        setBoardState(
          boardState.map((r, ri) =>
            r.map((c, ci) => {
              if (ri === sr && ci === sc) return null
              if (ri === row && ci === col) return null
              return c
            }),
          ),
        )

        const el = movingRef.current
        if (el) {
          gsap.to(el, {
            x: col * SQUARE_SIZE,
            y: row * SQUARE_SIZE,
            duration: 0.35,
            ease: 'power2.out',
            onComplete: () => {
              setBoardState(next)
              setMovingPiece(null)
            },
          })
        } else {
          setBoardState(next)
          setMovingPiece(null)
        }
        return
      }

      if (cell) {
        if (cell.color !== currentTurn) return
        setSelected({ row, col })
      }
    },
    [boardState, selected, movingPiece, recordMove, currentTurn],
  )

  const moveTargets = (() => {
    if (!selected || movingPiece) return null
    const from = indexToSquare(selected.row, selected.col)
    const moves = gameRef.current.moves({ square: from as Square, verbose: true }) as { to: string }[]
    if (moves.length === 0) return null
    return new Set(moves.map((m) => `${squareToIndex(m.to).row}-${squareToIndex(m.to).col}`))
  })()

  const resetBoard = useCallback(() => {
    gameRef.current = new Chess(STARTING_FEN_BLACK_TO_MOVE)
    setBoardState(cloneBoard(gameRef.current.board() as BoardState))
    setSelected(null)
    setMovingPiece(null)
    setMoveHistory([])
    setCurrentTurn('b')
    setEvaluation(null)
    setEvaluationError(null)
    prevCpRef.current = null
  }, [])

  const targetBarPercent = evaluationToBarPercent(evaluation)
  useEffect(() => {
    const whiteEl = evalBarWhiteRef.current
    const darkEl = evalBarDarkRef.current
    if (!whiteEl) return
    gsap.to(whiteEl, {
      height: `${targetBarPercent}%`,
      duration: EVAL_BAR_ANIMATION_DURATION,
      ease: 'power2.out',
      overwrite: true,
    })
    if (darkEl) {
      gsap.to(darkEl, {
        top: `${targetBarPercent}%`,
        duration: EVAL_BAR_ANIMATION_DURATION,
        ease: 'power2.out',
        overwrite: true,
      })
    }
    lastBarPercentRef.current = targetBarPercent
  }, [targetBarPercent])

  const hdRuleLine = (() => {
    if (!disabledRule) return ''
    const key = disabledRule.toLowerCase()
    if (key.includes('en_passant') || key.includes('en passant')) {
      return "Oh, and— no en passant this round. I find it so terribly fussy, don't you?"
    }
    if (key.includes('castle')) {
      return "No castling this round. I find it so fussy, don't you?"
    }
    return "Certain rules have become—let's say—optional."
  })()

  const hdCollageWords = useCallback((text: string) => {
    const words = text.split(/\s+/).filter(Boolean)
    const families = [
      "'IM Fell English', Palatino, serif",
      "'IM Fell Double Pica', Georgia, serif",
      'Georgia, serif',
      "'Times New Roman', Times, serif",
    ]
    const sizePool = [13, 17, 22, 28]
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, lineHeight: 1.1 }}>
        {words.map((w, i) => {
          // Deterministic pseudo-random from index (no runtime RNG).
          const seed = (i * 9301 + 49297) % 233280
          const fontFamily = families[seed % families.length]!
          const fontSize = sizePool[(seed >> 3) % sizePool.length]!
          const fontWeight = (seed >> 5) % 2 === 0 ? 400 : 700
          const fontStyle = (seed >> 7) % 2 === 0 ? 'normal' : 'italic'
          const rot = ((seed % 400) / 400) * 4 - 2 // -2..+2
          return (
            <span
              key={`${i}-${w}`}
              style={{
                display: 'inline-block',
                fontFamily,
                fontSize,
                fontWeight,
                fontStyle,
                transform: `rotate(${rot.toFixed(2)}deg)`,
                color: '#2c2418',
              }}
            >
              {w}
            </span>
          )
        })}
      </div>
    )
  }, [])

  const computeRedQueen = useCallback((prev: number | null, next: Evaluation, forcedMove: boolean): RedQueenFeedback | null => {
    if (!next) return null
    if (forcedMove) return { symbol: '□', line: 'Of course. There was only one move.', deltaCp: null }
    if (next.cp === undefined) return null
    if (prev == null) return null
    const delta = next.cp - prev
    if (delta >= 300) return { symbol: '!!', line: 'Better. Not good enough. Again.', deltaCp: delta }
    if (delta >= 100) return { symbol: '!', line: "That'll do. Move.", deltaCp: delta }
    // Temporary: always speak (no silence band) to make demo feedback obvious.
    if (delta >= -50) return { symbol: '', line: 'Move.', deltaCp: delta }
    if (delta >= -300) return { symbol: '?', line: 'Wrong, as usual.', deltaCp: delta }
    return { symbol: '??', line: "That wouldn't be at all the thing.", deltaCp: delta }
  }, [])

  useEffect(() => {
    if (!evaluation || moveHistory.length === 0) return
    const prev = prevCpRef.current
    // Update prev first, so the delta is based on last known eval.
    if (evaluation.cp !== undefined) prevCpRef.current = evaluation.cp
    if (evaluation.mate !== undefined) prevCpRef.current = null

    // Red Queen only comments on *our* moves (we play Black).
    // currentTurn is the side to move next; if it's White now, Black just moved.
    // (We still update prevCpRef for opponent moves so the next delta isolates our move.)
    if (currentTurn !== 'w') return

    const forcedMove = gameRef.current.moves().length === 1
    const feedback = computeRedQueen(prev, evaluation, forcedMove)
    if (!feedback) return
    setRedQueenFeedback(feedback)

    if (!muted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel()
        const u = new SpeechSynthesisUtterance(feedback.line)
        u.rate = feedback.symbol === '??' ? 1.2 : 1.05
        u.pitch = 0.85
        u.volume = 0.75
        window.speechSynthesis.speak(u)
      } catch {
        // ignore speech failures (permissions/voices not ready)
      }
    }
  }, [evaluation, moveHistory.length, computeRedQueen, muted, currentTurn])

  const redQueenLine = redQueenFeedback?.line ?? ''
  useEffect(() => {
    if (!redQueenLine) {
      setDisplayedLine('')
      setLineVisible(false)
      return
    }
    setDisplayedLine(redQueenLine)
    setLineVisible(true)
    const timer = window.setTimeout(() => setLineVisible(false), 2500)
    return () => window.clearTimeout(timer)
  }, [redQueenLine])

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel()
        } catch {
          // ignore
        }
      }
    }
  }, [])

  const handlePuzzleComplete = useCallback(() => {
    onComplete?.({
      moves: moveHistory.map((m) => ({ notation: m.notation, illegal: m.illegal })),
    })
  }, [onComplete, moveHistory])

  const SHOW_MOVE_RECORD = false

  const moveRecordLines = (() => {
    if (moveHistory.length === 0) {
      return <div style={{ color: '#555' }}>No moves yet.</div>
    }
    const lines: React.ReactNode[] = []
    let lastNum = 0
    moveHistory.forEach((record, i) => {
      const isWhite = i % 2 === 0
      if (isWhite) {
        lastNum = record.moveNumber
        lines.push(
          <span key={`n-${i}`} style={{ marginRight: 4, color: '#555' }}>
            {lastNum}.
          </span>,
        )
      }
      lines.push(
        <span
          key={i}
          style={{
            marginRight: 8,
            color: record.illegal ? '#c4622d' : '#1a1a1a',
            fontStyle: record.illegal ? 'italic' : undefined,
          }}
          title={record.illegal ? 'Unlawful move' : undefined}
        >
          {record.notation}
        </span>,
      )
    })
    return <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', alignItems: 'baseline', color: '#1a1a1a' }}>{lines}</div>
  })()

    return (
    <section style={{ display: 'grid', gap: 6 }}>
      {hdRuleLine ? (
        <header style={{ padding: '8px 10px', borderBottom: '0.5px solid #e8e0d4' }}>
          <div
            style={{
              fontFamily: "'Share Tech Mono', 'Courier New', monospace",
              fontSize: 8,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#9a9080',
              marginBottom: 6,
            }}
          >
            H.D.
          </div>
          {hdCollageWords(hdRuleLine)}
        </header>
      ) : null}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          paddingLeft: 8,
          paddingRight: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <span
            style={{
              fontFamily: "'Share Tech Mono', 'Courier New', monospace",
              fontSize: 10,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#9a9080',
            }}
          >
            {currentTurn === 'w' ? 'White' : 'Black'} to move
          </span>
          {/* cp value is intentionally not shown here; it belongs to the Red Queen strip only. */}
          {evaluationError && !evaluationLoading && (
            <span style={{ fontSize: 10, opacity: 0.7, color: '#9a9080' }} title={evaluationError}>
              {evaluationError}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            setMuted((v) => !v)
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
              try {
                window.speechSynthesis.cancel()
              } catch {
                // ignore
              }
            }
          }}
          style={{
            fontFamily: "'Share Tech Mono', 'Courier New', monospace",
            fontSize: 10,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            padding: '6px 10px',
            borderRadius: 2,
            border: '0.5px solid rgba(154,144,128,0.7)',
            background: 'transparent',
            color: '#9a9080',
            cursor: 'pointer',
          }}
          aria-pressed={muted}
        >
          {muted ? 'Muted' : 'Sound'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', paddingLeft: 8, paddingRight: 8 }}>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
          <div
            style={{
              width: EVAL_BAR_WIDTH,
              height: BOARD_SIZE,
              backgroundColor: '#1a1f2e',
              borderRadius: 0,
              overflow: 'hidden',
              flexShrink: 0,
              position: 'relative',
            }}
            aria-label="Evaluation bar"
          >
            <div
              ref={evalBarWhiteRef}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                height: `${lastBarPercentRef.current}%`,
                backgroundColor: '#d4c4a0',
                borderRadius: 0,
                minHeight: 2,
                maxHeight: '100%',
              }}
            />
            <div
              ref={evalBarDarkRef}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                top: `${lastBarPercentRef.current}%`,
                backgroundColor: '#1a1f2e',
                borderRadius: 0,
              }}
            />
          </div>

          <div style={{ border: '1px solid rgba(26,31,46,0.55)', borderRadius: 4, overflow: 'hidden' }}>
            <svg
              width={BOARD_SIZE}
              height={BOARD_SIZE}
              viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}
              style={{ display: 'block' }}
            >
          <g>
            {Array.from({ length: 8 }, (_, row) =>
              Array.from({ length: 8 }, (_, col) => {
                const isLight = (row + col) % 2 === 0
                const key = `${row}-${col}`
                const isTarget = moveTargets?.has(key)
                const hasPiece = !!boardState[row][col]
                return (
                  <g key={`sq-${key}`}>
                    <rect
                      x={col * SQUARE_SIZE}
                      y={row * SQUARE_SIZE}
                      width={SQUARE_SIZE}
                      height={SQUARE_SIZE}
                      fill={isLight ? '#f5f0e8' : '#4a9b8e'}
                      stroke={selected?.row === row && selected?.col === col ? '#c4622d' : 'transparent'}
                      strokeWidth={3}
                      onClick={() => handleSquareClick(row, col)}
                      style={{ cursor: 'pointer' }}
                    />
                    {isTarget && (
                      <circle
                        cx={col * SQUARE_SIZE + SQUARE_SIZE / 2}
                        cy={row * SQUARE_SIZE + SQUARE_SIZE / 2}
                        r={hasPiece ? SQUARE_SIZE * 0.4 : SQUARE_SIZE * 0.15}
                        fill={hasPiece ? 'transparent' : 'rgba(0,0,0,0.2)'}
                        stroke={hasPiece ? 'rgba(0,0,0,0.4)' : 'none'}
                        strokeWidth={2}
                        pointerEvents="none"
                      />
                    )}
                  </g>
                )
              }),
            )}
          </g>
          <g>
            {boardState.flatMap((row, rowIndex) =>
              row.map((cell, colIndex) => {
                if (!cell) return null
                const key = `${rowIndex}-${colIndex}`
                const isSelectable = cell.color === currentTurn
                return (
                  <g
                    key={key}
                    transform={`translate(${colIndex * SQUARE_SIZE}, ${rowIndex * SQUARE_SIZE})`}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSquareClick(rowIndex, colIndex)
                    }}
                    style={{
                      cursor: isSelectable ? 'pointer' : 'default',
                      opacity: isSelectable ? 1 : 0.6,
                      pointerEvents: isSelectable ? 'auto' : 'none',
                    }}
                  >
                    <PieceSvg piece={cell} size={SQUARE_SIZE} />
                  </g>
                )
              }),
            )}
          </g>
          {movingPiece && (
            <g
              ref={movingRef}
              transform={`translate(${movingPiece.fromCol * SQUARE_SIZE}, ${movingPiece.fromRow * SQUARE_SIZE})`}
              style={{ pointerEvents: 'none' }}
            >
              <PieceSvg piece={movingPiece.piece} size={SQUARE_SIZE} />
            </g>
          )}
        </svg>
          </div>
        </div>

        {(() => {
          const symbol = redQueenFeedback?.symbol ?? ''
          const deltaDisplay =
            redQueenFeedback?.deltaCp != null ? `${redQueenFeedback.deltaCp > 0 ? '+' : ''}${redQueenFeedback.deltaCp}` : ''
          const rqBg = symbol === '' ? '#1a1f2e' : '#252b3d'
          return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: BOARD_SIZE,
            padding: '6px 10px',
            background: rqBg,
            minHeight: 40,
            borderRadius: 2,
          }}
          aria-label="Red Queen evaluation"
        >
          <span
            style={{
              fontFamily: "'Share Tech Mono', 'Courier New', monospace",
              fontSize: 8,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: symbol === '' ? '#4a5060' : '#6a7080',
            }}
          >
            RED QUEEN
          </span>
          <span
            style={{
              fontFamily: "'Share Tech Mono', 'Courier New', monospace",
              fontSize: 10,
              color: symbol === '' ? '#4a5060' : '#c8bfaa',
            }}
          >
            {deltaDisplay}
          </span>
          <span
            style={{
              fontFamily: "'IM Fell Double Pica', Georgia, serif",
              fontSize: 24,
              fontWeight: 700,
              color: symbol === '' ? '#4a5060' : '#f5f0e8',
              minWidth: 28,
            }}
          >
            {symbol}
          </span>
          <span
            style={{
              fontFamily: "'IM Fell English', Palatino, serif",
              fontStyle: 'italic',
              fontSize: 13,
              color: '#e8e0d4',
              opacity: lineVisible ? 1 : 0,
              transition: 'opacity 0.4s ease',
              minHeight: 18,
              flex: 1,
            }}
          >
            {displayedLine}
          </span>
        </div>)
        })()}

        <div
          style={{
            width: BOARD_SIZE,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            paddingLeft: 2,
            paddingRight: 2,
          }}
          aria-label="Chess actions"
        >
          <button
            type="button"
            onClick={resetBoard}
            style={{
              fontFamily: "'Share Tech Mono', 'Courier New', monospace",
              fontSize: 9,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '6px 10px',
              borderRadius: 2,
              border: '0.5px solid rgba(154,144,128,0.7)',
              background: 'transparent',
              color: '#9a9080',
              cursor: 'pointer',
            }}
          >
            Reset
          </button>

          <span style={{ fontFamily: "'Share Tech Mono', 'Courier New', monospace", fontSize: 9, color: '#9a9080' }}>
            Move {moveHistory.length} of ~5
          </span>

          <button
            type="button"
            onClick={handlePuzzleComplete}
            disabled={!onComplete}
            style={{
              fontFamily: "'Share Tech Mono', 'Courier New', monospace",
              fontSize: 9,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '6px 10px',
              borderRadius: 2,
              border: '0.5px solid rgba(200,168,75,0.45)',
              background: 'rgba(200,168,75,0.06)',
              color: '#c8a84b',
              cursor: onComplete ? 'pointer' : 'not-allowed',
              opacity: onComplete ? 1 : 0.5,
            }}
          >
            Continue →
          </button>
        </div>
      </div>

      {SHOW_MOVE_RECORD ? (
        <div
          style={{
            padding: '6px 10px',
            borderTop: '0.5px solid #c8bfaa',
            backgroundColor: '#f5f0e8',
            maxHeight: 80,
            overflow: 'hidden',
          }}
          aria-label="Move record"
        >
          <div
            style={{
              fontFamily: "'Share Tech Mono', 'Courier New', monospace",
              fontSize: 9,
              letterSpacing: '0.08em',
              color: '#9a9080',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            Move record
          </div>
          {moveRecordLines}
        </div>
      ) : null}
    </section>
    )
  },
)
