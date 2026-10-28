import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { GameProps } from '../types'
import { pieceLabel } from '../../domain/pieces'
import type { Piece } from '../../domain/pieces'
import { defaultRng } from '../../domain/rng'
import type { Rng } from '../../domain/rng'
import { NextButton } from '../shared/NextButton'
import { RankList } from '../shared/RankList'
import { useScreenGuard } from '../shared/useScreenGuard'
import { useRecordFinish } from '../shared/useRecordFinish'
import { CM_PX, MIN_CM, dragCm, makeRecord, maxTargetCm, pickTarget, recordText, whyText } from './logic'
import type { RulerRecord } from './logic'
import '../shared/record.css'
import './ruler.css'

const RULE = '자 없이 감으로! 가장 많이 틀리면 벌칙'
const AREA_H = 240

type Phase = 'ready' | 'drawing' | 'done'
type Msg = 'none' | 'short' | 'retry'

const viewWidth = () => (typeof window === 'undefined' ? 375 : window.innerWidth || 375)

export function RulerGame({
  order,
  onFinish,
  rng = defaultRng,
  now = () => performance.now(),
}: GameProps & { rng?: Rng; now?: () => number }) {
  const [vw, setVw] = useState(viewWidth)
  const [pickedTarget] = useState(() => pickTarget(rng, maxTargetCm(viewWidth())))
  // 실제 그리는 폭에 안 들어가는 목표는 폭에 맞게 낮춘다
  const target = Math.min(pickedTarget, maxTargetCm(vw))
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>('ready')
  const [records, setRecords] = useState<RulerRecord[]>([])
  const [msg, setMsg] = useState<Msg>('none')
  const [line, setLine] = useState<{ x0: number; x1: number; y: number } | null>(null)
  const phaseRef = useRef<Phase>('ready')
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const lastX = useRef(0)
  const pointerId = useRef<number | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const { guard, prime } = useScreenGuard(now)

  const { ranked, overlay, finish } = useRecordFinish<RulerRecord>({
    onFinish,
    rng,
    score: (r) => r.err,
    worse: 'higher',
    why: whyText,
  })

  const setP = (p: Phase) => {
    phaseRef.current = p
    setPhase(p)
  }

  // 그리는 폭은 SVG가 실제로 차지하는 CSS px로 잡아 1cm = 37.8 보이는 px을 보장한다
  useLayoutEffect(() => {
    const measure = () => {
      const w = svgRef.current?.clientWidth ?? 0
      setVw(w > 0 ? w : viewWidth())
    }
    measure()
    const el = svgRef.current
    let ro: ResizeObserver | null = null
    if (el && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure)
      ro.observe(el)
    }
    window.addEventListener('resize', measure)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  // 백그라운드로 가면 그리던 시도는 무효 → 같은 사람이 다시
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'hidden' || phaseRef.current !== 'drawing') return
      pointerId.current = null
      startRef.current = null
      setLine(null)
      setMsg('retry')
      setP('ready')
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // 화면 좌표 → 논리 좌표(getScreenCTM이 없으면 meet 방식으로 계산)
  const toLocal = (e: ReactPointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    const ctm = svg?.getScreenCTM?.()
    if (ctm) {
      const m = ctm.inverse()
      return { x: m.a * e.clientX + m.c * e.clientY + m.e, y: m.b * e.clientX + m.d * e.clientY + m.f }
    }
    const r = svg?.getBoundingClientRect()
    if (!r || r.width <= 0 || r.height <= 0) return { x: e.clientX, y: e.clientY }
    const k = Math.min(r.width / vw, r.height / AREA_H)
    const ox = r.left + (r.width - vw * k) / 2
    const oy = r.top + (r.height - AREA_H * k) / 2
    return { x: (e.clientX - ox) / k, y: (e.clientY - oy) / k }
  }
  const clampX = (x: number) => Math.min(vw, Math.max(0, x))
  const clampY = (y: number) => Math.min(AREA_H - 8, Math.max(8, y))

  const onDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (phaseRef.current !== 'ready') return
    const p = toLocal(e)
    try {
      svgRef.current?.setPointerCapture?.(e.pointerId)
    } catch {
      /* 일부 환경은 캡처를 지원하지 않는다 */
    }
    pointerId.current = e.pointerId
    startRef.current = { x: clampX(p.x), y: clampY(p.y) }
    lastX.current = startRef.current.x
    setMsg('none')
    setLine({ x0: lastX.current, x1: lastX.current, y: startRef.current.y })
    setP('drawing')
  }

  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (phaseRef.current !== 'drawing' || e.pointerId !== pointerId.current) return
    const s = startRef.current
    if (!s) return
    lastX.current = clampX(toLocal(e).x)
    setLine({ x0: s.x, x1: lastX.current, y: s.y })
  }

  const onUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (phaseRef.current !== 'drawing' || e.pointerId !== pointerId.current) return
    const s = startRef.current
    pointerId.current = null
    startRef.current = null
    if (!s) return
    const x1 = clampX(toLocal(e).x)
    const cm = dragCm(s.x, x1)
    if (cm < MIN_CM) {
      setLine(null)
      setMsg('short')
      setP('ready')
      return
    }
    const rec = makeRecord(order[idx], cm, target)
    // 다음 사람이 따라 그리지 못하게 뗀 즉시 선을 지운다
    setLine(null)
    setRecords((rs) => [...rs, rec])
    setMsg('none')
    setP('done')
    prime()
  }

  // 취소·캡처 상실: 좌표를 믿을 수 없으니 시도를 버리고 같은 사람이 다시
  const onAbort = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (phaseRef.current !== 'drawing' || e.pointerId !== pointerId.current) return
    pointerId.current = null
    startRef.current = null
    setLine(null)
    setMsg('retry')
    setP('ready')
  }

  const next = () => {
    if (phaseRef.current !== 'done') return
    if (idx + 1 >= order.length) {
      finish(records)
      return
    }
    setIdx(idx + 1)
    setLine(null)
    setMsg('none')
    setP('ready')
  }

  const piece: Piece = order[Math.min(idx, order.length - 1)]
  const isLast = idx + 1 >= order.length

  if (ranked) {
    const maxCm = Math.max(target, ...ranked.map((r) => r.cm))
    const barX = 36
    const avail = Math.min(vw, 420) - barX - 16
    const k = Math.min(CM_PX, avail / maxCm)
    const rowH = 32
    const h = (ranked.length + 1) * rowH + 8
    return (
      <div className="rg-root">
        <div className="rg-bar">{RULE}</div>
        <RankList rows={ranked.map((r) => ({ piece: r.piece, text: recordText(r) }))} />
        <svg
          data-testid="ruler-result"
          className="rul-result"
          viewBox={`0 0 ${barX + avail + 16} ${h}`}
          role="img"
          aria-label="정답 길이와 각자 그린 길이 비교"
        >
          <text x={0} y={rowH / 2 + 5} className="rul-label">🎯</text>
          <rect
            data-testid="ruler-target-bar"
            className="rul-target"
            x={barX}
            y={rowH / 2 - 5}
            width={target * k}
            height={10}
            rx={5}
          />
          {ranked.map((r, i) => (
            <g key={r.piece.id}>
              <text x={0} y={(i + 1.5) * rowH + 5} className="rul-label">{r.piece.emoji}</text>
              <rect
                data-testid="ruler-bar"
                className={i === ranked.length - 1 ? 'rul-bar rul-bar-lose' : 'rul-bar'}
                x={barX}
                y={(i + 1.5) * rowH - 5}
                width={r.cm * k}
                height={10}
                rx={5}
              />
            </g>
          ))}
          <line className="rul-guide" x1={barX + target * k} x2={barX + target * k} y1={0} y2={h} />
        </svg>
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
      <div className="rg-stage rul-stage">
        <div className="rul-target-text">{target}cm를 그어 보세요</div>
        <div className="rul-msg">
          {phase === 'done'
            ? '기록했어요'
            : msg === 'short'
              ? '조금 더 길게 그어 주세요'
              : msg === 'retry'
                ? '다시 해 주세요'
                : phase === 'drawing'
                  ? ' '
                  : '빈 곳을 누르고 옆으로 끌어 보세요'}
        </div>
        <svg
          ref={svgRef}
          data-testid="ruler-area"
          className="rul-area"
          width={vw}
          height={AREA_H}
          viewBox={`0 0 ${vw} ${AREA_H}`}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onAbort}
          onLostPointerCapture={onAbort}
          onContextMenu={(e) => e.preventDefault()}
        >
          {line && (
            <>
              <line className="rul-line" x1={line.x0} x2={line.x1} y1={line.y} y2={line.y} />
              <circle className="rul-dot" cx={line.x0} cy={line.y} r={6} />
              <circle className="rul-dot" cx={line.x1} cy={line.y} r={6} />
            </>
          )}
        </svg>
        {records.length > 0 && (
          <ul className="rul-done">
            {records.map((r) => (
              <li key={r.piece.id}>{pieceLabel(r.piece)} 기록 완료</li>
            ))}
          </ul>
        )}
      </div>
      <div className="rg-after">
        {phase === 'done' && <NextButton key="next" last={isLast} onNext={guard(next)} />}
      </div>
    </div>
  )
}
