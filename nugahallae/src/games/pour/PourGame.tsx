import { useEffect, useRef, useState } from 'react'
import { useTapGuard } from '../../app/useTapGuard'
import type { GameProps } from '../types'
import { pieceLabel } from '../../domain/pieces'
import { defaultRng } from '../../domain/rng'
import type { Rng } from '../../domain/rng'
import { haptic } from '../../platform/sdk'
import {
  CAP,
  DROP,
  POUR_RATE,
  TAP_MS,
  addWater,
  canPass,
  currentPourer,
  domeLevel,
  initPour,
  isTrembling,
  passTurn,
} from './logic'
import type { PourState } from './logic'
import { END_EFFECT_MS } from '../shared/timing'
import './pour.css'

const PASS_LOCK_MS = 400
// 한 프레임에 부을 수 있는 최대 시간(앱이 백그라운드에 갔다 와도 한꺼번에 붓지 않게)
const MAX_STEP_MS = 100

// 잔 모양(viewBox 200x260): 입구 y=50, 바닥 y=230
const RIM_Y = 50
const BOTTOM_Y = 230
const CUP_PATH = 'M40 50 L160 50 L146 230 L54 230 Z'

interface Press {
  start: number
  last: number
  domed: boolean
  poured: number
}

export function PourGame({
  order,
  onFinish,
  rng = defaultRng,
}: GameProps & { rng?: Rng }) {
  const [state, setState] = useState<PourState>(() => initPour(rng))
  const [pouring, setPouring] = useState(false)
  const [overlay, setOverlay] = useState<string | null>(null)

  const guard = useTapGuard()
  const stateRef = useRef(state)
  const rafRef = useRef<number | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const pressRef = useRef<Press | null>(null)
  const lockUntil = useRef(Number.NEGATIVE_INFINITY)
  const stopListen = useRef<(() => void) | null>(null)
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish

  const commit = (s: PourState) => {
    stateRef.current = s
    setState(s)
  }

  const endPress = () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    pressRef.current = null
    stopListen.current?.()
    stopListen.current = null
  }

  useEffect(() => {
    const list = timers.current
    return () => {
      list.forEach(clearTimeout)
      list.length = 0
      endPress()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const apply = (amount: number) => {
    const prev = stateRef.current
    const next = addWater(prev, amount, order)
    if (next === prev) return
    commit(next)
    if (next.phase === 'spilled') {
      endPress()
      setPouring(false)
      void haptic('error')
      const loser = next.loser
      if (loser) {
        setOverlay(`${pieceLabel(loser)} 넘쳤다!`)
        timers.current.push(setTimeout(() => onFinishRef.current(loser), END_EFFECT_MS))
      }
      return
    }
    const press = pressRef.current
    if (press && !press.domed && prev.volume <= CAP && next.volume > CAP) {
      press.domed = true
      void haptic('tap')
    }
  }

  const accrue = (press: Press, now: number) => {
    const from = Math.max(press.last, press.start + TAP_MS)
    if (now <= from) return
    press.last = now
    const amount = (Math.min(now - from, MAX_STEP_MS) / 1000) * POUR_RATE
    press.poured += amount
    apply(amount)
  }

  const tick = () => {
    const press = pressRef.current
    if (!press) return
    accrue(press, performance.now())
    if (pressRef.current) rafRef.current = requestAnimationFrame(tick)
  }

  const onDown = () => {
    if (pressRef.current) return
    if (stateRef.current.phase !== 'playing') return
    const now = performance.now()
    if (now < lockUntil.current) return
    pressRef.current = { start: now, last: now, domed: false, poured: 0 }
    setPouring(true)
    const up = () => {
      const press = pressRef.current
      if (!press) return
      const t = performance.now()
      if (t - press.start > TAP_MS) accrue(press, t)
      // 짧은 탭이거나, 첫 프레임 전에 뗀 경우에도 한 방울은 붓는다.
      if (pressRef.current && press.poured < DROP) apply(DROP)
      endPress()
      setPouring(false)
    }
    const hidden = () => {
      if (document.visibilityState === 'hidden') cancel()
    }
    // 백그라운드/포커스 이탈: 붓던 것을 멈춘다(추가로 붓지 않음).
    const cancel = () => {
      endPress()
      setPouring(false)
    }
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    window.addEventListener('blur', cancel)
    document.addEventListener('visibilitychange', hidden)
    stopListen.current = () => {
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      window.removeEventListener('blur', cancel)
      document.removeEventListener('visibilitychange', hidden)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  const pass = () => {
    const cur = stateRef.current
    if (!canPass(cur)) return
    // 두 번째 손가락 등으로 누르는 중에 넘기면 붓기를 끝내고 넘긴다(다음 사람에게 이어지지 않게).
    endPress()
    setPouring(false)
    lockUntil.current = performance.now() + PASS_LOCK_MS
    commit(passTurn(cur))
  }

  const pourer = currentPourer(state, order)
  const spilled = state.phase === 'spilled'
  const dome = domeLevel(state.volume)
  const fill = Math.min(state.volume, CAP) / CAP
  const levelY = BOTTOM_Y - (BOTTOM_Y - RIM_Y) * fill
  const trembling = pouring && isTrembling(state)

  return (
    <div className="pr-root">
      <div className="pr-bar">꾹 누르면 붓고, 떼면 멈춰요. 넘치게 하면 벌칙!</div>
      <div className="pr-turn">👉 {pieceLabel(pourer)} 차례예요</div>

      <div className="pr-stage">
        <button
          type="button"
          className="pr-cup"
          aria-label="잔, 꾹 눌러서 붓기"
          disabled={spilled}
          data-volume={Math.round(state.volume)}
          onPointerDown={onDown}
          onContextMenu={(e) => e.preventDefault()}
        >
          <svg viewBox="0 0 200 260" className="pr-cup-svg" aria-hidden="true">
            <defs>
              <clipPath id="pr-clip">
                <path d={CUP_PATH} />
              </clipPath>
            </defs>
            <ellipse cx="100" cy="240" rx="70" ry="10" fill="rgba(25,31,40,0.12)" />
            <path d={CUP_PATH} fill="rgba(255,255,255,0.7)" />
            <g clipPath="url(#pr-clip)">
              <rect x="0" y={levelY} width="200" height={BOTTOM_Y - levelY + 2} fill="#4aa8ff" />
              <rect x="0" y={levelY} width="200" height="4" fill="#8fcaff" />
            </g>
            {dome > 0 && (
              <path
                className={trembling ? 'pr-dome pr-tremble' : 'pr-dome'}
                d={`M40 ${RIM_Y} Q100 ${RIM_Y - 64 * dome} 160 ${RIM_Y} Z`}
                fill="#4aa8ff"
                stroke="#8fcaff"
                strokeWidth="2"
              />
            )}
            <path d={CUP_PATH} fill="none" stroke="#8b95a1" strokeWidth="5" strokeLinejoin="round" />
            <path d="M52 64 L60 210" stroke="rgba(255,255,255,0.9)" strokeWidth="5" strokeLinecap="round" />
            {spilled && (
              <g>
                <path className="pr-stream" d="M38 52 Q28 110 34 190" stroke="#4aa8ff" strokeWidth="8" fill="none" strokeLinecap="round" />
                <path className="pr-stream" d="M162 52 Q172 110 166 190" stroke="#4aa8ff" strokeWidth="8" fill="none" strokeLinecap="round" />
                <ellipse className="pr-puddle" cx="100" cy="240" rx="92" ry="12" fill="#4aa8ff" />
              </g>
            )}
          </svg>
        </button>
        {overlay && (
          <div className="pr-overlay" role="status">
            {overlay}
          </div>
        )}
      </div>

      <p className="pr-hint">살짝 탭하면 한 방울, 꾹 누르면 콸콸</p>
      <button type="button" className="pr-pass" disabled={!canPass(state)} onClick={guard(pass)}>
        다음 사람에게 넘기기
      </button>
    </div>
  )
}
