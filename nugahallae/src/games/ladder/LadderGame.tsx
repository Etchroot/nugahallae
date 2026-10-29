import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, JSX } from 'react'
import { useTapGuard } from '../../app/useTapGuard'
import type { GameProps } from '../types'
import { pieceLabel } from '../../domain/pieces'
import { defaultRng } from '../../domain/rng'
import type { Rng } from '../../domain/rng'
import { haptic } from '../../platform/sdk'
import { playSfx, playTickTrain } from '../../platform/sound'
import type { StopHandle } from '../../platform/sound'
import {
  LEVELS,
  TRACE_MS,
  createLadder,
  currentTracer,
  finishTrace,
  initLadderState,
  startTrace,
  traceLadder,
} from './logic'
import type { Ladder, LadderState } from './logic'
import { END_EFFECT_MS } from '../shared/timing'
import './ladder.css'

// SVG 좌표: 세로줄 간격 100, 한 단계 높이 100
const U = 100
/** 내려가는 동안의 발소리 시각(초): 220ms 간격 고정 */
const STEP_TIMES = Array.from({ length: Math.floor(TRACE_MS / 220) }, (_, k) => 0.1 + (k * 220) / 1000)

const cssVar = (name: string, value: string | number) => ({ [name]: value }) as CSSProperties

function pathOf(l: Ladder, start: number) {
  return traceLadder(l, start)
    .points.map((p, i) => `${i === 0 ? 'M' : 'L'}${(p.x + 0.5) * U} ${p.y * U}`)
    .join(' ')
}

export function LadderGame({
  order,
  onFinish,
  rng = defaultRng,
}: GameProps & { rng?: Rng }) {
  const [ladder] = useState<Ladder>(() => createLadder(order.length, rng))
  const [state, setState] = useState<LadderState>(initLadderState)
  const [overlay, setOverlay] = useState<string | null>(null)

  const guard = useTapGuard()
  const stateRef = useRef(state)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const steps = useRef<StopHandle | null>(null)
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish

  useEffect(() => {
    const list = timers.current
    return () => {
      list.forEach(clearTimeout)
      list.length = 0
      steps.current?.stop()
    }
  }, [])

  const commit = (s: LadderState) => {
    stateRef.current = s
    setState(s)
  }

  const finish = () => {
    const prev = stateRef.current
    const next = finishTrace(prev, ladder, order)
    if (next === prev) return
    commit(next)
    if (next.phase === 'done' && next.loser) {
      const loser = next.loser
      void haptic('error')
      playSfx('loseSting')
      setOverlay(`${pieceLabel(loser)} 벌칙!`)
      timers.current.push(setTimeout(() => onFinishRef.current(loser), END_EFFECT_MS))
    } else {
      void haptic('tap')
      playSfx('success')
    }
  }

  const start = () => {
    const prev = stateRef.current
    const next = startTrace(prev)
    if (next === prev) return
    commit(next)
    // 내려가는 소리는 목적지와 무관하게 늘 같은 박자
    playSfx('whoosh')
    steps.current?.stop()
    steps.current = playTickTrain(STEP_TIMES)
    timers.current.push(setTimeout(finish, TRACE_MS))
  }

  const n = order.length
  const tracer = currentTracer(state, order)
  const tracing = state.phase === 'tracing'
  const cellAt = (col: number) => state.revealed.find((r) => r.col === col)

  const rungLines: JSX.Element[] = []
  ladder.rungs.forEach((row, level) =>
    row.forEach((on, g) => {
      if (!on) return
      const y = (level + 1) * U
      rungLines.push(
        <line key={`${level}-${g}`} x1={(g + 0.5) * U} x2={(g + 1.5) * U} y1={y} y2={y} className="ld-rung" />,
      )
    }),
  )

  return (
    <div className="ld-root">
      <div className="ld-bar">벌칙 칸은 딱 하나! 차례대로 내 동물을 눌러 내려가요</div>
      <div className="ld-turn">
        {state.phase === 'done' ? `${pieceLabel(state.loser ?? tracer)} 걸렸어요` : `👉 ${pieceLabel(tracer)} 차례예요`}
      </div>

      <div className="ld-board" style={cssVar('--ld-cols', n)}>
        <div className="ld-row ld-pieces">
          {order.map((p, i) => (
            <button
              key={p.id}
              type="button"
              className={i === state.turn && state.phase === 'idle' ? 'ld-piece ld-piece-on' : 'ld-piece'}
              style={cssVar('--ld-color', p.color)}
              aria-label={pieceLabel(p)}
              disabled={state.phase !== 'idle' || i !== state.turn}
              onClick={guard(start)}
            >
              <span aria-hidden="true" className="ld-emoji">
                {p.emoji}
              </span>
            </button>
          ))}
        </div>

        <svg
          className="ld-svg"
          viewBox={`0 0 ${n * U} ${(LEVELS + 1) * U}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <clipPath id="ld-wipe-clip">
              <rect className="ld-wipe" x="0" y="0" width={n * U} height={(LEVELS + 1) * U} />
            </clipPath>
          </defs>
          {order.map((p, i) => (
            <line key={p.id} x1={(i + 0.5) * U} x2={(i + 0.5) * U} y1="0" y2={(LEVELS + 1) * U} className="ld-rail" />
          ))}
          {rungLines}
          {state.revealed.map((r) => (
            <path
              key={r.piece.id}
              d={pathOf(ladder, order.indexOf(r.piece))}
              className="ld-path"
              stroke={r.piece.color}
            />
          ))}
          {tracing && (
            <path
              key={`trace-${state.turn}`}
              d={pathOf(ladder, state.turn)}
              className="ld-path"
              stroke={tracer.color}
              clipPath="url(#ld-wipe-clip)"
            />
          )}
        </svg>

        <div className="ld-row ld-cells">
          {order.map((p, c) => {
            const r = cellAt(c)
            return (
              <div
                key={p.id}
                className={r ? (r.bad ? 'ld-cell ld-cell-bad' : 'ld-cell ld-cell-ok') : 'ld-cell'}
                style={r ? cssVar('--ld-color', r.piece.color) : undefined}
              >
                {r ? (
                  <>
                    <span aria-hidden="true" className="ld-emoji">
                      {r.piece.emoji}
                    </span>
                    <span className="ld-cell-text">{r.bad ? '벌칙' : '통과'}</span>
                  </>
                ) : (
                  <span className="ld-cell-text">?</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {overlay && (
        <div className="ld-overlay" role="status">
          {overlay}
        </div>
      )}
    </div>
  )
}
