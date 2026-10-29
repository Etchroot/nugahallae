import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameProps } from '../types'
import { pieceLabel } from '../../domain/pieces'
import { defaultRng } from '../../domain/rng'
import type { Rng } from '../../domain/rng'
import { haptic } from '../../platform/sdk'
import { playSfx } from '../../platform/sound'
import { END_EFFECT_MS } from '../shared/timing'
import { useScreenGuard } from '../shared/useScreenGuard'
import { TURN_MS, cancelTurn, cutWire, expire, initWires, startTurn, wireSpecs } from './logic'
import type { WireSpec, WiresState } from './logic'
import './wires.css'

const TICK_MS = 100

/** 남은 시간 째깍 소리 번호: 처음 5초는 1초마다, 마지막 3초는 0.5초마다(제한 시간은 모두에게 같고 화면에도 보인다) */
const beatOf = (e: number) => (e < 5000 ? Math.floor(e / 1000) : 5 + Math.floor((e - 5000) / 500))

function WireArt({ spec, cut }: { spec: WireSpec; cut: boolean }) {
  const common = { stroke: spec.color, strokeWidth: 8, strokeLinecap: 'round' as const }
  if (cut) {
    return (
      <svg viewBox="0 0 120 24" className="wr-art" aria-hidden="true">
        <line x1="8" y1="12" x2="46" y2="8" {...common} />
        <line x1="74" y1="16" x2="112" y2="12" {...common} />
        <path d="M50 4 L56 12 L50 20 M70 4 L64 12 L70 20" fill="none" stroke="var(--pl-warn)" strokeWidth="3" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 120 24" className="wr-art" aria-hidden="true">
      {spec.pattern === 'dashed' ? (
        <line x1="8" y1="12" x2="112" y2="12" {...common} strokeLinecap="butt" strokeDasharray="14 8" />
      ) : (
        <line x1="8" y1="12" x2="112" y2="12" {...common} />
      )}
      {spec.pattern === 'striped' && (
        <line x1="12" y1="12" x2="108" y2="12" stroke="#fff" strokeWidth="8" strokeDasharray="3 9" />
      )}
    </svg>
  )
}

export function WiresGame({
  order,
  onFinish,
  rng = defaultRng,
  now = () => performance.now(),
}: GameProps & { rng?: Rng; now?: () => number }) {
  const [state, setState] = useState<WiresState>(() => initWires(order.length, rng))
  const [elapsed, setElapsed] = useState(0)
  const [retry, setRetry] = useState(false)
  const [overlay, setOverlay] = useState<string | null>(null)
  const specs = useMemo(() => wireSpecs(state.count), [state.count])
  const stateRef = useRef(state)
  const t0 = useRef(0)
  const interval = useRef<ReturnType<typeof setInterval> | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const beat = useRef(0)
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish
  const { guard, prime } = useScreenGuard(now)

  const commit = (s: WiresState) => {
    stateRef.current = s
    setState(s)
  }
  const stopTick = () => {
    if (interval.current !== null) clearInterval(interval.current)
    interval.current = null
  }

  const finish = (s: WiresState) => {
    stopTick()
    commit(s)
    void haptic('error')
    if (s.reason === 'timeout') playSfx('buzz')
    playSfx('boom')
    const loser = s.loserIdx === null ? null : order[s.loserIdx]
    if (!loser) return
    setOverlay(
      s.reason === 'timeout' ? `${pieceLabel(loser)} 시간이 다 됐어요` : `${pieceLabel(loser)} 펑!`,
    )
    timers.current.push(setTimeout(() => onFinishRef.current(loser), END_EFFECT_MS))
  }

  const tick = () => {
    const cur = stateRef.current
    if (cur.phase !== 'running') return
    const e = now() - t0.current
    if (e >= TURN_MS) {
      setElapsed(TURN_MS)
      finish(expire(cur))
      return
    }
    const b = beatOf(e)
    if (b > beat.current) {
      beat.current = b
      playSfx('tick', { pitch: e < 5000 ? 1 : 1.3 })
    }
    setElapsed(e)
  }

  useEffect(() => {
    const list = timers.current
    const onVisibility = () => {
      if (document.visibilityState !== 'hidden') return
      const cur = stateRef.current
      if (cur.phase !== 'running') return
      stopTick()
      commit(cancelTurn(cur))
      setElapsed(0)
      setRetry(true)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      list.forEach(clearTimeout)
      list.length = 0
      stopTick()
    }
  }, [])

  const begin = () => {
    const cur = stateRef.current
    const next = startTurn(cur)
    if (next === cur) return
    commit(next)
    setRetry(false)
    setElapsed(0)
    playSfx('goBeep')
    beat.current = 0
    t0.current = now()
    interval.current = setInterval(tick, TICK_MS)
  }

  const cut = (i: number) => {
    const cur = stateRef.current
    const r = cutWire(cur, i, now() - t0.current)
    if (r.result === 'ignored') return
    // 자르는 소리는 어느 전선이든 같다. 결과음은 판정과 같은 순간에
    playSfx('wires.snip')
    if (r.result === 'safe') {
      playSfx('success')
      stopTick()
      commit(r.state)
      prime()
      void haptic('tap')
    } else {
      finish(r.state)
    }
  }

  const running = state.phase === 'running'
  const over = state.phase === 'over'
  const who = order[(over && state.loserIdx !== null ? state.loserIdx : state.idx) % order.length]
  const fill = Math.max(0, Math.round((1 - elapsed / TURN_MS) * 1000) / 10)

  return (
    <div className="wr-root">
      <div className="wr-bar">틀린 전선은 딱 하나! 자르면 펑</div>
      <div className="wr-turn">👉 {pieceLabel(who)} 차례예요</div>
      <div className="wr-time" aria-hidden="true">
        <div className="wr-time-fill" data-testid="wr-bar-fill" style={{ width: `${fill}%` }} />
      </div>
      <div className="wr-stage">
        <ul className="wr-wires">
          {specs.map((spec, i) => {
            const isCut = state.cut[i]
            const label = `전선 ${spec.number}번 ${spec.colorName} ${spec.patternName}${isCut ? ' 끊어짐' : ''}`
            return (
              <li key={spec.number}>
                <button
                  type="button"
                  className={'wr-wire' + (isCut ? ' wr-wire--cut' : '')}
                  aria-label={label}
                  disabled={isCut}
                  aria-disabled={!running || undefined}
                  onClick={() => cut(i)}
                >
                  <span className="wr-num" aria-hidden="true">
                    {spec.number}
                  </span>
                  <WireArt spec={spec} cut={isCut} />
                </button>
              </li>
            )
          })}
        </ul>
        {overlay && (
          <div className="wr-overlay" role="status">
            {overlay}
          </div>
        )}
      </div>
      {retry && <p className="wr-retry">다시 해 주세요</p>}
      {state.phase === 'ready' ? (
        <button type="button" className="wr-ready" onClick={guard(begin)}>
          준비됐어요
        </button>
      ) : (
        <p className="wr-hint">{over ? ' ' : '시간 안에 전선 하나를 골라 잘라요'}</p>
      )}
    </div>
  )
}
