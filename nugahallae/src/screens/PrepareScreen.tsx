import { useState } from 'react'
import { BottomCTA } from '@toss/tds-mobile'
import { drawPieces, pieceLabel } from '../domain/pieces'
import type { Piece } from '../domain/pieces'
import type { GameDefinition } from '../games/types'
import './screens.css'

interface Props {
  game: GameDefinition
  playerCount: number
  onStart: (order: Piece[]) => void
  onBack: () => void
}

export function PrepareScreen({ game, playerCount, onStart }: Props) {
  const [order] = useState(() => drawPieces(playerCount))
  const [index, setIndex] = useState(0) // 뽑고 확인까지 마친 사람 수
  const [revealed, setRevealed] = useState(false)
  const done = index >= order.length
  const piece = order[index]

  return (
    <div className="sc-page">
      <h1 className="sc-title">{game.title}</h1>
      <p className="sc-rule">{game.rule}</p>
      <p className="sc-rule-fixed">걸리면 통과! 마지막까지 남으면 벌칙</p>

      {done ? (
        <div className="sc-draw sc-draw-ready" role="status">
          모두 뽑았어요! 시작하기를 눌러주세요.
        </div>
      ) : revealed ? (
        <div className="sc-draw sc-draw-ready">
          <div className="sc-piece-chip" style={{ background: piece.color }}>
            <span className="sc-piece">{piece.emoji}</span>
          </div>
          <div className="sc-piece-label">{pieceLabel(piece)} — 내 말을 기억하세요</div>
          <button
            type="button"
            className="sc-confirm"
            onClick={() => {
              setRevealed(false)
              setIndex(index + 1)
            }}
          >
            확인했어요
          </button>
        </div>
      ) : (
        <button type="button" className="sc-draw" onClick={() => setRevealed(true)}>
          {index + 1}번째 사람, 화면을 눌러 말을 뽑으세요
        </button>
      )}

      {done && (
        <BottomCTA fixed onClick={() => onStart(order)}>
          시작하기
        </BottomCTA>
      )}
    </div>
  )
}
