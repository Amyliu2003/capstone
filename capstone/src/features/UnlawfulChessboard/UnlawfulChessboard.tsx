import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Chess, type Square } from 'chess.js'
import { gsap } from 'gsap'
import type { ChessSnapshot, SerializedBoardState } from '../../gameSave/gameStorage'

const EVAL_BAR_WIDTH = 14
const EVAL_BAR_ANIMATION_DURATION = 0.4

/** Maps cp/mate to 0–100 (50 = equal, >50 = white advantage). */
function evaluationToBarPercent(evaluation: Evaluation): number {
  if (!evaluation) return 50
  if (evaluation.mate !== undefined) {
    if (evaluation.mate > 0) return 95
    if (evaluation.mate < 0) return 5
    return 50
  }
  if (evaluation.cp !== undefined) {
    const clip = Math.max(-50, Math.min(50, evaluation.cp / 10))
    return 50 + clip
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
  const gameRef = useRef(new Chess())
  const [boardState, setBoardState] = useState<BoardState>(() =>
    cloneBoard(new Chess().board() as BoardState),
  )
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null)
  const [movingPiece, setMovingPiece] = useState<MovingPiece | null>(null)
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([])
  const [currentTurn, setCurrentTurn] = useState<'w' | 'b'>('w')
  const [evaluation, setEvaluation] = useState<Evaluation>(null)
  const [evaluationLoading, setEvaluationLoading] = useState(false)
  const [evaluationError, setEvaluationError] = useState<string | null>(null)
  const movingRef = useRef<SVGGElement>(null)
  const evalBarWhiteRef = useRef<HTMLDivElement>(null)
  const evalBarDarkRef = useRef<HTMLDivElement>(null)
  const lastBarPercentRef = useRef(50)

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
    gameRef.current.reset()
    setBoardState(cloneBoard(gameRef.current.board() as BoardState))
    setSelected(null)
    setMovingPiece(null)
    setMoveHistory([])
    setCurrentTurn('w')
    setEvaluation(null)
    setEvaluationError(null)
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

  const evaluationText =
    evaluationLoading
      ? 'Evaluating…'
      : evaluationError
        ? 'Unavailable'
        : evaluation?.mate !== undefined
          ? `Mate in ${Math.abs(evaluation.mate)}`
          : evaluation?.cp !== undefined
            ? `${evaluation.cp > 0 ? '+' : ''}${(evaluation.cp / 100).toFixed(2)}`
            : moveHistory.length > 0
              ? 'Unavailable'
              : null

  const handlePuzzleComplete = useCallback(() => {
    onComplete?.({
      moves: moveHistory.map((m) => ({ notation: m.notation, illegal: m.illegal })),
    })
  }, [onComplete, moveHistory])

    return (
    <section style={{ display: 'grid', gap: 12 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>Unlawful Chessboard</h2>
        {disabledRule != null && (
          <span style={{ fontSize: 14, opacity: 0.85 }}>
            Disabled rule: <strong>{disabledRule}</strong> (not wired yet)
          </span>
        )}
        <button type="button" onClick={resetBoard}>
          Reset board
        </button>
        {onComplete && (
          <button type="button" onClick={handlePuzzleComplete}>
            Complete puzzle &amp; continue
          </button>
        )}
        <span style={{ fontSize: 14, opacity: 0.85 }}>
          Click a piece, then a square to move. Click the same piece again or another of your pieces
          to change selection. Only the side to move can select pieces.
        </span>
        <span style={{ fontSize: 14, fontWeight: 600 }}>
          {currentTurn === 'w' ? 'White' : 'Black'} to move
        </span>
        {evaluationText != null && (
          <span style={{ fontSize: 14, opacity: 0.9 }}>
            Stockfish: {evaluationText}
          </span>
        )}
        {evaluationError && !evaluationLoading && (
          <span style={{ fontSize: 12, opacity: 0.75 }} title={evaluationError}>
            {evaluationError}
          </span>
        )}
      </header>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
          <div
            style={{
              width: EVAL_BAR_WIDTH,
              height: BOARD_SIZE,
              backgroundColor: '#bbb',
              borderRadius: 2,
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
                backgroundColor: '#f5f0e8',
                borderRadius: '2px 2px 0 0',
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
                backgroundColor: '#2d2d2d',
                borderRadius: '0 0 2px 2px',
              }}
            />
          </div>
        </div>
        <div style={{ border: '2px solid #333', borderRadius: 4 }}>
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

        <div
          style={{
            minWidth: 200,
            maxWidth: 280,
            minHeight: 120,
            maxHeight: BOARD_SIZE,
            overflow: 'hidden',
            padding: 12,
            border: '1px solid #ccc',
            borderRadius: 4,
            backgroundColor: '#fafafa',
            color: '#1a1a1a',
            fontSize: 14,
            flexShrink: 0,
          }}
          aria-label="Move record"
        >
          <div style={{ fontWeight: 600, marginBottom: 8, color: '#1a1a1a' }}>Move record</div>
          {moveHistory.length === 0 ? (
            <div style={{ color: '#555' }}>No moves yet.</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', alignItems: 'baseline', color: '#1a1a1a' }}>
              {(() => {
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
                return lines
              })()}
            </div>
          )}
        </div>
      </div>
    </section>
    )
  },
)
