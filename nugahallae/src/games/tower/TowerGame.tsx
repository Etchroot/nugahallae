import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { GameProps } from '../types'
import { pieceLabel } from '../../domain/pieces'
import { defaultRng } from '../../domain/rng'
import type { Rng } from '../../domain/rng'
import { haptic } from '../../platform/sdk'
import { playSfx } from '../../platform/sound'
import { COLS, ROWS, TOP, initTower, pullBlock } from './logic'
import type { TowerState } from './logic'
import { END_EFFECT_MS } from '../shared/timing'
import './tower.css'

const MESSAGES = {
  top: '맨 윗줄은 뺄 수 없어요',
  last: '이 줄의 마지막 블록은 못 빼요',
} as const

/** 무너질 때 블록마다 흩어지는 방향·거리. rng로 만들어 테스트가 결정적이다 */
function scatter(rng: Rng): CSSProperties[] {
  const dir = rng() < 0.5 ? -1 : 1
  const out: CSSProperties[] = []
  for (let r = ROWS - 1; r >= 0; r--) {
    for (let i = 0; i < COLS; i++) {
      const dx = dir * (40 + rng() * 160) * (r / ROWS + 0.3)
      const dy = 20 + rng() * 100 + (ROWS - r) * 4
      const rot = dir * (30 + rng() * 130)
      out.push({ transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`, opacity: 0.85 })
    }
  }
  return out
}

export function TowerGame({
  order,
  onFinish,
  rng = defaultRng,
}: GameProps & { rng?: Rng }) {
  const [state, setState] = useState<TowerState>(initTower)
  const [msg, setMsg] = useState<string | null>(null)
  const [wobble, setWobble] = useState(0)
  const [flying, setFlying] = useState<CSSProperties[] | null>(null)
  const [overlay, setOverlay] = useState<string | null>(null)
  const stateRef = useRef(state)
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

  const pull = (r: number, i: number) => {
    const prev = stateRef.current
    const { state: next, result } = pullBlock(prev, r, i, order, rng)
    if (result === 'ignored') return
    if (result === 'top' || result === 'last') {
      playSfx('tapSoft', { pitch: 0.7 })
      setMsg(MESSAGES[result])
      return
    }
    stateRef.current = next
    setState(next)
    setMsg(null)
    if (result === 'safe') {
      // 삐걱 소리는 늘 같다(무너질 확률과 무관)
      playSfx('tower.knock')
      playSfx('tower.creak')
      void haptic('tap')
      setWobble((w) => w + 1)
      return
    }
    // collapse
    const loser = next.loser
    if (!loser) return
    void haptic('error')
    playSfx('tower.collapse')
    setFlying(scatter(rng))
    setOverlay(`${pieceLabel(loser)} 와르르!`)
    timers.current.push(setTimeout(() => onFinishRef.current(loser), END_EFFECT_MS))
  }

  const over = state.phase === 'collapsed'
  const holder = order[state.idx % order.length]
  // 위(TOP)부터 아래(0) 순서로 그린다
  const rowOrder = Array.from({ length: ROWS }, (_, k) => TOP - k)

  return (
    <div className="tw-root">
      <div className="tw-bar">블록을 하나씩 빼기! 무너뜨리면 벌칙</div>
      <div className="tw-turn">👉 {pieceLabel(holder)} 차례예요</div>
      <div className="tw-msg" role="status" aria-live="polite">
        {msg}
      </div>
      <div className="tw-stage">
        <div key={wobble} className={'tw-tower' + (wobble > 0 && !over ? ' tw-wobble' : '')}>
          {rowOrder.map((r, k) => (
            <div key={r} className={'tw-row' + (r === TOP ? ' tw-locked' : '')}>
              {state.rows[r].map((has, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`블록 ${r + 1}-${i + 1}`}
                  className={'tw-blk' + (has ? '' : ' tw-gone')}
                  style={flying ? flying[k * COLS + i] : undefined}
                  disabled={!has || over}
                  onClick={() => pull(r, i)}
                />
              ))}
            </div>
          ))}
        </div>
        {overlay && (
          <div className="tw-overlay" role="status">
            {overlay}
          </div>
        )}
      </div>
    </div>
  )
}
