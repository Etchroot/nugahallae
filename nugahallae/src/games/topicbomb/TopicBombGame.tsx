import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'
import { pieceLabel } from '../../domain/pieces'
import { defaultRng } from '../../domain/rng'
import type { Rng } from '../../domain/rng'
import { haptic } from '../../platform/sdk'
import { playSfx, playTickTrain, startLoop } from '../../platform/sound'
import type { LoopHandle } from '../../platform/sound'
import { END_EFFECT_MS } from '../shared/timing'
import { useScreenGuard } from '../shared/useScreenGuard'
import {
  MAX_SWAPS,
  TOPICS,
  explode,
  ignite,
  initTopicBomb,
  passBomb,
  shakeSeconds,
  swapTopic,
} from './logic'
import type { TopicBombState } from './logic'
import './topicbomb.css'

const TICK_MS = 100

export function TopicBombGame({
  order,
  onFinish,
  rng = defaultRng,
  now = () => performance.now(),
}: GameProps & { rng?: Rng; now?: () => number }) {
  const [state, setState] = useState<TopicBombState>(() => initTopicBomb(rng))
  const [shake, setShake] = useState(0.5)
  const [passKey, setPassKey] = useState(0)
  const [overlay, setOverlay] = useState<string | null>(null)
  const stateRef = useRef(state)
  const t0 = useRef(0)
  const interval = useRef<ReturnType<typeof setInterval> | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  // 심지 타는 소리: 속도·높이 고정(남은 시간을 드러내지 않는다). 말소리를 가리지 않게 조금 작게
  const fuse = useRef<LoopHandle | null>(null)
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish
  const { guard } = useScreenGuard(now)

  const commit = (s: TopicBombState) => {
    stateRef.current = s
    setState(s)
  }
  const stopFuse = () => {
    fuse.current?.stop()
    fuse.current = null
  }
  const startFuse = () => {
    stopFuse()
    fuse.current = startLoop('fuse')
    fuse.current.set('gain', 0.8)
  }
  const stopTick = () => {
    if (interval.current !== null) clearInterval(interval.current)
    interval.current = null
    stopFuse()
  }

  // 틱 횟수가 아니라 실제 경과 시간으로 센다(백그라운드에서 타이머가 늦어도 심지가 늘어나지 않게)
  const tick = () => {
    const cur = stateRef.current
    if (cur.phase !== 'lit') return
    const elapsed = now() - t0.current
    if (elapsed >= cur.fuse) {
      stopTick()
      const next = explode(cur, order.length)
      commit(next)
      void haptic('error')
      playSfx('boom')
      const loser = next.loserIdx === null ? null : order[next.loserIdx]
      if (loser) {
        setOverlay(`${pieceLabel(loser)} 폭탄이 터졌어요`)
        timers.current.push(setTimeout(() => onFinishRef.current(loser), END_EFFECT_MS))
      }
      return
    }
    setShake(shakeSeconds(elapsed, cur.fuse))
  }

  useEffect(() => {
    const list = timers.current
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return
      tick()
      // 백그라운드에서 꺼진 심지 소리를 다시 켠다
      if (stateRef.current.phase === 'lit') startFuse()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      list.forEach(clearTimeout)
      list.length = 0
      stopTick()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const begin = () => {
    const cur = stateRef.current
    const next = ignite(cur)
    if (next === cur) return
    commit(next)
    playSfx('bomb.ignite')
    startFuse()
    t0.current = now()
    interval.current = setInterval(tick, TICK_MS)
  }

  const handOver = () => {
    // 틱이 아직 안 돌았어도 심지가 이미 다 탔으면 넘기지 못하고 터진다
    tick()
    const cur = stateRef.current
    const next = passBomb(cur, order.length)
    if (next === cur) return
    commit(next)
    void haptic('tap')
    playSfx('whoosh')
    setPassKey((k) => k + 1)
  }

  const swap = () => {
    const cur = stateRef.current
    const next = swapTopic(cur, rng)
    if (next === cur) return
    commit(next)
    playTickTrain([0, 0.03, 0.06, 0.09, 0.12, 0.15])
  }

  const idle = state.phase === 'idle'
  const lit = state.phase === 'lit'
  const boom = state.phase === 'exploded'
  const holder = order[(boom && state.loserIdx !== null ? state.loserIdx : state.idx) % order.length]
  const left = MAX_SWAPS - state.swaps

  return (
    <div className="tb-root">
      <div className="tb-bar">주제에 맞는 말을 하고 넘기기! 터지면 벌칙</div>
      <div className="tb-topic-box">
        <span className="tb-topic-label">주제</span>
        <strong className="tb-topic" data-testid="tb-topic">
          {TOPICS[state.topic]}
        </strong>
      </div>
      {idle ? (
        <p className="tb-turn">시작하면 {pieceLabel(order[0])}부터 폭탄을 받아요</p>
      ) : (
        <p className="tb-turn">👉 {pieceLabel(holder)} 차례예요</p>
      )}
      <div className="tb-stage">
        <div
          key={passKey}
          className={'tb-bomb' + (lit ? ' tb-shake' : '') + (boom ? ' tb-boom' : '')}
          style={lit ? { animationDuration: `${shake}s` } : undefined}
          aria-hidden="true"
        >
          {boom ? '💥' : '💣'}
        </div>
        {overlay && (
          <div className="tb-overlay" role="status">
            {overlay}
          </div>
        )}
      </div>
      <p className="tb-hint">
        {idle ? '주제는 시작 전에만 바꿀 수 있어요' : '이미 나온 말은 안 돼요. 언제 터질지 아무도 몰라요'}
      </p>
      {idle ? (
        <div className="tb-actions">
          {left > 0 && (
            <button type="button" className="tb-swap" onClick={swap}>
              {`주제 바꾸기 (${left}번 남음)`}
            </button>
          )}
          <button type="button" className="tb-pass tb-start" onClick={guard(begin)}>
            시작하기
          </button>
        </div>
      ) : (
        <div className="tb-actions">
          <button type="button" className="tb-pass" disabled={boom} onClick={guard(handOver)}>
            넘기기
          </button>
        </div>
      )}
    </div>
  )
}
