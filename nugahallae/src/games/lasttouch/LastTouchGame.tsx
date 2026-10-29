import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'
import { pieceLabel } from '../../domain/pieces'
import { defaultRng } from '../../domain/rng'
import type { Rng } from '../../domain/rng'
import { haptic } from '../../platform/sdk'
import { PlayerTiles } from '../shared/PlayerTiles'
import { useScreenGuard } from '../shared/useScreenGuard'
import { END_EFFECT_MS } from '../shared/timing'
import { COUNT_STEP_MS, LIMIT_MS, judgeLast, signalDelay } from './logic'
import type { Press } from './logic'
import '../shared/record.css'
import './lasttouch.css'

const RULE = '신호가 뜨면 빨리 누르기! 가장 늦으면 벌칙'

type Phase = 'ready' | 'count' | 'wait' | 'signal' | 'done'

export function LastTouchGame({
  order,
  onFinish,
  rng = defaultRng,
  now = () => performance.now(),
}: GameProps & { rng?: Rng; now?: () => number }) {
  const n = order.length
  const [phase, setPhase] = useState<Phase>('ready')
  const [cd, setCd] = useState(3)
  const [pressed, setPressed] = useState<number[]>([])
  const [times, setTimes] = useState<(number | null)[] | null>(null)
  const [overlay, setOverlay] = useState<string | null>(null)
  const [retry, setRetry] = useState(false)
  const phaseRef = useRef<Phase>('ready')
  const pressesRef = useRef<Press[]>([])
  const signalAt = useRef(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish
  const { guard } = useScreenGuard(now)

  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current.length = 0
  }
  useEffect(() => clearTimers, [])

  const setP = (p: Phase) => {
    phaseRef.current = p
    setPhase(p)
  }
  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms))
  }

  // 백그라운드로 가면 그 라운드는 무효 → 다시 대기부터
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'hidden') return
      const p = phaseRef.current
      if (p !== 'count' && p !== 'wait' && p !== 'signal') return
      clearTimers()
      pressesRef.current = []
      setPressed([])
      setRetry(true)
      setP('ready')
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const decide = (loser: number, text: string) => {
    clearTimers()
    setP('done')
    void haptic('error')
    setOverlay(`${pieceLabel(order[loser])} ${text}`)
    later(() => onFinishRef.current(order[loser]), END_EFFECT_MS)
  }

  const start = () => {
    if (phaseRef.current !== 'ready') return
    setRetry(false)
    pressesRef.current = []
    setPressed([])
    setCd(3)
    setP('count')
    later(() => setCd(2), COUNT_STEP_MS)
    later(() => setCd(1), COUNT_STEP_MS * 2)
    later(() => {
      setP('wait')
      later(() => {
        signalAt.current = now()
        setP('signal')
        later(finishRound, LIMIT_MS)
      }, signalDelay(rng))
    }, COUNT_STEP_MS * 3)
  }

  const finishRound = () => {
    if (phaseRef.current !== 'signal') return
    const r = judgeLast(pressesRef.current, n, signalAt.current, rng)
    setTimes(r.times)
    decide(r.loser, '가장 늦었어요')
  }

  const onTileDown = (index: number, at: number) => {
    const p = phaseRef.current
    if (p === 'wait') {
      decide(index, '너무 빨랐어요')
      return
    }
    if (p !== 'signal') return
    // 신호 타이머가 돈 직후 처리됐지만 실제로는 신호보다 먼저 닿은 터치
    if (at < signalAt.current) {
      decide(index, '너무 빨랐어요')
      return
    }
    if (pressesRef.current.some((x) => x.index === index)) return
    pressesRef.current = [...pressesRef.current, { index, at }]
    setPressed(pressesRef.current.map((x) => x.index))
    if (pressesRef.current.length >= n) finishRound()
  }

  let msg = ' '
  if (phase === 'ready') msg = retry ? '다시 해 주세요' : '시작하면 신호를 기다려요'
  else if (phase === 'wait') msg = '신호를 기다려요'
  else if (phase === 'signal') msg = '지금!'
  else if (phase === 'count') msg = String(cd)

  return (
    <div className="rg-root">
      <div className="rg-bar">{RULE}</div>
      <div className={'lt-field' + (phase === 'signal' ? ' lt-signal' : '')}>
        <div
          className={'lt-msg' + (phase === 'count' ? ' lt-count' : '') + (phase === 'signal' ? ' lt-go' : '')}
          data-testid="lasttouch-msg"
          role="status"
        >
          {msg}
        </div>
        <PlayerTiles
          order={order}
          now={now}
          onTileDown={onTileDown}
          disabled={(i) => !(phase === 'wait' || phase === 'signal') || pressed.includes(i)}
          renderStatus={(i) => {
            if (times) {
              const t = times[i]
              return t === null ? '못 눌렀어요' : `${(t / 1000).toFixed(2)}초`
            }
            return pressed.includes(i) ? '눌렀어요' : ''
          }}
        />
        {overlay && (
          <div className="rg-overlay" role="status">
            {overlay}
          </div>
        )}
      </div>
      <div className="rg-after">
        {phase === 'ready' && (
          <button type="button" className="rg-btn" onClick={guard(start)}>
            시작
          </button>
        )}
      </div>
    </div>
  )
}
