import { useState } from 'react'
import { BottomCTA } from '@toss/tds-mobile'
import { useTapGuard } from '../app/useTapGuard'
import { drawPieces, pieceLabel } from '../domain/pieces'
import type { Piece } from '../domain/pieces'
import type { GameDefinition } from '../games/types'
import './screens.css'

const MIN_PLAYERS = 2
const MAX_PLAYERS = 10

interface Props {
  game: GameDefinition
  initialCount: number
  onCountChosen: (count: number) => void
  onStart: (order: Piece[]) => void
}

function MinusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14M12 5v14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

export function PrepareScreen({ game, initialCount, onCountChosen, onStart }: Props) {
  const [count, setCount] = useState(initialCount)
  const [order, setOrder] = useState<Piece[] | null>(null) // 뽑기를 시작하면 채워진다
  const [index, setIndex] = useState(0) // 뽑고 확인까지 마친 사람 수
  const [revealed, setRevealed] = useState(false)
  const guard = useTapGuard()

  const header = (
    <>
      <h1 className="sc-title">{game.title}</h1>
      <p className="sc-rule">{game.rule}</p>
    </>
  )

  if (order === null) {
    return (
      <div className="sc-page">
        {header}
        <div className="sc-row">
          <span className="sc-row-label">인원수</span>
          <div className="sc-stepper">
            <button
              type="button"
              className="sc-step"
              aria-label="인원 줄이기"
              disabled={count <= MIN_PLAYERS}
              onClick={() => setCount((c) => Math.max(MIN_PLAYERS, c - 1))}
            >
              <MinusIcon />
            </button>
            <span className="sc-count" data-testid="player-count" aria-live="polite">
              {count}명
            </span>
            <button
              type="button"
              className="sc-step"
              aria-label="인원 늘리기"
              disabled={count >= MAX_PLAYERS}
              onClick={() => setCount((c) => Math.min(MAX_PLAYERS, c + 1))}
            >
              <PlusIcon />
            </button>
          </div>
        </div>
        <BottomCTA
          fixed
          onClick={() => {
            onCountChosen(count)
            setOrder(drawPieces(count))
          }}
        >
          말 뽑기 시작
        </BottomCTA>
      </div>
    )
  }

  const done = index >= order.length
  const piece = order[index]

  return (
    <div className="sc-page">
      {header}

      {done ? (
        <div className="sc-draw sc-draw-ready" role="status">
          모두 뽑았어요! 시작하기를 눌러주세요.
        </div>
      ) : revealed ? (
        <div className="sc-draw sc-draw-ready">
          <div className="sc-piece-tile" style={{ background: piece.color }}>
            <span className="sc-piece">{piece.emoji}</span>
          </div>
          <div className="sc-piece-label">{pieceLabel(piece)} — 내 말을 기억하세요</div>
          <button
            type="button"
            className="sc-confirm"
            onClick={guard(() => {
              setRevealed(false)
              setIndex(index + 1)
            })}
          >
            확인했어요
          </button>
        </div>
      ) : (
        <button type="button" className="sc-draw" onClick={guard(() => setRevealed(true))}>
          {index + 1}번째 사람, 화면을 눌러 말을 뽑으세요
        </button>
      )}

      {done && (
        <BottomCTA fixed onClick={guard(() => onStart(order))}>
          시작하기
        </BottomCTA>
      )}
    </div>
  )
}
