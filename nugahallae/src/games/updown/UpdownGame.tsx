import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { GameProps } from '../types'
import { pieceLabel } from '../../domain/pieces'
import { defaultRng } from '../../domain/rng'
import type { Rng } from '../../domain/rng'
import { haptic } from '../../platform/sdk'
import { initUpdown, submitGuess } from './logic'
import type { UpdownState } from './logic'
import './updown.css'

const BOOM_MS = 900
const OVERLAY_MS = 1200

function Arrow({ up }: { up: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        d={up ? 'M12 19V5M5 12l7-7 7 7' : 'M12 5v14M5 12l7 7 7-7'}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function UpdownGame({
  order,
  onFinish,
  rng = defaultRng,
}: GameProps & { rng?: Rng }) {
  const [state, setState] = useState<UpdownState>(() => initUpdown(rng))
  const [text, setText] = useState('')
  const [error, setError] = useState(false)
  const [overlay, setOverlay] = useState<string | null>(null)
  const stateRef = useRef(state)
  const inputRef = useRef<HTMLInputElement>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish

  useEffect(() => {
    const list = timers.current
    return () => {
      list.forEach(clearTimeout)
      list.length = 0
    }
  }, [])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const prev = stateRef.current
    if (prev.phase !== 'playing') return
    const r = submitGuess(prev, text, order)
    if (r.error) {
      setError(true)
      return
    }
    setError(false)
    stateRef.current = r.state
    setState(r.state)
    setText('')
    inputRef.current?.focus()
    if (r.state.phase === 'boom' && r.state.loser) {
      const loser = r.state.loser
      void haptic('error')
      timers.current.push(
        setTimeout(() => {
          setOverlay(`${pieceLabel(loser)} 펑!`)
          timers.current.push(setTimeout(() => onFinishRef.current(loser), OVERLAY_MS))
        }, BOOM_MS),
      )
    }
  }

  const boom = state.phase === 'boom'
  const last = state.history[state.history.length - 1]
  const holder = order[state.turn % order.length]

  return (
    <div className="ud-root">
      <div className="ud-bar">폭탄 숫자를 부르면 벌칙! 범위 안에서 골라요</div>
      <div className="ud-turn">👉 {pieceLabel(holder)} 차례예요</div>
      <div className="ud-range">{boom ? `💥 ${last?.n}` : `${state.lo} ~ ${state.hi}`}</div>
      <div className="ud-hint" role="status">
        {state.hint === 'up' && (
          <span className="ud-up">
            <Arrow up />
            <span>UP</span>
          </span>
        )}
        {state.hint === 'down' && (
          <span className="ud-down">
            <Arrow up={false} />
            <span>DOWN</span>
          </span>
        )}
      </div>
      <div className="ud-hist">
        {state.history.map((h, i) => (
          <span key={i} className="ud-chip">{`${h.piece.emoji} ${h.n}`}</span>
        ))}
      </div>
      <div className="ud-spacer" />
      {overlay && (
        <div className="ud-overlay" role="status">
          {overlay}
        </div>
      )}
      <form className="ud-form" onSubmit={onSubmit}>
        <div className="ud-row">
          <input
            ref={inputRef}
            className="ud-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="숫자 입력"
            aria-label="숫자 입력"
            autoComplete="off"
            maxLength={3}
            value={text}
            disabled={boom}
            onChange={(e) => setText(e.target.value)}
          />
          <button type="submit" className="ud-ok" disabled={boom}>
            확인
          </button>
        </div>
        <p className="ud-error" role="alert">
          {error ? `${state.lo}~${state.hi} 사이 숫자를 입력해요` : ''}
        </p>
      </form>
    </div>
  )
}
