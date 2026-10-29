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
import { makeRecord, pickSentence, recordText, scoreOf, whyText } from './logic'
import type { TwisterRecord } from './logic'
import '../shared/record.css'
import './twister.css'

const RULE = '틀리면 가장 나쁨! 모두 맞히면 가장 느린 사람이 벌칙'

type Phase = 'ready' | 'reading' | 'judge' | 'done'

export function TwisterGame({
  order,
  onFinish,
  rng = defaultRng,
  now = () => performance.now(),
}: GameProps & { rng?: Rng; now?: () => number }) {
  // 모두 같은 문장(판마다 한 번)
  const [sentence] = useState(() => pickSentence(rng))
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>('ready')
  const [records, setRecords] = useState<TwisterRecord[]>([])
  const [lastRec, setLastRec] = useState<TwisterRecord | null>(null)
  const [retry, setRetry] = useState(false)
  const phaseRef = useRef<Phase>('ready')
  const t0 = useRef(0)
  const elapsedSec = useRef(0)
  const { guard } = useScreenGuard(now)

  const { ranked, overlay, finish } = useRecordFinish<TwisterRecord>({
    onFinish,
    rng,
    score: scoreOf,
    worse: 'higher',
    why: whyText,
  })

  const setP = (p: Phase) => {
    phaseRef.current = p
    setPhase(p)
  }

  // 백그라운드로 가면 읽는 중인 시도는 무효 → 같은 사람이 다시
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'hidden' || phaseRef.current !== 'reading') return
      setRetry(true)
      setP('ready')
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const start = () => {
    if (phaseRef.current !== 'ready') return
    t0.current = now()
    setRetry(false)
    setLastRec(null)
    setP('reading')
  }

  const stop = () => {
    if (phaseRef.current !== 'reading') return
    elapsedSec.current = (now() - t0.current) / 1000
    setP('judge')
  }

  const judge = (ok: boolean) => () => {
    if (phaseRef.current !== 'judge') return
    const rec = makeRecord(order[idx], ok, elapsedSec.current)
    setRecords((rs) => [...rs, rec])
    setLastRec(rec)
    setP('done')
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

  return (
    <div className="rg-root">
      <div className="rg-bar">{RULE}</div>
      <div className="rg-turn">👉 {pieceLabel(piece)} 차례예요</div>
      <div className="rg-stage">
        <p className="tw-sentence">{sentence}</p>
        <div className="tw-note">
          {phase === 'judge' && '맞았는지는 함께 있는 사람들이 판정해요'}
          {phase === 'ready' && retry && '다시 해 주세요'}
          {phase === 'reading' && '소리 내어 읽어요'}
          {phase === 'done' && lastRec ? recordText(lastRec) : null}
        </div>
      </div>
      <div className="rg-after tw-after">
        {phase === 'ready' && (
          <button key="start" type="button" className="rg-btn" onClick={guard(start)}>
            시작
          </button>
        )}
        {phase === 'reading' && (
          <button key="stop" type="button" className="rg-btn" onClick={guard(stop)}>
            다 읽었어요
          </button>
        )}
        {phase === 'judge' && (
          <div key="judge" className="tw-judge">
            <button type="button" className="rg-btn tw-big tw-ok" onClick={guard(judge(true))}>
              성공
            </button>
            <button type="button" className="rg-btn rg-danger tw-big tw-bad" onClick={guard(judge(false))}>
              틀렸어요
            </button>
          </div>
        )}
        {phase === 'done' && <NextButton key="next" last={isLast} onNext={guard(next)} />}
      </div>
    </div>
  )
}
