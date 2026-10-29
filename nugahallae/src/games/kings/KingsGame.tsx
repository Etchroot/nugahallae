import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'
import { pieceLabel } from '../../domain/pieces'
import { defaultRng } from '../../domain/rng'
import type { Rng } from '../../domain/rng'
import { haptic } from '../../platform/sdk'
import { playSfx } from '../../platform/sound'
import { END_EFFECT_MS } from '../shared/timing'
import { useScreenGuard } from '../shared/useScreenGuard'
import { KING_COUNT, confirmCard, drawCard, faceOf, initKings } from './logic'
import type { KingsState } from './logic'
import './kings.css'

function Wave() {
  return (
    <svg viewBox="0 0 40 48" className="kg-wave" aria-hidden="true" preserveAspectRatio="none">
      <path d="M0 12 Q10 6 20 12 T40 12" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M0 24 Q10 18 20 24 T40 24" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M0 36 Q10 30 20 36 T40 36" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M7 12.5 L10.5 16 L17 8.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function KingsGame({
  order,
  onFinish,
  rng = defaultRng,
  now = () => performance.now(),
}: GameProps & { rng?: Rng; now?: () => number }) {
  const [state, setState] = useState<KingsState>(() => initKings(order.length, rng))
  const [overlay, setOverlay] = useState<string | null>(null)
  const stateRef = useRef(state)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish
  const { guard, prime } = useScreenGuard(now)

  const commit = (s: KingsState) => {
    stateRef.current = s
    setState(s)
  }

  useEffect(() => {
    const list = timers.current
    return () => {
      list.forEach(clearTimeout)
      list.length = 0
    }
  }, [])

  const pick = (i: number) => {
    const r = drawCard(stateRef.current, i)
    if (r.event === 'ignored') return
    commit(r.state)
    prime()
    // 뒤집는 소리는 카드 종류와 무관하게 같다. 그 뒤 공개된 카드의 소리
    playSfx('cardFlip')
    if (r.event === 'king') playSfx('kings.king')
    if (r.event === 'effect') {
      const face = faceOf(r.state, i)
      playSfx('chime', face.kind === 'effect' && face.effect !== 'say' ? { pitch: 1.25 } : undefined)
    }
    if (r.event === 'last-king') {
      void haptic('error')
      playSfx('loseSting')
      const loser = r.state.loserIdx === null ? null : order[r.state.loserIdx]
      if (loser) {
        setOverlay(`${pieceLabel(loser)} 마지막 왕을 뽑았어요`)
        timers.current.push(setTimeout(() => onFinishRef.current(loser), END_EFFECT_MS))
      }
    }
  }

  const ok = () => {
    const r = confirmCard(stateRef.current)
    if (r.state === stateRef.current) return
    commit(r.state)
    playSfx('tapSoft')
    if (r.passed) void haptic('tap')
  }

  const showing = state.phase === 'show' && state.last !== null ? faceOf(state, state.last) : null
  const who = order[(state.phase === 'over' && state.loserIdx !== null ? state.loserIdx : state.idx) % order.length]

  return (
    <div className="kg-root">
      <div className="kg-bar">왕 카드는 4장! 네 번째 왕을 뽑으면 벌칙</div>
      <div className="kg-turn">👉 {pieceLabel(who)} 차례예요</div>
      <div className="kg-count">{`왕 ${state.kings}/${KING_COUNT}`}</div>
      <div className="kg-stage">
        <ul className="kg-grid">
          {state.drawn.map((isDrawn, i) => {
            const face = isDrawn ? faceOf(state, i) : null
            const label = `카드 ${i + 1}번${face ? (face.kind === 'king' ? ' 왕' : ' 뽑음') : ''}`
            return (
              <li key={i}>
                <button
                  type="button"
                  className={'kg-card' + (isDrawn ? ' kg-card--flip' : '')}
                  aria-label={label}
                  disabled={isDrawn}
                  onClick={() => pick(i)}
                >
                  <span className="kg-inner" aria-hidden="true">
                    <span className="kg-face kg-back">
                      <Wave />
                    </span>
                    <span className={'kg-face kg-front' + (face?.kind === 'king' ? ' kg-front--king' : '')}>
                      {face?.kind === 'king' ? '👑' : face ? <Check /> : null}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        {overlay && (
          <div className="kg-overlay" role="status">
            {overlay}
          </div>
        )}
      </div>
      <div className="kg-panel">
        {showing ? (
          <>
            <p className="kg-result" role="status">
              {showing.kind === 'king' ? '왕이에요' : showing.text}
            </p>
            <button type="button" className="kg-ok" onClick={guard(ok)}>
              확인했어요
            </button>
          </>
        ) : (
          <p className="kg-hint">{state.phase === 'over' ? ' ' : '카드를 한 장 골라요'}</p>
        )}
      </div>
    </div>
  )
}
