import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'
import { pieceLabel } from '../../domain/pieces'
import { defaultRng } from '../../domain/rng'
import type { Rng } from '../../domain/rng'
import { haptic } from '../../platform/sdk'
import { NEED, explode, ignite, initBomb, shakeSeconds, tapBomb } from './logic'
import type { BombState } from './logic'
import './bomb.css'

const TICK_MS = 100
const BOOM_MS = 800
const OVERLAY_MS = 1200

export function BombGame({
  order,
  onFinish,
  rng = defaultRng,
  now = () => performance.now(),
}: GameProps & { rng?: Rng; now?: () => number }) {
  const [state, setState] = useState<BombState>(() => initBomb(rng))
  const [shake, setShake] = useState(0.5)
  const [passKey, setPassKey] = useState(0)
  const [overlay, setOverlay] = useState<string | null>(null)
  const stateRef = useRef(state)
  const t0 = useRef(0)
  const interval = useRef<ReturnType<typeof setInterval> | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish

  const commit = (s: BombState) => {
    stateRef.current = s
    setState(s)
  }

  const stopTick = () => {
    if (interval.current !== null) clearInterval(interval.current)
    interval.current = null
  }

  useEffect(() => {
    const list = timers.current
    return () => {
      list.forEach(clearTimeout)
      list.length = 0
      stopTick()
    }
  }, [])

  const tick = () => {
    const cur = stateRef.current
    if (cur.phase !== 'lit') return
    // 틱 횟수가 아니라 실제 경과 시간으로 센다(백그라운드에서 타이머가 늦어도 심지가 늘어나지 않게)
    const elapsed = now() - t0.current
    if (elapsed >= cur.fuse) {
      stopTick()
      const next = explode(cur, order)
      commit(next)
      void haptic('error')
      const loser = next.loser
      timers.current.push(
        setTimeout(() => {
          if (!loser) return
          setOverlay(`${pieceLabel(loser)} 펑!`)
          timers.current.push(setTimeout(() => onFinishRef.current(loser), OVERLAY_MS))
        }, BOOM_MS),
      )
      return
    }
    setShake(shakeSeconds(elapsed, cur.fuse))
  }

  const light = () => {
    const cur = stateRef.current
    const next = ignite(cur)
    if (next === cur) return
    commit(next)
    t0.current = now()
    interval.current = setInterval(tick, TICK_MS)
  }

  const tap = (e: { button: number }) => {
    if (e.button !== 0) return // 마우스 보조 버튼 무시(터치·펜은 button 0)
    const r = tapBomb(stateRef.current, order)
    if (r.state === stateRef.current) return
    commit(r.state)
    if (r.passed) {
      void haptic('tap')
      setPassKey((k) => k + 1)
    }
  }

  const lit = state.phase === 'lit'
  const boom = state.phase === 'exploded'
  const holder = order[state.idx % order.length]

  return (
    <div className="bm-root">
      <div className="bm-bar">7번 탭해서 넘기기! 손에서 터지면 벌칙</div>
      <div className="bm-turn">👉 {pieceLabel(holder)} 차례예요</div>
      <div className="bm-stage">
        <div
          key={passKey}
          className={'bm-bomb' + (lit ? ' bm-shake' : '') + (boom ? ' bm-boom' : '')}
          style={lit ? { animationDuration: `${shake}s` } : undefined}
          aria-hidden="true"
        >
          {boom ? '💥' : '💣'}
        </div>
        {overlay && (
          <div className="bm-overlay" role="status">
            {overlay}
          </div>
        )}
      </div>
      <p className="bm-hint">언제 터질지 아무도 몰라요</p>
      {state.phase === 'idle' ? (
        <button type="button" className="bm-tap bm-start" onClick={light}>
          불 붙이기
        </button>
      ) : (
        <button
          type="button"
          className="bm-tap"
          disabled={boom}
          onPointerDown={tap}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
              e.preventDefault()
              tap({ button: 0 })
            }
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {`탭탭! 넘기기 (${state.taps}/${NEED})`}
        </button>
      )}
    </div>
  )
}
