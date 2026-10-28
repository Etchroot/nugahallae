import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'
import { pieceLabel } from '../../domain/pieces'
import { defaultRng } from '../../domain/rng'
import type { Rng } from '../../domain/rng'
import { haptic } from '../../platform/sdk'
import { TEETH, currentPlayer, initCroc, pressTooth } from './logic'
import type { CrocState } from './logic'
import { END_EFFECT_MS } from '../shared/timing'
import './croc.css'


export function CrocGame({
  order,
  onFinish,
  rng = defaultRng,
}: GameProps & { rng?: Rng }) {
  const [state, setState] = useState<CrocState>(() => initCroc(rng))
  const [overlay, setOverlay] = useState<string | null>(null)
  const stateRef = useRef(state)
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

  const press = (i: number) => {
    const prev = stateRef.current
    const next = pressTooth(prev, i, order)
    if (next === prev) return
    stateRef.current = next
    setState(next)
    if (next.phase === 'bitten' && next.loser) {
      const loser = next.loser
      void haptic('error')
      setOverlay(`${pieceLabel(loser)} 콱!`)
      timers.current.push(setTimeout(() => onFinishRef.current(loser), END_EFFECT_MS))
    }
  }

  const bitten = state.phase === 'bitten'
  const half = TEETH / 2
  const tooth = (i: number) => (
    <button
      key={i}
      type="button"
      aria-label={`이빨 ${i + 1}`}
      className={
        'cr-tooth' +
        (state.pressed[i] ? (bitten && i === state.trap ? ' cr-bad' : ' cr-down') : '')
      }
      disabled={state.pressed[i] || bitten}
      onClick={() => press(i)}
    />
  )

  return (
    <div className="cr-root">
      <div className="cr-bar">아픈 이빨은 딱 하나! 물리면 벌칙</div>
      <div className="cr-turn">👉 {pieceLabel(currentPlayer(state, order))} 차례예요</div>
      <div className="cr-stage">
        <div className={bitten ? 'cr-croc cr-bite' : 'cr-croc'}>
          <div className="cr-jaw cr-top">
            <div className="cr-eyes" aria-hidden="true">👀</div>
            <div className="cr-teeth">{Array.from({ length: half }, (_, i) => tooth(i))}</div>
          </div>
          <div className="cr-mouth" aria-hidden="true" />
          <div className="cr-jaw cr-bottom">
            <div className="cr-teeth">{Array.from({ length: half }, (_, i) => tooth(half + i))}</div>
          </div>
        </div>
        {overlay && (
          <div className="cr-overlay" role="status">
            {overlay}
          </div>
        )}
      </div>
      <p className="cr-hint">이빨을 하나씩 눌러요</p>
    </div>
  )
}
