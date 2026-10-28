import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'
import { pieceLabel } from '../../domain/pieces'
import type { Piece } from '../../domain/pieces'
import { defaultRng } from '../../domain/rng'
import type { Rng } from '../../domain/rng'
import { useTapGuard } from '../../app/useTapGuard'
import { NextButton } from '../shared/NextButton'
import { RankList } from '../shared/RankList'
import { useRecordFinish } from '../shared/useRecordFinish'
import { FOUL, pickWait, recordText, whyText } from './logic'
import '../shared/record.css'
import './reaction.css'

interface Row {
  piece: Piece
  v: number
}

type PadState = 'idle' | 'wait' | 'go' | 'done' | 'foul'

const PAD_TEXT: Record<PadState, string> = {
  idle: '탭해서 준비',
  wait: '초록색이 되면 탭!',
  go: '지금!!',
  done: '',
  foul: '부정출발! 🚫',
}

export function ReactionGame({
  order,
  onFinish,
  rng = defaultRng,
  now = () => performance.now(),
}: GameProps & { rng?: Rng; now?: () => number }) {
  const [idx, setIdx] = useState(0)
  const [pad, setPad] = useState<PadState>('idle')
  const [ms, setMs] = useState(0)
  const [rows, setRows] = useState<Row[]>([])
  const padRef = useRef<PadState>('idle')
  const t0 = useRef(0)
  const waitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 준비 탭과 부정출발 탭이 한 번의 더블탭으로 겹치지 않게 한다. 초록 이후 탭은 가드 없이 즉시 측정한다.
  const guard = useTapGuard(now)

  const { ranked, overlay, finish } = useRecordFinish<Row>({
    onFinish,
    rng,
    score: (r) => r.v,
    worse: 'higher',
    why: (r) => whyText(r.v),
  })

  useEffect(
    () => () => {
      if (waitTimer.current !== null) clearTimeout(waitTimer.current)
    },
    [],
  )

  const setP = (p: PadState) => {
    padRef.current = p
    setPad(p)
  }

  const record = (v: number) => setRows((rs) => [...rs, { piece: order[idx], v }])

  const press = () => {
    const cur = padRef.current
    if (cur === 'go') {
      const v = Math.round(now() - t0.current)
      setMs(v)
      setP('done')
      record(v)
    } else if (cur === 'idle') {
      guard(() => {
        setP('wait')
        waitTimer.current = setTimeout(() => {
          waitTimer.current = null
          t0.current = now()
          setP('go')
        }, pickWait(rng))
      })()
    } else if (cur === 'wait') {
      guard(() => {
        if (waitTimer.current !== null) clearTimeout(waitTimer.current)
        waitTimer.current = null
        setP('foul')
        record(FOUL)
      })()
    }
  }

  const next = () => {
    if (padRef.current !== 'done' && padRef.current !== 'foul') return
    if (idx + 1 >= order.length) {
      finish(rows)
      return
    }
    setIdx(idx + 1)
    setP('idle')
  }

  const piece = order[Math.min(idx, order.length - 1)]
  const finished = pad === 'done' || pad === 'foul'

  if (ranked) {
    return (
      <div className="rg-root">
        <div className="rg-bar">초록색이 되면 탭! 가장 느리면 벌칙</div>
        <RankList rows={ranked.map((r) => ({ piece: r.piece, text: recordText(r.v) }))} />
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
      <div className="rg-bar">초록색이 되면 탭! 가장 느리면 벌칙</div>
      <div className="rg-turn">👉 {pieceLabel(piece)} 차례예요</div>
      <div className="rg-stage">
        <button
          type="button"
          data-testid="pad"
          data-state={pad}
          className={'rc-pad rc-' + pad}
          onPointerDown={press}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
              e.preventDefault()
              press()
            }
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {pad === 'done' ? `${ms} ms` : PAD_TEXT[pad]}
        </button>
      </div>
      <div className="rg-after">
        {finished && <NextButton last={idx + 1 >= order.length} onNext={next} now={now} />}
      </div>
    </div>
  )
}
