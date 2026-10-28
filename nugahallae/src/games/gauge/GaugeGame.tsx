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
import { distanceOf, makeRecord, pickRound, positionAt, recordText, whyText } from './logic'
import type { GaugeRecord, Round } from './logic'
import '../shared/record.css'
import './gauge.css'

const TICK_MS = 16
/** 시작 탭의 더블탭이 곧바로 멈춤으로 처리되지 않게 하는 잠금(900ms 왕복이라 400ms 가드는 너무 길다) */
export const STOP_LOCK_MS = 180
const RULE = '정중앙에서 멈추기! 가장 멀면 벌칙'

type Phase = 'ready' | 'running' | 'stopped'

export function GaugeGame({
  order,
  onFinish,
  rng = defaultRng,
  now = () => performance.now(),
}: GameProps & { rng?: Rng; now?: () => number }) {
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>('ready')
  const [pos, setPos] = useState(0.5)
  const [records, setRecords] = useState<GaugeRecord[]>([])
  const [lastRec, setLastRec] = useState<GaugeRecord | null>(null)
  const [retry, setRetry] = useState(false)
  const phaseRef = useRef<Phase>('ready')
  const round = useRef<Round>({ start: 0.5, dir: 1 })
  const t0 = useRef(0)
  const interval = useRef<ReturnType<typeof setInterval> | null>(null)
  const { guard, prime } = useScreenGuard(now)

  const { ranked, overlay, finish } = useRecordFinish<GaugeRecord>({
    onFinish,
    rng,
    score: (r) => r.d,
    worse: 'higher',
    why: whyText,
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

  // 백그라운드로 가면 진행 중인 시도는 무효 → 같은 사람이 다시
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'hidden' || phaseRef.current !== 'running') return
      stopTick()
      setPos(0.5)
      setRetry(true)
      setP('ready')
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const start = () => {
    if (phaseRef.current !== 'ready') return
    round.current = pickRound(rng)
    t0.current = now()
    setPos(positionAt(round.current, 0))
    setRetry(false)
    setLastRec(null)
    setP('running')
    interval.current = setInterval(() => {
      setPos(positionAt(round.current, now() - t0.current))
    }, TICK_MS)
  }

  const stop = () => {
    if (phaseRef.current !== 'running') return
    const elapsed = now() - t0.current
    if (elapsed < STOP_LOCK_MS) return
    const p = positionAt(round.current, elapsed)
    stopTick()
    prime()
    const rec = makeRecord(order[idx], distanceOf(p))
    setRecords((rs) => [...rs, rec])
    setLastRec(rec)
    setPos(p)
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
    setPos(0.5)
    setP('ready')
  }

  const piece: Piece = order[Math.min(idx, order.length - 1)]
  const isLast = idx + 1 >= order.length

  if (ranked) {
    return (
      <div className="rg-root">
        <div className="rg-bar">{RULE}</div>
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
      <div className="rg-bar">{RULE}</div>
      <div className="rg-turn">👉 {pieceLabel(piece)} 차례예요</div>
      <div className="rg-stage">
        <div className="gg-track" aria-hidden="true">
          <div className="gg-zone" data-testid="gauge-zone" />
          <div className="gg-center" />
          <div
            className={'gg-marker' + (phase === 'stopped' ? ' gg-fixed' : '')}
            style={{ left: `${pos * 100}%` }}
          />
        </div>
        <div className="gg-rec">
          {lastRec ? recordText(lastRec) : retry ? '다시 해 주세요' : ' '}
        </div>
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
            onPointerDown={stop}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
                e.preventDefault()
                stop()
              }
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            멈춰!
          </button>
        )}
        {phase === 'stopped' && <NextButton key="next" last={isLast} onNext={guard(next)} />}
      </div>
    </div>
  )
}
