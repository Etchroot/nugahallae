import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { GameProps } from '../types'
import { pieceLabel } from '../../domain/pieces'
import type { Piece } from '../../domain/pieces'
import { defaultRng } from '../../domain/rng'
import type { Rng } from '../../domain/rng'
import { haptic } from '../../platform/sdk'
import { playSfx } from '../../platform/sound'
import { NextButton } from '../shared/NextButton'
import { RankList } from '../shared/RankList'
import { useScreenGuard } from '../shared/useScreenGuard'
import { useRecordFinish } from '../shared/useRecordFinish'
import {
  BALL_D, BALL_X, BALL_Y, BASKET_Y, H, THROWS, W,
  clampPull, flightAnimMs, launchOf, makeRecord, pickBasket, positionAt, recordText, resolveThrow, whyText,
} from './logic'
import type { BasketRecord, Launch, Resolved } from './logic'
import '../shared/record.css'
import './basket.css'

const TICK_MS = 16
/** 공을 잡을 수 있는 범위(논리 좌표) */
const GRAB_R = 60
/** 고무줄 당기는 소리 간격(당긴 길이, 논리 좌표) */
const STRETCH_STEP = 20
const RULE = '3번 던져서 많이 넣기! 가장 적으면 벌칙'

type Phase = 'aim' | 'flying' | 'done'
type Pt = { x: number; y: number }
type Msg = 'hit' | 'miss' | 'retry' | null

const MSG_TEXT: Record<Exclude<Msg, null>, string> = {
  hit: '들어갔어요',
  miss: '아쉬워요',
  retry: '다시 해 주세요',
}

export function BasketGame({
  order,
  onFinish,
  rng = defaultRng,
  now = () => performance.now(),
}: GameProps & { rng?: Rng; now?: () => number }) {
  // 모든 사람이 같은 바구니(판마다 한 번)
  const [basket] = useState(() => pickBasket(rng))
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>('aim')
  const [made, setMade] = useState(0)
  const [thrown, setThrown] = useState(0)
  const [msg, setMsg] = useState<Msg>(null)
  const [records, setRecords] = useState<BasketRecord[]>([])
  const [pull, setPull] = useState<Pt | null>(null)
  const stretch = useRef(0)
  const [ball, setBall] = useState<Pt>({ x: BALL_X, y: BALL_Y })
  const phaseRef = useRef<Phase>('aim')
  const madeRef = useRef(0)
  const thrownRef = useRef(0)
  const pointerId = useRef<number | null>(null)
  /** 마지막 move 위치. 던지기는 이 값으로 정한다(손을 뗄 때의 좌표 흔들림 무시) */
  const lastPull = useRef<Pt | null>(null)
  const interval = useRef<ReturnType<typeof setInterval> | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const { guard, prime } = useScreenGuard(now)

  const { ranked, overlay, finish } = useRecordFinish<BasketRecord>({
    onFinish,
    rng,
    score: (r) => r.made,
    worse: 'lower',
    why: whyText,
  })

  const stopTick = () => {
    if (interval.current !== null) clearInterval(interval.current)
    interval.current = null
  }
  useEffect(() => stopTick, [])

  const setP = (p: Phase) => {
    phaseRef.current = p
    setPhase(p)
  }

  const resetBall = () => {
    setBall({ x: BALL_X, y: BALL_Y })
    setPull(null)
  }

  // 백그라운드로 가면 진행 중인 던지기(당기는 중·비행 중)는 무효 → 같은 사람이 다시
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'hidden') return
      const p = phaseRef.current
      if (p === 'done') return
      const was = pointerId.current !== null || p === 'flying'
      if (!was) return
      stopTick()
      pointerId.current = null
      resetBall()
      setMsg('retry')
      setP('aim')
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // 화면 좌표 → 논리(viewBox) 좌표. getScreenCTM이 없으면 meet 방식으로 계산한다.
  const toLocal = (clientX: number, clientY: number): Pt => {
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

  const landThrow = (success: boolean) => {
    stopTick()
    thrownRef.current += 1
    if (success) madeRef.current += 1
    setThrown(thrownRef.current)
    setMade(madeRef.current)
    setMsg(success ? 'hit' : 'miss')
    // 성공 여부는 던질 때 이미 정해지지만, 소리는 착지할 때 낸다
    playSfx(success ? 'basket.swish' : 'basket.rim')
    if (success) void haptic('tap')
    resetBall()
    if (thrownRef.current >= THROWS) {
      setRecords((rs) => [...rs, makeRecord(order[idx], madeRef.current)])
      prime()
      setP('done')
    } else {
      setP('aim')
    }
  }

  const fly = (l: Launch, res: Resolved) => {
    const ms = flightAnimMs(res.tEnd)
    const t0 = now()
    setPull(null)
    setP('flying')
    interval.current = setInterval(() => {
      const elapsed = now() - t0
      if (elapsed >= ms) {
        landThrow(res.success)
        return
      }
      setBall(positionAt(l, (elapsed / ms) * res.tEnd))
    }, TICK_MS)
  }

  const abortAim = () => {
    pointerId.current = null
    resetBall()
  }

  const onDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (phaseRef.current !== 'aim' || pointerId.current !== null) return
    const p = toLocal(e.clientX, e.clientY)
    if (Math.hypot(p.x - BALL_X, p.y - BALL_Y) > GRAB_R) return
    try {
      svgRef.current?.setPointerCapture?.(e.pointerId)
    } catch {
      /* 일부 환경은 캡처를 지원하지 않는다 */
    }
    pointerId.current = e.pointerId
    lastPull.current = p
    stretch.current = 0
    playSfx('tapSoft')
    setMsg(null)
    setPull(p)
  }

  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (phaseRef.current !== 'aim' || e.pointerId !== pointerId.current) return
    const p = toLocal(e.clientX, e.clientY)
    lastPull.current = p
    // 당긴 길이(화면에 보이는 만큼)가 한 칸 늘 때마다 낮은 딸깍
    const c = clampPull(p.x - BALL_X, p.y - BALL_Y)
    const step = Math.floor(Math.hypot(c.dx, c.dy) / STRETCH_STEP)
    if (step !== stretch.current) {
      if (step > stretch.current) playSfx('tick', { pitch: 0.4 + step * 0.08 })
      stretch.current = step
    }
    setPull(p)
  }

  const onUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (phaseRef.current !== 'aim' || e.pointerId !== pointerId.current) return
    // up 좌표는 쓰지 않는다: 미리보기에 보인 마지막 move 위치로 던진다
    const p = lastPull.current ?? { x: BALL_X, y: BALL_Y }
    pointerId.current = null
    const l = launchOf(p.x - BALL_X, p.y - BALL_Y)
    if (!l) {
      resetBall()
      return
    }
    playSfx('whoosh')
    fly(l, resolveThrow(l, basket))
  }

  const onCancel = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (phaseRef.current !== 'aim' || e.pointerId !== pointerId.current) return
    abortAim()
  }

  const next = () => {
    if (phaseRef.current !== 'done') return
    if (idx + 1 >= order.length) {
      finish(records)
      return
    }
    madeRef.current = 0
    thrownRef.current = 0
    setMade(0)
    setThrown(0)
    setMsg(null)
    setIdx(idx + 1)
    setP('aim')
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

  // 당기는 동안: 공이 손가락을 따라오고(최대 길이 제한) 예상 궤적을 점선으로 보여 준다
  let drawBall = ball
  const preview: Pt[] = []
  if (phase === 'aim' && pull) {
    const c = clampPull(pull.x - BALL_X, pull.y - BALL_Y)
    drawBall = { x: BALL_X + c.dx, y: BALL_Y + c.dy }
    const l = launchOf(pull.x - BALL_X, pull.y - BALL_Y)
    if (l) {
      const tEnd = resolveThrow(l, basket).tEnd
      for (let i = 0; i <= 16; i++) preview.push(positionAt(l, (tEnd * i) / 16))
    }
  }

  const half = basket.width / 2
  const rimL = basket.x - half
  const rimR = basket.x + half

  return (
    <div className="rg-root">
      <div className="rg-bar">{RULE}</div>
      <div className="rg-turn">👉 {pieceLabel(piece)} 차례예요</div>
      <div className="rg-stage bk-stage">
        <div className="bk-info">
          <span className="bk-count">{`${made}/${THROWS}`}</span>
          <span className="bk-msg">{msg ? MSG_TEXT[msg] : ' '}</span>
          <span className="bk-step">{thrown < THROWS ? `${thrown + 1}번째 던지기` : '던지기 끝'}</span>
        </div>
        <svg
          ref={svgRef}
          data-testid="basket-area"
          className="bk-area"
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          style={{ aspectRatio: `${W} / ${H}` }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onCancel}
          onLostPointerCapture={onCancel}
          onContextMenu={(e) => e.preventDefault()}
        >
          <path
            className="bk-basket"
            d={`M${rimL} ${BASKET_Y} L${rimL + 8} ${BASKET_Y + 46} L${rimR - 8} ${BASKET_Y + 46} L${rimR} ${BASKET_Y} Z`}
          />
          <line className="bk-rim" x1={rimL} x2={rimR} y1={BASKET_Y} y2={BASKET_Y} />
          {preview.length > 1 && (
            <polyline
              className="bk-preview"
              points={preview.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
            />
          )}
          {phase === 'aim' && pull && (
            <line className="bk-pull" x1={BALL_X} y1={BALL_Y} x2={drawBall.x} y2={drawBall.y} />
          )}
          <circle className="bk-ball" cx={drawBall.x} cy={drawBall.y} r={BALL_D / 2} />
        </svg>
      </div>
      <div className="rg-after">
        {phase === 'done' && <NextButton key="next" last={isLast} onNext={guard(next)} />}
      </div>
    </div>
  )
}
