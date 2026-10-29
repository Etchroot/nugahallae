import { useEffect, useRef, useState } from 'react'
import { useTapGuard } from '../../app/useTapGuard'
import type { GameProps } from '../types'
import { pieceLabel } from '../../domain/pieces'
import { defaultRng } from '../../domain/rng'
import type { Rng } from '../../domain/rng'
import { haptic } from '../../platform/sdk'
import { playSfx } from '../../platform/sound'
import { MAX_PUMP, balloonScale, canPass, canPump, initBalloon, passTurn, pump } from './logic'
import type { BalloonState } from './logic'
import { END_EFFECT_MS } from '../shared/timing'
import './balloon.css'

export function BalloonGame({
  order,
  onFinish,
  rng = defaultRng,
}: GameProps & { rng?: Rng }) {
  const [state, setState] = useState<BalloonState>(() => initBalloon(rng, order.length))
  const [overlay, setOverlay] = useState<string | null>(null)
  const guard = useTapGuard()
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

  const commit = (s: BalloonState) => {
    stateRef.current = s
    setState(s)
  }

  const doPump = () => {
    const prev = stateRef.current
    const next = pump(prev, order)
    if (next === prev) return
    commit(next)
    if (next.phase !== 'popped') {
      // 높이는 화면에 보이는 크기(누적 펌프 수)만 따른다. 터질 때까지 남은 횟수와는 무관하다
      playSfx('balloon.pump', { pitch: Math.sqrt(balloonScale(next.total)) })
    }
    if (next.phase === 'popped' && next.loser) {
      const loser = next.loser
      void haptic('error')
      playSfx('balloon.pop')
      setOverlay(`${pieceLabel(loser)} 펑!`)
      timers.current.push(setTimeout(() => onFinishRef.current(loser), END_EFFECT_MS))
    }
  }

  const doPass = () => {
    const prev = stateRef.current
    const next = passTurn(prev, order)
    if (next === prev) return
    commit(next)
    void haptic('tap')
    playSfx('tapSoft')
  }

  const popped = state.phase === 'popped'
  const holder = order[state.turn % order.length]

  return (
    <div className="bl-root">
      <div className="bl-bar">1~3번 펌프하고 넘기기! 터뜨리면 벌칙</div>
      <div className="bl-turn">👉 {pieceLabel(holder)} 차례예요</div>
      <div className="bl-stage">
        <div
          className={popped ? 'bl-balloon bl-popped' : 'bl-balloon'}
          style={{ transform: `scale(${popped ? 1.6 : balloonScale(state.total)})` }}
          aria-hidden="true"
        >
          {popped ? '💥' : '🎈'}
        </div>
        {overlay && (
          <div className="bl-overlay" role="status">
            {overlay}
          </div>
        )}
      </div>
      <button type="button" className="bl-pump" disabled={!canPump(state)} onClick={doPump}>
        {`💨 펌프! (${state.mine}/${MAX_PUMP})`}
      </button>
      <button type="button" className="bl-pass" disabled={!canPass(state)} onClick={guard(doPass)}>
        다음 사람에게 넘기기
      </button>
    </div>
  )
}
