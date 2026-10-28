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
import {
  COUNT_STEP_MS, GRID_SIZE, WRONG_FLASH_MS, makeRecord, recordText, shuffleGrid, whyText,
} from './logic'
import type { OrderRecord } from './logic'
import '../shared/record.css'
import './order.css'

const RULE = '1부터 16까지 순서대로! 가장 느리면 벌칙'

type Phase = 'ready' | 'count' | 'play' | 'done'

export function OrderGame({
  order,
  onFinish,
  rng = defaultRng,
  now = () => performance.now(),
}: GameProps & { rng?: Rng; now?: () => number }) {
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>('ready')
  const [cd, setCd] = useState(3)
  const [grid, setGrid] = useState<number[]>([])
  const [target, setTarget] = useState(1)
  const [wrong, setWrong] = useState<number | null>(null)
  const [records, setRecords] = useState<OrderRecord[]>([])
  const [lastRec, setLastRec] = useState<OrderRecord | null>(null)
  const [retry, setRetry] = useState(false)
  const phaseRef = useRef<Phase>('ready')
  const targetRef = useRef(1)
  const mistakes = useRef(0)
  const t0 = useRef(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { guard, prime } = useScreenGuard(now)

  const { ranked, overlay, finish } = useRecordFinish<OrderRecord>({
    onFinish,
    rng,
    score: (r) => r.ms,
    worse: 'higher',
    why: whyText,
  })

  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current.length = 0
    if (flashTimer.current !== null) clearTimeout(flashTimer.current)
    flashTimer.current = null
  }
  useEffect(() => clearTimers, [])

  const setP = (p: Phase) => {
    phaseRef.current = p
    setPhase(p)
  }
  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms))
  }

  // 백그라운드로 가면 진행 중인 시도는 무효 → 같은 사람이 다시
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'hidden') return
      if (phaseRef.current !== 'count' && phaseRef.current !== 'play') return
      clearTimers()
      setWrong(null)
      setGrid([])
      setRetry(true)
      setP('ready')
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const start = () => {
    if (phaseRef.current !== 'ready') return
    setRetry(false)
    setLastRec(null)
    setCd(3)
    setP('count')
    later(() => setCd(2), COUNT_STEP_MS)
    later(() => setCd(1), COUNT_STEP_MS * 2)
    later(() => {
      setGrid(shuffleGrid(rng))
      targetRef.current = 1
      setTarget(1)
      mistakes.current = 0
      t0.current = now()
      setP('play')
    }, COUNT_STEP_MS * 3)
  }

  const press = (n: number) => {
    if (phaseRef.current !== 'play') return
    if (n < targetRef.current) return // 이미 누른 칸
    if (n !== targetRef.current) {
      mistakes.current += 1
      setWrong(n)
      if (flashTimer.current !== null) clearTimeout(flashTimer.current)
      flashTimer.current = setTimeout(() => setWrong(null), WRONG_FLASH_MS)
      return
    }
    if (n === GRID_SIZE) {
      const rec = makeRecord(order[idx], now() - t0.current, mistakes.current)
      targetRef.current = GRID_SIZE + 1
      setTarget(GRID_SIZE + 1)
      setRecords((rs) => [...rs, rec])
      setLastRec(rec)
      prime() // 마지막 연타 직후 나타나는 `다음 사람`을 더블탭에서 보호
      setP('done')
      return
    }
    targetRef.current = n + 1
    setTarget(n + 1)
  }

  const next = () => {
    if (phaseRef.current !== 'done') return
    if (idx + 1 >= order.length) {
      finish(records)
      return
    }
    setIdx(idx + 1)
    setLastRec(null)
    setGrid([])
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
        {phase === 'count' && <div className="og-count">{cd}</div>}
        {phase === 'play' && (
          <>
            <div className="og-next">
              다음
              <b data-testid="order-next">{target}</b>
            </div>
            <div className="og-grid" data-testid="order-grid">
              {grid.map((n) => (
                <button
                  key={n}
                  type="button"
                  data-testid="order-cell"
                  className={'og-cell' + (wrong === n ? ' og-wrong' : '')}
                  disabled={n < target}
                  onPointerDown={() => press(n)}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
                      e.preventDefault()
                      press(n)
                    }
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  {n}
                </button>
              ))}
            </div>
          </>
        )}
        {(phase === 'ready' || phase === 'done') && (
          <div className="og-rec">
            {lastRec ? recordText(lastRec) : retry ? '다시 해 주세요' : ' '}
          </div>
        )}
      </div>
      <div className="rg-after">
        {phase === 'ready' && (
          <button key="start" type="button" className="rg-btn" onClick={guard(start)}>
            시작
          </button>
        )}
        {phase === 'done' && <NextButton key="next" last={isLast} onNext={guard(next)} />}
      </div>
    </div>
  )
}
