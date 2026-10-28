import { useEffect, useRef, useState } from 'react'
import { useTapGuard } from '../../app/useTapGuard'
import type { GameProps } from '../types'
import { pieceLabel } from '../../domain/pieces'
import type { Piece } from '../../domain/pieces'
import { defaultRng } from '../../domain/rng'
import type { Rng } from '../../domain/rng'
import { haptic } from '../../platform/sdk'
import {
  currentSpinner,
  initRoulette,
  planSpin,
  resolveSpin,
  startSpin,
} from './logic'
import type { RouletteState } from './logic'
import './roulette.css'

const R = 96
const PASS_OVERLAY_MS = 1200
const FINISH_DELAY_MS = 1000

const point = (deg: number, r: number) => {
  const t = (deg * Math.PI) / 180
  return [r * Math.sin(t), -r * Math.cos(t)] as const
}

function Wheel({ pieces }: { pieces: Piece[] }) {
  const n = pieces.length
  const w = 360 / n
  return (
    <svg viewBox="-100 -100 200 200" className="rl-wheel-svg" aria-hidden="true">
      {pieces.map((p, i) => {
        const mid = (i + 0.5) * w
        const [ex, ey] = point(mid, n === 1 ? 0 : n <= 3 ? 56 : 62)
        let shape
        if (n === 1) {
          shape = <circle r={R} fill={p.color} stroke="#fff" strokeWidth="2" />
        } else {
          const [x1, y1] = point(i * w, R)
          const [x2, y2] = point((i + 1) * w, R)
          const large = w > 180 ? 1 : 0
          shape = (
            <path
              d={`M0 0 L${x1} ${y1} A${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`}
              fill={p.color}
              stroke="#fff"
              strokeWidth="2"
            />
          )
        }
        return (
          <g key={p.id}>
            {shape}
            <text
              x={ex}
              y={ey}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={n <= 4 ? 30 : n <= 7 ? 26 : 22}
              transform={`rotate(${mid} ${ex} ${ey})`}
            >
              {p.emoji}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function RouletteGame({
  order,
  onFinish,
  rng = defaultRng,
}: GameProps & { rng?: Rng }) {
  const [state, setState] = useState<RouletteState>(() => initRoulette(order))
  const [rotation, setRotation] = useState(0)
  const [durationMs, setDurationMs] = useState(0)
  const [passed, setPassed] = useState<Piece | null>(null)

  const guard = useTapGuard()
  const stateRef = useRef(state)
  const rotationRef = useRef(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish

  useEffect(() => {
    const list = timers.current
    return () => {
      list.forEach(clearTimeout)
      list.length = 0
    }
  }, [])

  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms))
  }

  const commit = (s: RouletteState) => {
    stateRef.current = s
    setState(s)
  }

  const spin = () => {
    const cur = stateRef.current
    if (cur.phase !== 'idle') return
    const spinning = startSpin(cur)
    commit(spinning)
    const plan = planSpin(
      rotationRef.current,
      cur.remaining.length,
      rng,
      cur.remaining.length === 2,
    )
    rotationRef.current = plan.targetRotation
    setDurationMs(plan.durationMs)
    setRotation(plan.targetRotation)

    later(() => {
      const next = resolveSpin(spinning, plan.landedIndex)
      setPassed(next.lastPassed)
      void haptic('tap')
      later(() => {
        commit(next)
        setPassed(null)
        const folded = rotationRef.current % 360
        rotationRef.current = folded
        setDurationMs(0)
        setRotation(folded)
        if (next.phase === 'done' && next.loser) {
          const loser = next.loser
          later(() => onFinishRef.current(loser), FINISH_DELAY_MS)
        }
      }, PASS_OVERLAY_MS)
    }, plan.durationMs)
  }

  const spinner = currentSpinner(state, order)
  const spinning = state.phase !== 'idle'

  return (
    <div className="rl-root">
      <div className="rl-bar">
        <span className="rl-rule">걸리면 통과! 마지막까지 남으면 벌칙</span>
        <span className="rl-count">남은 말 {state.remaining.length}개</span>
      </div>

      <div className="rl-turn">👉 {pieceLabel(spinner)} 차례예요</div>

      <div className="rl-stage">
        <div className="rl-pointer" aria-hidden="true" />
        <div
          className="rl-wheel"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition:
              durationMs > 0
                ? `transform ${durationMs}ms cubic-bezier(0.12, 0.7, 0.1, 1)`
                : 'none',
          }}
        >
          <Wheel pieces={state.remaining} />
        </div>
        {passed && (
          <div className="rl-overlay" role="status">
            {pieceLabel(passed)} 통과!
          </div>
        )}
      </div>

      <button type="button" className="rl-spin" disabled={spinning} onClick={guard(spin)}>
        돌리기
      </button>
    </div>
  )
}
