import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { GameProps } from '../types'
import { pieceLabel } from '../../domain/pieces'
import type { Piece } from '../../domain/pieces'
import { defaultRng } from '../../domain/rng'
import type { Rng } from '../../domain/rng'
import { playSfx, startLoop } from '../../platform/sound'
import type { LoopHandle } from '../../platform/sound'
import { haptic } from '../../platform/sdk'
import { NextButton } from '../shared/NextButton'
import { RankList } from '../shared/RankList'
import { useScreenGuard } from '../shared/useScreenGuard'
import { useRecordFinish } from '../shared/useRecordFinish'
import {
  H, W, ROAD_W, START_R, canStart, makePath, makeRecord, recordText, sweep, totalLength,
  traceScore, whyText,
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
  const lastPt = useRef<Point | null>(null)
  const pointerId = useRef<number | null>(null)
  const raf = useRef<number | null>(null)
  const t0 = useRef(0)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const hum = useRef<LoopHandle | null>(null)
  const stopHum = () => {
    hum.current?.stop()
    hum.current = null
  }
  useEffect(() => () => hum.current?.stop(), [])
  // 백그라운드에서 꺼진 웅웅 소리를, 그리던 중이면 돌아올 때 다시 켠다
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'visible' || phaseRef.current !== 'drawing') return
      stopHum()
      hum.current = startLoop('hum')
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])
  const { guard, prime } = useScreenGuard(now)

  const { ranked, overlay, finish } = useRecordFinish<TraceRecord>({
    onFinish,
    rng,
    score: (r) => traceScore(r.progress, r.timeSec),
    worse: 'lower',
    why: whyText,
  })

  // 그리는 동안의 궤적은 ref에 쌓고, 화면 갱신은 프레임당 한 번만
  const cancelFrame = () => {
    if (raf.current !== null) cancelAnimationFrame(raf.current)
    raf.current = null
  }
  useEffect(() => cancelFrame, [])
  const scheduleRender = () => {
    if (raf.current !== null) return
    raf.current = requestAnimationFrame(() => {
      raf.current = null
      setTrail(trailRef.current.slice())
    })
  }

  const setP = (p: Phase) => {
    phaseRef.current = p
    setPhase(p)
  }

  // 화면 좌표 → 논리(viewBox) 좌표. SVG의 실제 변환(레터박스 포함)을 쓰고,
  // getScreenCTM이 없는 환경은 meet 방식(균일 배율 + 중앙 정렬)으로 계산한다.
  const toLocalXY = (clientX: number, clientY: number): Point => {
    const svg = svgRef.current
    const ctm = svg?.getScreenCTM?.()
    if (ctm) {
      const m = ctm.inverse()
      return { x: m.a * clientX + m.c * clientY + m.e, y: m.b * clientX + m.d * clientY + m.f }
    }
    const r = svg?.getBoundingClientRect()
    if (!r || r.width <= 0 || r.height <= 0) return { x: clientX, y: clientY }
    const k = Math.min(r.width / W, r.height / H)
    const ox = r.left + (r.width - W * k) / 2
    const oy = r.top + (r.height - H * k) / 2
    return { x: (clientX - ox) / k, y: (clientY - oy) / k }
  }
  const toLocal = (e: ReactPointerEvent<SVGSVGElement>): Point => toLocalXY(e.clientX, e.clientY)

  const end = (piece: Piece, timeSec: number | null, failAt: Point | null) => {
    const progress = timeSec !== null ? 1 : maxProg.current / total
    const rec = makeRecord(piece, { progress, timeSec, trail: trailRef.current, failAt })
    cancelFrame()
    stopHum()
    // 성공이든 실패든 같은 기록음
    playSfx('record')
    pointerId.current = null
    setRecords((rs) => [...rs, rec])
    setLastRec(rec)
    setTrail(trailRef.current.slice())
    setP('done')
    prime()
    if (timeSec === null) void haptic('tap')
  }

  const onDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (phaseRef.current !== 'ready') return
    const p = toLocal(e)
    if (!canStart(p, path)) return
    guard(() => {
      try {
        svgRef.current?.setPointerCapture?.(e.pointerId)
      } catch {
        /* 일부 환경은 캡처를 지원하지 않는다 */
      }
      pointerId.current = e.pointerId
      t0.current = now()
      maxProg.current = 0
      lastPt.current = p
      trailRef.current = [p]
      setTrail([p])
      setLastRec(null)
      playSfx('goBeep', { gain: 0.6 })
      stopHum()
      hum.current = startLoop('hum')
      setP('drawing')
    })()
  }

  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (phaseRef.current !== 'drawing' || e.pointerId !== pointerId.current) return
    const native = e.nativeEvent as PointerEvent
    const co = typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : []
    const pts =
      co.length > 0 ? co.map((c) => toLocalXY(c.clientX, c.clientY)) : [toLocal(e)]
    const piece = order[idx]
    for (const p of pts) {
      const r = sweep(path, maxProg.current, lastPt.current, p)
      maxProg.current = r.maxProg
      if (!r.ok) {
        trailRef.current.push(r.failAt ?? p)
        end(piece, null, r.failAt ?? p)
        return
      }
      trailRef.current.push(p)
      lastPt.current = p
      if (r.finished) {
        end(piece, (now() - t0.current) / 1000, null)
        return
      }
    }
    hum.current?.set('pitch', 1 + (0.5 * maxProg.current) / total, 0.1)
    scheduleRender()
  }

  const onUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (phaseRef.current !== 'drawing' || e.pointerId !== pointerId.current) return
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
          style={{ aspectRatio: `${W} / ${H}` }}
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
