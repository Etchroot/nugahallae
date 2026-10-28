import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'
import { pieceLabel } from '../../domain/pieces'
import type { Piece } from '../../domain/pieces'
import { defaultRng } from '../../domain/rng'
import type { Rng } from '../../domain/rng'
import { NextButton } from '../shared/NextButton'
import { RankList } from '../shared/RankList'
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
  now,
}: GameProps & { rng?: Rng; now?: () => number }) {
  const [idx, setIdx] = useState(0)
  const [round, setRound] = useState<RoundState>(initRound)
  const [cd, setCd] = useState<number | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const roundRef = useRef(round)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

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

  const press = () => {
    const cur = roundRef.current
    if (cur.phase === 'idle') {
      commit(startCountdown(cur))
      setCd(3)
      later(() => setCd(2), COUNT_STEP_MS)
      later(() => setCd(1), COUNT_STEP_MS * 2)
      later(() => {
        setCd(null)
        commit(beginGo(roundRef.current))
      }, GO_AT_MS)
      later(() => {
        const done = endRound(roundRef.current)
        commit(done)
        setRows((rs) => [...rs, { piece: order[idx], v: done.count }])
      }, GO_AT_MS + DURATION_MS)
    } else if (cur.phase === 'go') {
      commit(tapPad(cur))
    }
  }

  const next = () => {
    if (roundRef.current.phase !== 'done') return
    if (idx + 1 >= order.length) {
      finish(rows)
      return
    }
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
          <NextButton key="next" last={idx + 1 >= order.length} onNext={next} now={now} />
        )}
      </div>
    </div>
  )
}
