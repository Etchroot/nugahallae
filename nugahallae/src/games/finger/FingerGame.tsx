import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { GameProps } from '../types'
import { pieceLabel } from '../../domain/pieces'
import { defaultRng } from '../../domain/rng'
import type { Rng } from '../../domain/rng'
import { haptic } from '../../platform/sdk'
import { playSfx } from '../../platform/sound'
import { END_EFFECT_MS } from '../shared/timing'
import {
  ARM_MS,
  addFinger,
  finishSpin,
  initFinger,
  removeFinger,
  spinSchedule,
  startSpin,
} from './logic'
import type { FingerState } from './logic'
import './finger.css'

const RING = 88

interface Pos {
  x: number
  y: number
}

export function FingerGame({
  order,
  onFinish,
  rng = defaultRng,
}: GameProps & { rng?: Rng }) {
  const n = order.length
  const [state, setState] = useState<FingerState>(() => initFinger(n))
  const [pos, setPos] = useState<Record<number, Pos>>({})
  const [lit, setLit] = useState<number | null>(null)
  const [overlay, setOverlay] = useState<string | null>(null)
  const stateRef = useRef(state)
  const areaRef = useRef<HTMLDivElement>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish

  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current.length = 0
  }

  useEffect(() => {
    return clearTimers
  }, [])

  const commit = (next: FingerState) => {
    stateRef.current = next
    setState(next)
  }

  const schedule = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms))
  }

  const arm = () => {
    schedule(() => {
      const spun = startSpin(stateRef.current, rng)
      if (spun === stateRef.current || spun.target === null) return
      commit(spun)
      const target = spun.target
      const steps = spinSchedule(n, target)
      steps.forEach((step, k) => {
        schedule(() => {
          setLit(step.index)
          playSfx('tick')
          if (k === steps.length - 1) conclude()
        }, step.at)
      })
    }, ARM_MS)
  }

  const conclude = () => {
    const done = finishSpin(stateRef.current)
    if (done === stateRef.current || done.targetSlot === null) return
    commit(done)
    const loser = order[done.targetSlot]
    void haptic('error')
    playSfx('loseSting')
    setOverlay(`${pieceLabel(loser)} 찍혔다!`)
    schedule(() => onFinishRef.current(loser), END_EFFECT_MS)
  }

  const place = (e: ReactPointerEvent<HTMLDivElement>): Pos => {
    const rect = areaRef.current?.getBoundingClientRect()
    let x = e.clientX - (rect?.left ?? 0)
    let y = e.clientY - (rect?.top ?? 0)
    const half = RING / 2
    if (rect && rect.width > RING) x = Math.min(Math.max(x, half), rect.width - half)
    if (rect && rect.height > RING) y = Math.min(Math.max(y, half), rect.height - half)
    return { x, y }
  }

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    const prev = stateRef.current
    const next = addFinger(prev, e.pointerId)
    if (next === prev) return
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId)
    } catch {
      /* 캡처 실패는 무시 */
    }
    commit(next)
    if (next.fingers.includes(e.pointerId)) {
      playSfx('pop', { pitch: 1 + (next.slots[e.pointerId] ?? 0) * 0.12 })
      const p = place(e)
      setPos((cur) => ({ ...cur, [e.pointerId]: p }))
    }
    if (next.phase === 'armed' && prev.phase !== 'armed') {
      playSfx('chime')
      arm()
    }
  }

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!stateRef.current.fingers.includes(e.pointerId)) return
    if (stateRef.current.phase === 'done') return
    const p = place(e)
    setPos((cur) => ({ ...cur, [e.pointerId]: p }))
  }

  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const prev = stateRef.current
    const next = removeFinger(prev, e.pointerId)
    if (next === prev) return
    commit(next)
    if (prev.fingers.includes(e.pointerId)) {
      playSfx('pop', { pitch: 0.7 })
      setPos((cur) => {
        const { [e.pointerId]: _gone, ...rest } = cur
        void _gone
        return rest
      })
    }
    if (next.phase === 'waiting' && prev.phase !== 'waiting') {
      clearTimers()
      setLit(null)
    }
  }

  const count = state.fingers.length
  let guide: string | null = null
  if (state.phase === 'done') guide = null
  else if (state.ignored.length > 0) guide = `${n}명만 올려 주세요`
  else if (state.phase === 'waiting')
    guide = count === 0 ? `${n}명 모두 화면에 손가락을 올려요` : `${count}/${n}명`

  const running = state.phase === 'armed' || state.phase === 'spinning'

  return (
    <div className="fg-root">
      <div className="fg-bar">모두 손가락을 올려요! 찍힌 사람이 벌칙</div>
      <div
        ref={areaRef}
        className="fg-area"
        data-testid="finger-area"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onLostPointerCapture={onUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        {guide && (
          <div className="fg-guide" role="status">
            {guide}
          </div>
        )}
        {state.fingers.map((id, i) => {
          const p = pos[id]
          if (!p) return null
          const piece = order[state.slots[id]]
          const isLit = running && state.phase === 'spinning' && lit === i
          const isPicked = state.phase === 'done' && state.target === i
          return (
            <div
              key={id}
              data-testid="finger-ring"
              className={'fg-ring' + (isLit ? ' fg-lit' : '') + (isPicked ? ' fg-picked' : '')}
              style={{ left: p.x - RING / 2, top: p.y - RING / 2, borderColor: piece.color }}
            >
              <span className="fg-emoji">{piece.emoji}</span>
            </div>
          )
        })}
        {overlay && (
          <div className="fg-overlay" role="status">
            {overlay}
          </div>
        )}
      </div>
      <p className="fg-hint">{running ? '손가락을 떼면 다시 시작해요' : ' '}</p>
    </div>
  )
}
