import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'
import { pieceLabel } from '../../domain/pieces'
import { defaultRng } from '../../domain/rng'
import type { Rng } from '../../domain/rng'
import { haptic } from '../../platform/sdk'
import { playSfx } from '../../platform/sound'
import { currentPlayer, drawStraw, initStraws } from './logic'
import type { StrawsState } from './logic'
import { END_EFFECT_MS } from '../shared/timing'
import { useScreenGuard } from '../shared/useScreenGuard'
import './straws.css'

export function StrawsGame({
  order,
  onFinish,
  rng = defaultRng,
}: GameProps & { rng?: Rng }) {
  const [state, setState] = useState<StrawsState>(() => initStraws(order.length, rng))
  const [overlay, setOverlay] = useState<string | null>(null)
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

  const pull = (i: number) => {
    const prev = stateRef.current
    const next = drawStraw(prev, i, order)
    if (next === prev) return
    stateRef.current = next
    setState(next)
    // 뽑는 소리는 어느 막대든 같고, 결과음은 공개와 같은 순간에
    playSfx('whoosh', { pitch: 1.4 })
    if (next.phase === 'lost' && next.loser) {
      const loser = next.loser
      void haptic('error')
      playSfx('loseSting')
      setOverlay(`${pieceLabel(loser)} 짧은 막대!`)
      timers.current.push(setTimeout(() => onFinishRef.current(loser), END_EFFECT_MS))
    } else {
      void haptic('tap')
      playSfx('success', { gain: 0.7 })
    }
  }

  const count = state.lengths.length
  const over = state.phase === 'lost'
  return (
    <div className="st-root">
      <div className="st-bar">짧은 막대는 딱 하나! 뽑으면 벌칙</div>
      <div className="st-turn">👉 {pieceLabel(currentPlayer(state, order))} 차례예요</div>
      <div className="st-stage">
        <div className="st-grid" style={{ ['--st-cols' as string]: Math.min(count, 5) }}>
          {state.drawn.map((isDrawn, i) => {
            // 길이는 뽑힌 막대에서만 읽는다. 뽑기 전 마크업은 모든 막대가 같다.
            const len = isDrawn ? state.lengths[i] : null
            const isShort = isDrawn && i === state.short
            return (
              <button
                key={i}
                type="button"
                aria-label={`막대 ${i + 1}`}
                className={'st-cell' + (isDrawn ? ' st-out' : '') + (isShort ? ' st-short' : '')}
                disabled={isDrawn || over}
                onClick={guard(() => pull(i))}
              >
                <svg className="st-svg" viewBox="0 0 40 120" aria-hidden="true">
                  {len === null ? (
                    <rect x="14" y="64" width="12" height="32" rx="3" className="st-straw" />
                  ) : (
                    <rect
                      x="14"
                      y={96 - len}
                      width="12"
                      height={len}
                      rx="3"
                      className={'st-straw st-rise' + (isShort ? ' st-straw-short' : '')}
                    />
                  )}
                  <path d="M6 70 L34 70 L31 116 L9 116 Z" className="st-cup" />
                </svg>
                {isDrawn && !isShort && <span className="st-pass">통과</span>}
              </button>
            )
          })}
        </div>
        {overlay && (
          <div className="st-overlay" role="status">
            {overlay}
          </div>
        )}
      </div>
      <p className="st-hint">막대를 하나 눌러 뽑아요</p>
    </div>
  )
}
