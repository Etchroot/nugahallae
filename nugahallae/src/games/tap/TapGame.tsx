import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'
import { pieceLabel } from '../../domain/pieces'
import type { Piece } from '../../domain/pieces'
import { defaultRng } from '../../domain/rng'
import type { Rng } from '../../domain/rng'
import { playSfx } from '../../platform/sound'
import { NextButton } from '../shared/NextButton'
import { RankList } from '../shared/RankList'
import { useScreenGuard } from '../shared/useScreenGuard'
import { useRecordFinish } from '../shared/useRecordFinish'
import {
  COUNT_STEP_MS, DURATION_MS, GO_AT_MS, beginGo, endRound, initRound, recordText, startCountdown,
  tapPad, whyText,
} from './logic'
import type { RoundState } from './logic'
import '../shared/record.css'
import './tap.css'

interface Row {
  piece: Piece
  v: number
}

export function TapGame({
  order,
  onFinish,
  rng = defaultRng,
  now = () => performance.now(),
}: GameProps & { rng?: Rng; now?: () => number }) {
  const [idx, setIdx] = useState(0)
  const [round, setRound] = useState<RoundState>(initRound)
  const [cd, setCd] = useState<number | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const roundRef = useRef(round)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const t0 = useRef(0)
  const voided = useRef(false)
  const idxRef = useRef(0)
  const [retry, setRetry] = useState(false)
  const { guard, prime } = useScreenGuard(now)

  const { ranked, overlay, finish } = useRecordFinish<Row>({
    onFinish,
    rng,
    score: (r) => r.v,
    worse: 'lower',
    why: (r) => whyText(r.v),
  })

  useEffect(() => {
    const list = timers.current
    return () => {
      list.forEach(clearTimeout)
      list.length = 0
    }
  }, [])

  const commit = (s: RoundState) => {
    roundRef.current = s
    setRound(s)
  }
  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms))
  }

  // 5초 연타 구간 동안 화면이 숨겨지면(백그라운드) 그 시도는 무효로 한다
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && roundRef.current.phase === 'go') voided.current = true
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const finishWindow = () => {
    const remain = DURATION_MS - (now() - t0.current)
    if (remain > 0) {
      // 타이머가 일찍 발화했다: 남은 시간만큼 다시 건다
      later(finishWindow, remain)
      return
    }
    if (voided.current) {
      voided.current = false
      setRetry(true)
      setCd(null)
      commit(initRound())
      return
    }
    const done = endRound(roundRef.current)
    commit(done)
    // 끝 신호는 몇 번 눌렀든 같다
    playSfx('tap.whistle')
    setRows((rs) => [...rs, { piece: order[idxRef.current], v: done.count }])
  }

  const start = () => {
    const cur = roundRef.current
    if (cur.phase !== 'idle') return
    setRetry(false)
    voided.current = false
    commit(startCountdown(cur))
    setCd(3)
    playSfx('countBeep')
    later(() => {
      setCd(2)
      playSfx('countBeep')
    }, COUNT_STEP_MS)
    later(() => {
      setCd(1)
      playSfx('countBeep')
    }, COUNT_STEP_MS * 2)
    later(() => {
      setCd(null)
      playSfx('goBeep')
      t0.current = now()
      commit(beginGo(roundRef.current))
      later(finishWindow, DURATION_MS)
    }, GO_AT_MS)
  }

  const press = () => {
    const cur = roundRef.current
    if (cur.phase === 'idle') {
      guard(start)()
    } else if (cur.phase === 'go') {
      commit(tapPad(cur))
      playSfx('pop', { pitch: 0.95 + Math.random() * 0.1 })
      prime() // 연타 직후 나타나는 `다음 사람` 버튼을 더블탭에서 보호
    }
  }

  const next = () => {
    if (roundRef.current.phase !== 'done') return
    if (idx + 1 >= order.length) {
      finish(rows)
      return
    }
    idxRef.current = idx + 1
    setIdx(idx + 1)
    setCd(null)
    commit(initRound())
  }

  const piece = order[Math.min(idx, order.length - 1)]

  if (ranked) {
    return (
      <div className="rg-root">
        <div className="rg-bar">5초 동안 연타! 가장 적으면 벌칙</div>
        <RankList rows={ranked.map((r) => ({ piece: r.piece, text: recordText(r.v) }))} />
        {overlay && (
          <div className="rg-overlay" role="status">
            {overlay}
          </div>
        )}
      </div>
    )
  }

  const label =
    round.phase === 'idle'
      ? '탭해서 시작'
      : round.phase === 'count'
        ? String(cd ?? '')
        : round.phase === 'go'
          ? String(round.count)
          : `${round.count}회 끝!`

  return (
    <div className="rg-root">
      <div className="rg-bar">5초 동안 연타! 가장 적으면 벌칙</div>
      <div className="rg-turn">👉 {pieceLabel(piece)} 차례예요</div>
      <div className="rg-stage">
        <button
          key={idx}
          type="button"
          data-testid="pad"
          className={'tp-pad tp-' + round.phase}
          onPointerDown={press}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
              e.preventDefault()
              press()
            }
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {label}
        </button>
        <p className="tp-retry" role="status">
          {retry ? '다시 해 주세요' : ''}
        </p>
        <div className="tp-bar" aria-hidden="true">
          <i
            key={idx + '-' + (round.phase === 'go' ? 'run' : 'idle')}
            className={round.phase === 'go' ? 'tp-run' : round.phase === 'done' ? 'tp-full' : undefined}
            style={round.phase === 'go' ? { animationDuration: `${DURATION_MS}ms` } : undefined}
          />
        </div>
      </div>
      <div className="rg-after">
        {round.phase === 'done' && (
          <NextButton key="next" last={idx + 1 >= order.length} onNext={guard(next)} />
        )}
      </div>
    </div>
  )
}
