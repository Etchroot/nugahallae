import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'
import { pieceLabel } from '../../domain/pieces'
import type { Piece } from '../../domain/pieces'
import { defaultRng } from '../../domain/rng'
import type { Rng } from '../../domain/rng'
import { NextButton } from '../shared/NextButton'
import { RankList } from '../shared/RankList'
import { useScreenGuard } from '../shared/useScreenGuard'
import { useRecordFinish } from '../shared/useRecordFinish'
import { displayElapsed, makeRecord, pickTarget, recordText } from './logic'
import type { TimerRecord } from './logic'
import '../shared/record.css'
import './timer.css'

const TICK_MS = 50

type Phase = 'ready' | 'running' | 'stopped'

export function TimerGame({
  order,
  onFinish,
  rng = defaultRng,
  now = () => performance.now(),
}: GameProps & { rng?: Rng; now?: () => number }) {
  const [target] = useState(() => pickTarget(rng))
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>('ready')
  const [shown, setShown] = useState('0.00')
  const [records, setRecords] = useState<TimerRecord[]>([])
  const [lastRec, setLastRec] = useState<TimerRecord | null>(null)
  const t0 = useRef(0)
  const phaseRef = useRef<Phase>('ready')
  const interval = useRef<ReturnType<typeof setInterval> | null>(null)
  const { guard } = useScreenGuard(now)

  const { ranked, overlay, finish } = useRecordFinish<TimerRecord>({
    onFinish,
    rng,
    score: (r) => r.d,
    worse: 'higher',
    why: (r) => `목표에서 ${r.d.toFixed(2)}초 벗어났어요`,
  })

  const stopTick = () => {
    if (interval.current !== null) clearInterval(interval.current)
    interval.current = null
  }
  useEffect(() => stopTick, [])

  const setP = (p: Phase) => {
    phaseRef.current = p
    setPhase(p)
  }

  const start = () => {
    if (phaseRef.current !== 'ready') return
    t0.current = now()
    setShown('0.00')
    setP('running')
    interval.current = setInterval(() => {
      setShown(displayElapsed(now() - t0.current))
    }, TICK_MS)
  }

  const stop = () => {
    if (phaseRef.current !== 'running') return
    const elapsed = now() - t0.current
    stopTick()
    const rec = makeRecord(order[idx], elapsed, target)
    setRecords((rs) => [...rs, rec])
    setLastRec(rec)
    setShown((elapsed / 1000).toFixed(2))
    setP('stopped')
  }

  const next = () => {
    if (phaseRef.current !== 'stopped') return
    if (idx + 1 >= order.length) {
      finish(records)
      setP('ready')
      return
    }
    setIdx(idx + 1)
    setLastRec(null)
    setShown('0.00')
    setP('ready')
  }

  const piece: Piece = order[Math.min(idx, order.length - 1)]
  const isLast = idx + 1 >= order.length

  if (ranked) {
    return (
      <div className="rg-root">
        <div className="rg-bar">목표 시간에 가장 먼 사람이 벌칙</div>
        <RankList rows={ranked.map((r) => ({ piece: r.piece, text: recordText(r) }))} />
        {overlay && (
          <div className="rg-overlay" role="status">
            {overlay}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rg-root">
      <div className="rg-bar">목표 시간에 가장 먼 사람이 벌칙</div>
      <div className="rg-turn">👉 {pieceLabel(piece)} 차례예요</div>
      <div className="rg-stage">
        <div className="tm-target">
          목표 <b>{target.toFixed(1)}초</b>
        </div>
        <div
          className={'tm-time' + (shown === '?.??' ? ' tm-blind' : '')}
          aria-label="경과 시간"
        >
          {shown}
        </div>
        <div className="tm-rec">{lastRec ? recordText(lastRec) : '\u00a0'}</div>
      </div>
      <div className="rg-after">
        {phase === 'ready' && (
          <button key="start" type="button" className="rg-btn" onClick={guard(start)}>
            시작
          </button>
        )}
        {phase === 'running' && (
          <button
            key="stop"
            type="button"
            className="rg-btn rg-danger"
            onPointerDown={guard(stop)}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
                e.preventDefault()
                guard(stop)()
              }
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            멈춰!
          </button>
        )}
        {phase === 'stopped' && (
          <NextButton key="next" last={isLast} onNext={guard(next)} />
        )}
      </div>
    </div>
  )
}
