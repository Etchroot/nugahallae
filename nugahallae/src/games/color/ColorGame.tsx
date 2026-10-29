import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'
import { pieceLabel } from '../../domain/pieces'
import type { Piece } from '../../domain/pieces'
import { defaultRng } from '../../domain/rng'
import type { Rng } from '../../domain/rng'
import { notePitch, playSfx } from '../../platform/sound'
import { NextButton } from '../shared/NextButton'
import { RankList } from '../shared/RankList'
import { useScreenGuard } from '../shared/useScreenGuard'
import { useRecordFinish } from '../shared/useRecordFinish'
import {
  COLORS, COUNT_STEP_MS, INPUT_LOCK_MS, PENALTY_FLASH_MS, QUESTION_COUNT, SHAKE_MS, makeQuestions, makeRecord,
  recordText, whyText,
} from './logic'
import type { ColorRecord } from './logic'
import '../shared/record.css'
import './color.css'

const RULE = '글자 뜻 말고 색을 골라요! 가장 느리면 벌칙'

type Phase = 'ready' | 'count' | 'play' | 'done'

const colorById = (id: string) => COLORS.find((c) => c.id === id)!

export function ColorGame({
  order,
  onFinish,
  rng = defaultRng,
  now = () => performance.now(),
}: GameProps & { rng?: Rng; now?: () => number }) {
  // 모든 사람이 같은 문제 — 판마다 한 번만 만든다
  const [questions] = useState(() => makeQuestions(rng))
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>('ready')
  const [cd, setCd] = useState(3)
  const [qi, setQi] = useState(0)
  const [shake, setShake] = useState<{ id: string; n: number } | null>(null)
  const [penalty, setPenalty] = useState(false)
  const [records, setRecords] = useState<ColorRecord[]>([])
  const [lastRec, setLastRec] = useState<ColorRecord | null>(null)
  const [retry, setRetry] = useState(false)
  const phaseRef = useRef<Phase>('ready')
  const qiRef = useRef(0)
  const mistakes = useRef(0)
  const t0 = useRef(0)
  const shownAt = useRef(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const penaltyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shakeCount = useRef(0)
  const { guard, prime } = useScreenGuard(now)

  const { ranked, overlay, finish } = useRecordFinish<ColorRecord>({
    onFinish,
    rng,
    score: (r) => r.ms,
    worse: 'higher',
    why: whyText,
  })

  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current.length = 0
    if (shakeTimer.current !== null) clearTimeout(shakeTimer.current)
    shakeTimer.current = null
    if (penaltyTimer.current !== null) clearTimeout(penaltyTimer.current)
    penaltyTimer.current = null
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
      setShake(null)
      setPenalty(false)
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
    playSfx('countBeep')
    setP('count')
    later(() => {
      setCd(2)
      playSfx('countBeep')
    }, COUNT_STEP_MS)
    later(() => {
      setCd(1)
      playSfx('countBeep')
    }, COUNT_STEP_MS * 2)
    later(() => {
      qiRef.current = 0
      playSfx('goBeep')
      setQi(0)
      mistakes.current = 0
      t0.current = now()
      shownAt.current = t0.current
      setP('play')
    }, COUNT_STEP_MS * 3)
  }

  const answer = (colorId: string) => {
    if (phaseRef.current !== 'play') return
    const t = now()
    if (t - shownAt.current < INPUT_LOCK_MS) return
    if (colorId !== questions[qiRef.current].ink) {
      mistakes.current += 1
      playSfx('buzz', { gain: 0.6 })
      shakeCount.current += 1
      setShake({ id: colorId, n: shakeCount.current })
      if (shakeTimer.current !== null) clearTimeout(shakeTimer.current)
      shakeTimer.current = setTimeout(() => setShake(null), SHAKE_MS)
      setPenalty(true)
      if (penaltyTimer.current !== null) clearTimeout(penaltyTimer.current)
      penaltyTimer.current = setTimeout(() => setPenalty(false), PENALTY_FLASH_MS)
      return
    }
    if (qiRef.current + 1 >= QUESTION_COUNT) {
      playSfx('record')
      const rec = makeRecord(order[idx], t - t0.current, mistakes.current)
      setRecords((rs) => [...rs, rec])
      setLastRec(rec)
      prime() // 마지막 정답 연타 직후 나타나는 `다음 사람`을 더블탭에서 보호
      setP('done')
      return
    }
    playSfx('note', { pitch: notePitch(qiRef.current) })
    qiRef.current += 1
    shownAt.current = t
    setQi(qiRef.current)
  }

  const next = () => {
    if (phaseRef.current !== 'done') return
    if (idx + 1 >= order.length) {
      finish(records)
      return
    }
    setIdx(idx + 1)
    setLastRec(null)
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

  const q = questions[Math.min(qi, questions.length - 1)]

  return (
    <div className="rg-root">
      <div className="rg-bar">{RULE}</div>
      <div className="rg-turn">👉 {pieceLabel(piece)} 차례예요</div>
      <div className="rg-stage">
        {phase === 'count' && <div className="cg-count">{cd}</div>}
        {phase === 'play' && (
          <>
            <div className="cg-progress-row">
              <span className="cg-progress" data-testid="color-progress">
                {qi + 1} / {QUESTION_COUNT}
              </span>
              <span className="cg-penalty" data-testid="color-penalty" role="status">
                {penalty ? '+1초' : ''}
              </span>
            </div>
            <div
              className="cg-word"
              data-testid="color-word"
              data-ink={q.ink}
              style={{ color: colorById(q.ink).hex }}
            >
              {colorById(q.word).name}
            </div>
            <div className="cg-answers" data-testid="color-answers">
              {COLORS.map((c) => (
                <button
                  // 오답마다 키가 바뀌어 다시 마운트 → 흔들림이 처음부터 재시작
                  key={shake?.id === c.id ? `${c.id}-${shake.n}` : c.id}
                  type="button"
                  data-testid="color-answer"
                  className={'cg-answer' + (shake?.id === c.id ? ' cg-shake' : '')}
                  onPointerDown={() => answer(c.id)}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
                      e.preventDefault()
                      answer(c.id)
                    }
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <span className="cg-dot" aria-hidden="true" style={{ background: c.hex }} />
                  {c.name}
                </button>
              ))}
            </div>
          </>
        )}
        {(phase === 'ready' || phase === 'done') && (
          <div className="cg-rec">
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
