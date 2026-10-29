import { useState } from 'react'
import type { CSSProperties } from 'react'
import { BottomCTA } from '@toss/tds-mobile'
import { useTapGuard } from '../app/useTapGuard'
import { drawPieces, pieceLabel } from '../domain/pieces'
import type { Piece } from '../domain/pieces'
import type { GameDefinition } from '../games/types'
import './screens.css'

const DEFAULT_MIN_PLAYERS = 2
const DEFAULT_MAX_PLAYERS = 10

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
  const MIN_PLAYERS = game.minPlayers ?? DEFAULT_MIN_PLAYERS
  const MAX_PLAYERS = Math.max(MIN_PLAYERS, game.maxPlayers ?? DEFAULT_MAX_PLAYERS)
  // 저장된 인원이 이 게임의 범위 밖이면 가장 가까운 값을 보여 준다(저장값은 사용자가 직접 바꾸기 전까지 그대로 둔다).
  const [count, setCount] = useState(() => Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, initialCount)))
  const [adjusted, setAdjusted] = useState(false)
  const saveCount = () => {
    if (adjusted || count === initialCount) onCountChosen(count)
  }
  const [pieces, setPieces] = useState<Piece[] | null>(null) // 뽑기를 시작하면 채워진다(표시 순서)
  const [picked, setPicked] = useState<Piece[]>([]) // 고른 순서 = 게임 차례
  const [confirming, setConfirming] = useState<Piece | null>(null)
  const guard = useTapGuard()
  const auto = game.pieceMode === 'auto'

  const header = (
    <>
      <h1 className="sc-title">{game.title}</h1>
      <p className="sc-rule">{game.rule}</p>
    </>
  )

  if (pieces === null) {
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
              onClick={() => {
                setAdjusted(true)
                setCount((c) => Math.max(MIN_PLAYERS, c - 1))
              }}
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
              onClick={() => {
                setAdjusted(true)
                setCount((c) => Math.min(MAX_PLAYERS, c + 1))
              }}
            >
              <PlusIcon />
            </button>
          </div>
        </div>
        {auto ? (
          <>
            <p className="sc-auto-note">이 게임은 손가락을 올리는 순서대로 말이 정해져요</p>
            <BottomCTA
              fixed
              onClick={guard(() => {
                saveCount()
                onStart(drawPieces(count))
              })}
            >
              시작하기
            </BottomCTA>
          </>
        ) : (
          <BottomCTA
            fixed
            onClick={() => {
              saveCount()
              setPieces(drawPieces(count))
            }}
          >
            말 뽑기 시작
          </BottomCTA>
        )}
      </div>
    )
  }

  const done = picked.length >= pieces.length

  return (
    <div className="sc-page">
      {header}

      {confirming ? (
        <div className="sc-draw sc-draw-ready">
          <div className="sc-piece-tile" style={{ background: confirming.color }}>
            <span className="sc-piece">{confirming.emoji}</span>
          </div>
          <div className="sc-piece-label">{pieceLabel(confirming)} — 내 말을 기억하세요</div>
          <button
            type="button"
            className="sc-confirm"
            onClick={guard(() => {
              setPicked((p) => [...p, confirming])
              setConfirming(null)
            })}
          >
            확인했어요
          </button>
        </div>
      ) : done ? (
        <p className="sc-pick-guide" role="status">
          모두 골랐어요! 시작하기를 눌러주세요.
        </p>
      ) : (
        <p className="sc-pick-guide" role="status">
          {picked.length + 1}번째 사람, 내 말을 하나 골라요
        </p>
      )}

      <div className="sc-pieces">
        {pieces.map((p) => {
          const taken = picked.some((q) => q.id === p.id)
          return (
            <button
              key={p.id}
              type="button"
              className={`sc-pick${taken ? ' sc-pick-taken' : ''}`}
              style={{ '--pc': p.color } as CSSProperties}
              data-testid="piece-card"
              data-piece-id={p.id}
              disabled={taken || confirming !== null || done}
              onClick={guard(() => {
                if (taken || confirming !== null) return
                setConfirming(p)
              })}
            >
              <span className="sc-pick-emoji">{p.emoji}</span>
              <span className="sc-pick-name">
                {p.colorName} {p.animalName}
              </span>
              {taken && <span className="sc-pick-badge">선택됨</span>}
            </button>
          )
        })}
      </div>

      {picked.length > 0 && !confirming && (
        <button
          type="button"
          className="sc-reset"
          onClick={guard(() => {
            setPicked([])
            setConfirming(null)
          })}
        >
          다시 고르기
        </button>
      )}

      {done && !confirming && (
        <BottomCTA fixed onClick={guard(() => onStart(picked))}>
          시작하기
        </BottomCTA>
      )}
    </div>
  )
}
