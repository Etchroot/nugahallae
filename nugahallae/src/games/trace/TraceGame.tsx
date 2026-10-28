import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { GameProps } from '../types'
import { pieceLabel } from '../../domain/pieces'
import type { Piece } from '../../domain/pieces'
import { defaultRng } from '../../domain/rng'
import type { Rng } from '../../domain/rng'
import { haptic } from '../../platform/sdk'
import { NextButton } from '../shared/NextButton'
import { RankList } from '../shared/RankList'
import { useScreenGuard } from '../shared/useScreenGuard'
import { useRecordFinish } from '../shared/useRecordFinish'
import {
  H, W, ROAD_W, START_R, inStartCircle, isInsideRoad, makePath, makeRecord, nextMaxProgress,
  progressDist, reachedFinish, recordText, totalLength, traceScore, whyText,
} from './logic'
import type { Point, TraceRecord } from './logic'
import '../shared/record.css'
import './trace.css'

type Phase = 'ready' | 'drawing' | 'done'

const RULE = '벽에 닿으면 끝! 가장 짧게 가면 벌칙'

const toPoints = (pts: Point[]) => pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

export function TraceGame({
  order,
  onFinish,
  rng = defaultRng,
  now = () => performance.now(),
}: GameProps & { rng?: Rng; now?: () => number }) {
  const [path] = useState(() => makePath(rng))
  const total = useRef(totalLength(path)).current
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>('ready')
  const [records, setRecords] = useState<TraceRecord[]>([])
  const [lastRec, setLastRec] = useState<TraceRecord | null>(null)
  const [trail, setTrail] = useState<Point[]>([])
  const phaseRef = useRef<Phase>('ready')
  const trailRef = useRef<Point[]>([])
  const maxProg = useRef(0)
  const t0 = useRef(0)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const { guard, prime } = useScreenGuard(now)

  const { ranked, overlay, finish } = useRecordFinish<TraceRecord>({
    onFinish,
    rng,
    score: (r) => traceScore(r.progress, r.timeSec),
    worse: 'lower',
    why: whyText,
  })

  const setP = (p: Phase) => {
    phaseRef.current = p
    setPhase(p)
  }

  const toLocal = (e: ReactPointerEvent<SVGSVGElement>): Point => {
    const r = svgRef.current?.getBoundingClientRect()
    const sx = r && r.width > 0 ? W / r.width : 1
    const sy = r && r.height > 0 ? H / r.height : 1
    return { x: (e.clientX - (r?.left ?? 0)) * sx, y: (e.clientY - (r?.top ?? 0)) * sy }
  }

  const end = (piece: Piece, timeSec: number | null, failAt: Point | null) => {
    const progress = timeSec !== null ? 1 : maxProg.current / total
    const rec = makeRecord(piece, { progress, timeSec, trail: trailRef.current, failAt })
    setRecords((rs) => [...rs, rec])
    setLastRec(rec)
    setTrail(trailRef.current)
    setP('done')
    prime()
    if (timeSec === null) void haptic('tap')
  }

  const addPoint = (p: Point) => {
    trailRef.current = [...trailRef.current, p]
    setTrail(trailRef.current)
  }

  const onDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (phaseRef.current !== 'ready') return
    const p = toLocal(e)
    if (!inStartCircle(p, path)) return
    guard(() => {
      try {
        svgRef.current?.setPointerCapture?.(e.pointerId)
      } catch {
        /* 일부 환경은 캡처를 지원하지 않는다 */
      }
      t0.current = now()
      maxProg.current = 0
      trailRef.current = [p]
      setTrail(trailRef.current)
      setLastRec(null)
      setP('drawing')
    })()
  }

  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (phaseRef.current !== 'drawing') return
    const p = toLocal(e)
    const piece = order[idx]
    addPoint(p)
    if (!isInsideRoad(p, path)) {
      end(piece, null, p)
      return
    }
    maxProg.current = nextMaxProgress(maxProg.current, progressDist(p, path))
    if (reachedFinish(p, path)) {
      maxProg.current = total
      end(piece, (now() - t0.current) / 1000, null)
    }
  }

  const onUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (phaseRef.current !== 'drawing') return
    end(order[idx], null, toLocal(e))
  }

  const next = () => {
    if (phaseRef.current !== 'done') return
    if (idx + 1 >= order.length) {
      finish(records)
      return
    }
    setIdx(idx + 1)
    setLastRec(null)
    trailRef.current = []
    setTrail([])
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

  const start = path[0]
  const endPt = path[path.length - 1]
  const failAt = phase === 'done' ? lastRec?.failAt : null

  return (
    <div className="rg-root">
      <div className="rg-bar">{RULE}</div>
      <div className="rg-turn">👉 {pieceLabel(piece)} 차례예요</div>
      <div className="rg-stage tr-stage">
        <div className="tr-hint">
          {phase === 'ready' && '시작 원에 손가락을 올리고 따라가요'}
          {phase === 'drawing' && '벽에 닿지 않게 쭉 따라가요'}
          {phase === 'done' && lastRec ? recordText(lastRec) : null}
          {phase === 'done' && !lastRec ? ' ' : null}
        </div>
        <svg
          ref={svgRef}
          data-testid="trace-area"
          className="tr-area"
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onContextMenu={(e) => e.preventDefault()}
        >
          <polyline className="tr-wall" points={toPoints(path)} strokeWidth={ROAD_W + 8} />
          <polyline className="tr-road" points={toPoints(path)} strokeWidth={ROAD_W} />
          <polyline className="tr-center" points={toPoints(path)} />
          <line
            className="tr-finish"
            x1={Math.max(0, endPt.x - ROAD_W / 2)}
            x2={Math.min(W, endPt.x + ROAD_W / 2)}
            y1={endPt.y}
            y2={endPt.y}
          />
          <circle className="tr-start" cx={start.x} cy={start.y} r={START_R} />
          <text className="tr-start-label" x={start.x} y={start.y + 5} textAnchor="middle">
            시작
          </text>
          <text className="tr-finish-label" x={endPt.x} y={Math.min(H - 6, endPt.y + 24)} textAnchor="middle">
            도착
          </text>
          {trail.length > 1 && <polyline className="tr-trail" points={toPoints(trail)} />}
          {failAt && (
            <g aria-label="실패 지점" transform={`translate(${failAt.x} ${failAt.y})`}>
              <path className="tr-x" d="M-9 -9L9 9M9 -9L-9 9" />
            </g>
          )}
        </svg>
      </div>
      <div className="rg-after">
        {phase === 'done' && <NextButton key="next" last={isLast} onNext={guard(next)} />}
      </div>
    </div>
  )
}
