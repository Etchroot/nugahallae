import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'
import { pieceLabel } from '../../domain/pieces'
import { haptic } from '../../platform/sdk'
import { LIMIT, canPick, currentPlayer, initThirtyOne, pickCount, spoken } from './logic'
import type { ThirtyOneState } from './logic'
import { END_EFFECT_MS } from '../shared/timing'
import { useScreenGuard } from '../shared/useScreenGuard'
import './thirtyone.css'

export function ThirtyOneGame({ order, onFinish }: GameProps) {
  const [state, setState] = useState<ThirtyOneState>(initThirtyOne)
  const [overlay, setOverlay] = useState<string | null>(null)
  const [last, setLast] = useState<string | null>(null)
  const stateRef = useRef(state)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish
  const { guard } = useScreenGuard()

  useEffect(() => {
    const list = timers.current
    return () => {
      list.forEach(clearTimeout)
      list.length = 0
    }
  }, [])

  const pick = (count: number) => {
    const prev = stateRef.current
    const next = pickCount(prev, count, order)
    if (next === prev) return
    stateRef.current = next
    setState(next)
    setLast(`${pieceLabel(currentPlayer(prev, order))}: ${spoken(prev.n, count).join(', ')}`)
    if (next.phase === 'lost' && next.loser) {
      const loser = next.loser
      void haptic('error')
      setOverlay(`${pieceLabel(loser)} 31을 불렀어요`)
      timers.current.push(setTimeout(() => onFinishRef.current(loser), END_EFFECT_MS))
    } else {
      void haptic('tap')
    }
  }

  const over = state.phase === 'lost'
  return (
    <div className="to-root">
      <div className="to-bar">1~3개씩 이어 세기! 31을 부르면 벌칙</div>
      <div className="to-turn">👉 {pieceLabel(currentPlayer(state, order))} 차례예요</div>
      <div className="to-now">지금까지 {state.n}</div>
      <div className="to-track" aria-hidden="true">
        {Array.from({ length: LIMIT }, (_, i) => (
          <span
            key={i}
            className={
              'to-cell' + (i + 1 <= state.n ? ' to-done' : '') + (i + 1 === LIMIT ? ' to-end' : '')
            }
          />
        ))}
      </div>
      <div className="to-stage">
        <div className="to-btns">
          {[1, 2, 3].map((c) => {
            const ok = canPick(state.n, c) && !over
            return (
              <button
                key={c}
                type="button"
                className="to-btn"
                disabled={!ok}
                onClick={guard(() => pick(c))}
              >
                <span>{c}개 부르기</span>
                <span className="to-sub" aria-hidden="true">
                  {spoken(state.n, c)
                    .filter((v) => v <= LIMIT)
                    .join(', ')}
                </span>
              </button>
            )
          })}
        </div>
        <p className="to-last">{last ?? '숫자를 이어서 불러요'}</p>
        {overlay && (
          <div className="to-overlay" role="status">
            {overlay}
          </div>
        )}
      </div>
    </div>
  )
}
