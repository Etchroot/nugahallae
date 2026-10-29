import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'
import { pieceLabel } from '../../domain/pieces'
import { defaultRng } from '../../domain/rng'
import type { Rng } from '../../domain/rng'
import { haptic } from '../../platform/sdk'
import { PlayerTiles } from '../shared/PlayerTiles'
import { useScreenGuard } from '../shared/useScreenGuard'
import { END_EFFECT_MS } from '../shared/timing'
import { COUNT_STEP_MS, OVERLAP_MS, findOverlapGroup, judge } from './logic'
import type { Press } from './logic'
import '../shared/record.css'
import './nunchi.css'

const RULE = '동시에 누르면 벌칙! 마지막까지 못 누르면 벌칙'

type Phase = 'ready' | 'count' | 'play' | 'done'

export function NunchiGame({
  order,
  onFinish,
  rng = defaultRng,
  now = () => performance.now(),
}: GameProps & { rng?: Rng; now?: () => number }) {
  const n = order.length
  const [phase, setPhase] = useState<Phase>('ready')
  const [cd, setCd] = useState(3)
  const [pressed, setPressed] = useState<number[]>([])
  const [overlay, setOverlay] = useState<string | null>(null)
  const [retry, setRetry] = useState(false)
  const phaseRef = useRef<Phase>('ready')
  const pressesRef = useRef<Press[]>([])
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish
  const { guard } = useScreenGuard(now)

  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current.length = 0
    if (settleTimer.current !== null) clearTimeout(settleTimer.current)
    settleTimer.current = null
  }
  useEffect(() => clearTimers, [])

  const setP = (p: Phase) => {
    phaseRef.current = p
    setPhase(p)
  }
  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms))
  }

  // 백그라운드로 가면 진행 중인 시도는 무효 → 처음부터 다시
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'hidden') return
      if (phaseRef.current !== 'count' && phaseRef.current !== 'play') return
      clearTimers()
      pressesRef.current = []
      setPressed([])
      setRetry(true)
      setP('ready')
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const start = () => {
    if (phaseRef.current !== 'ready') return
    setRetry(false)
    pressesRef.current = []
    setPressed([])
    setCd(3)
    setP('count')
    later(() => setCd(2), COUNT_STEP_MS)
    later(() => setCd(1), COUNT_STEP_MS * 2)
    later(() => setP('play'), COUNT_STEP_MS * 3)
  }

  const conclude = () => {
    settleTimer.current = null
    if (phaseRef.current !== 'play') return
    const presses = pressesRef.current
    const v = judge(presses, n, rng)
    const loser = v ? v.loser : presses[presses.length - 1].index
    const kind = v ? v.kind : 'overlap'
    setP('done')
    void haptic('error')
    setOverlay(`${pieceLabel(order[loser])} ${kind === 'overlap' ? '겹쳤어요' : '마지막이에요'}`)
    later(() => onFinishRef.current(order[loser]), END_EFFECT_MS)
  }

  const onTileDown = (index: number, at: number) => {
    if (phaseRef.current !== 'play') return
    if (pressesRef.current.some((p) => p.index === index)) return
    pressesRef.current = [...pressesRef.current, { index, at }]
    setPressed(pressesRef.current.map((p) => p.index))
    // 겹침이 보이거나 n-1명이 눌렀으면 곧 판가름. 같은 순간 눌린 다른 손가락(연쇄)을 기다렸다가 확정한다.
    const pending = findOverlapGroup(pressesRef.current) !== null || pressesRef.current.length >= n - 1
    if (!pending) return
    if (settleTimer.current !== null) clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(conclude, OVERLAP_MS)
  }

  let guide = ' '
  if (phase === 'ready') guide = retry ? '다시 해 주세요' : '둘러앉아 손가락을 준비해요'
  else if (phase === 'play') guide = '차례 없이 자기 칸을 한 번 눌러요'

  return (
    <div className="rg-root">
      <div className="rg-bar">{RULE}</div>
      <div className="nu-field">
        {phase === 'count' ? (
          <div className="nu-count" data-testid="nunchi-count" role="status">
            {cd}
          </div>
        ) : (
          <div className="nu-guide" role="status">
            {guide}
          </div>
        )}
        <PlayerTiles
          order={order}
          now={now}
          onTileDown={onTileDown}
          disabled={(i) => phase !== 'play' || pressed.includes(i)}
          renderStatus={(i) => {
            const k = pressed.indexOf(i)
            return k >= 0 ? `${k + 1}번` : ''
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
