import { useEffect, useRef, useState } from 'react'
import type { MouseEvent, PointerEvent } from 'react'
import type { GameProps } from '../types'
import { pieceLabel } from '../../domain/pieces'
import { haptic } from '../../platform/sdk'
import { SWITCH_IGNORE_MS, judgeTap, limitMs, nextNumber } from './logic'
import type { TapAction } from './logic'
import { END_EFFECT_MS } from '../shared/timing'
import './clap369.css'

type Phase = 'ready' | 'run' | 'lost'

export function Clap369Game({
  order,
  onFinish,
  now = () => performance.now(),
}: GameProps & { now?: () => number }) {
  const [turn, setTurn] = useState(0)
  const [n, setN] = useState(1)
  const [phase, setPhase] = useState<Phase>('ready')
  const [retry, setRetry] = useState(false)
  const [overlay, setOverlay] = useState<string | null>(null)
  const [runId, setRunId] = useState(0)

  const ref = useRef({ turn: 0, n: 1, phase: 'ready' as Phase, claps: 0, deadline: 0, lockUntil: 0 })
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const limitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish
  const nowRef = useRef(now)
  nowRef.current = now

  const clearLimit = () => {
    if (limitTimer.current !== null) clearTimeout(limitTimer.current)
    limitTimer.current = null
  }

  useEffect(() => {
    const list = timers.current
    return () => {
      list.forEach(clearTimeout)
      list.length = 0
      clearLimit()
    }
  }, [])

  const lose = () => {
    const r = ref.current
    if (r.phase !== 'run') return
    r.phase = 'lost'
    clearLimit()
    setPhase('lost')
    const loser = order[r.turn % order.length]
    void haptic('error')
    setOverlay(`${pieceLabel(loser)} 짝을 놓쳤어요`)
    timers.current.push(setTimeout(() => onFinishRef.current(loser), END_EFFECT_MS))
  }

  // 백그라운드로 가면 진행 중인 시도는 무효: 같은 사람 준비 화면부터 다시
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState !== 'hidden') return
      const r = ref.current
      if (r.phase !== 'run') return
      clearLimit()
      r.phase = 'ready'
      r.claps = 0
      r.lockUntil = nowRef.current() + SWITCH_IGNORE_MS
      setPhase('ready')
      setRetry(true)
    }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [])

  const start = () => {
    const r = ref.current
    if (r.phase !== 'ready' || nowRef.current() < r.lockUntil) return
    r.phase = 'run'
    r.claps = 0
    const limit = limitMs(r.n)
    r.deadline = nowRef.current() + limit
    clearLimit()
    limitTimer.current = setTimeout(lose, limit)
    setRetry(false)
    setPhase('run')
    setRunId((v) => v + 1)
  }

  const act = (action: TapAction) => {
    const r = ref.current
    if (r.phase !== 'run') return
    if (nowRef.current() >= r.deadline) return lose()
    const res = judgeTap(r.n, r.claps, action)
    if (res === 'wrong') return lose()
    if (res === 'continue') {
      r.claps += 1
      return
    }
    clearLimit()
    r.phase = 'ready'
    r.claps = 0
    r.turn = (r.turn + 1) % order.length
    r.n = nextNumber(r.n)
    r.lockUntil = nowRef.current() + SWITCH_IGNORE_MS
    void haptic('tap')
    setTurn(r.turn)
    setN(r.n)
    setPhase('ready')
  }

  const onPointer = (action: TapAction) => (e: PointerEvent) => {
    e.preventDefault()
    act(action)
  }
  // 키보드: 브라우저가 Enter(keydown)·Space(keyup)에서 click(detail 0)을 한 번씩 보낸다. keydown은 막지 않는다.
  // 포인터 입력은 pointerdown에서 이미 처리하고 이때 click은 detail >= 1이라 무시한다.
  const onClick = (action: TapAction) => (e: MouseEvent) => {
    if (e.detail === 0) act(action)
  }

  const player = order[turn % order.length]
  return (
    <div className="c3-root">
      <div className="c3-bar">3·6·9가 들어가면 짝! 놓치면 벌칙</div>
      {phase === 'ready' && (
        <div className="c3-stage">
          <div className="c3-turn">👉 {pieceLabel(player)} 차례예요</div>
          {retry && <p className="c3-retry">다시 해 주세요</p>}
          <button
            type="button"
            className="c3-ready"
            onPointerDown={(e) => {
              e.preventDefault()
              start()
            }}
            onClick={(e) => {
              if (e.detail === 0) start()
            }}
          >
            준비됐어요
          </button>
        </div>
      )}
      {phase !== 'ready' && (
        <div className="c3-stage">
          <div className="c3-turn">{pieceLabel(player)}</div>
          <div className="c3-num" aria-live="off">
            {n}
          </div>
          <div className="c3-limit" aria-hidden="true">
            <div
              key={runId}
              className="c3-limit-fill"
              style={{ animationDuration: `${limitMs(n)}ms` }}
            />
          </div>
          <div className="c3-btns">
            <button
              type="button"
              className="c3-btn c3-skip"
              disabled={phase === 'lost'}
              onPointerDown={onPointer('skip')}
              onClick={onClick('skip')}
            >
              숫자 넘기기
            </button>
            <button
              type="button"
              className="c3-btn c3-clap"
              disabled={phase === 'lost'}
              onPointerDown={onPointer('clap')}
              onClick={onClick('clap')}
            >
              짝!
            </button>
          </div>
          {overlay && (
            <div className="c3-overlay" role="status">
              {overlay}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
