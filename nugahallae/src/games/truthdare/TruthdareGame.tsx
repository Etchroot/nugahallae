import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'
import { pieceLabel } from '../../domain/pieces'
import { defaultRng } from '../../domain/rng'
import type { Rng } from '../../domain/rng'
import { haptic } from '../../platform/sdk'
import { useTapGuard } from '../../app/useTapGuard'
import { END_EFFECT_MS } from '../shared/timing'
import { cardsOf, drawCard, pickPlayer } from './logic'
import type { CardKind } from './logic'
import './truthdare.css'

export const SPIN_MS = 800
const SPIN_TICK_MS = 80
const STEPS = SPIN_MS / SPIN_TICK_MS
/** 멈춘 뒤 선택된 칸을 보여 주는 시간 */
export const HOLD_MS = 300

type Phase = 'start' | 'spin' | 'choose' | 'card' | 'done'

export function TruthdareGame({
  order,
  onFinish,
  rng = defaultRng,
  now = () => performance.now(),
}: GameProps & { rng?: Rng; now?: () => number }) {
  const [phase, setPhase] = useState<Phase>('start')
  const [selected, setSelected] = useState(0)
  const [hl, setHl] = useState(0)
  const [kind, setKind] = useState<CardKind>('truth')
  const [card, setCard] = useState(0)
  const [swapped, setSwapped] = useState(false)

  const guard = useTapGuard(now)
  const used = useRef<Record<CardKind, number[]>>({ truth: [], dare: [] })
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const intervals = useRef<ReturnType<typeof setInterval>[]>([])
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish

  useEffect(() => {
    const ts = timers.current
    const is = intervals.current
    return () => {
      ts.forEach(clearTimeout)
      is.forEach(clearInterval)
      ts.length = 0
      is.length = 0
    }
  }, [])

  const start = () => {
    if (phase !== 'start') return
    const chosen = pickPlayer(rng, order.length) // 결과는 이미 정해졌고, 아래는 보여 주는 연출이다.
    setSelected(chosen)
    const n = order.length
    // 마지막 틱(step === STEPS)이 정확히 chosen에 닿도록 시작 칸을 역산한다.
    const at = (step: number) => (((chosen + step - STEPS) % n) + n) % n
    setHl(at(0))
    setPhase('spin')
    let step = 0
    const iv = setInterval(() => {
      step++
      setHl(at(step))
      if (step >= STEPS) {
        clearInterval(iv)
        void haptic('tap')
        // 선택된 칸이 하이라이트된 채 잠깐 머문 뒤 선택 화면으로 넘어간다.
        timers.current.push(setTimeout(() => setPhase('choose'), HOLD_MS))
      }
    }, SPIN_TICK_MS)
    intervals.current.push(iv)
  }

  const choose = (k: CardKind) => {
    if (phase !== 'choose') return
    const idx = drawCard(k, used.current[k], rng)
    used.current[k].push(idx)
    setKind(k)
    setCard(idx)
    setPhase('card')
  }

  const swap = () => {
    if (phase !== 'card' || swapped) return
    const idx = drawCard(kind, used.current[kind], rng)
    used.current[kind].push(idx)
    setCard(idx)
    setSwapped(true)
  }

  const done = () => {
    if (phase !== 'card') return
    setPhase('done')
    const loser = order[selected]
    timers.current.push(setTimeout(() => onFinishRef.current(loser), END_EFFECT_MS))
  }

  return (
    <div className="td-root">
      <div className="td-bar">걸린 사람은 진실 질문이나 미션 수행</div>
      <div className="td-body">
        {(phase === 'start' || phase === 'spin') && (
          <>
            <div className="td-grid">
              {order.map((p, i) => (
                <div
                  key={p.id}
                  className={'td-chip' + (phase === 'spin' && i === hl ? ' td-hl' : '')}
                >
                  <span className="td-emoji" aria-hidden="true">
                    {p.emoji}
                  </span>
                  <span>
                    {p.colorName} {p.animalName}
                  </span>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="td-btn"
              disabled={phase === 'spin'}
              onClick={guard(start)}
            >
              시작하기
            </button>
          </>
        )}

        {phase === 'choose' && (
          <>
            <div className="td-turn">👉 {pieceLabel(order[selected])} 차례예요</div>
            <div className="td-choices">
              <button type="button" className="td-btn" onClick={guard(() => choose('truth'))}>
                진실
              </button>
              <button type="button" className="td-btn td-alt" onClick={guard(() => choose('dare'))}>
                미션
              </button>
            </div>
          </>
        )}

        {(phase === 'card' || phase === 'done') && (
          <>
            <div className="td-turn">👉 {pieceLabel(order[selected])} 차례예요</div>
            <div className="td-kind">{kind === 'truth' ? '진실' : '미션'}</div>
            <div className="td-card">{cardsOf(kind)[card]}</div>
            <button
              type="button"
              className="td-btn td-ghost"
              disabled={swapped || phase === 'done'}
              onClick={guard(swap)}
            >
              카드 바꾸기
            </button>
            <button type="button" className="td-btn" disabled={phase === 'done'} onClick={guard(done)}>
              완료했어요
            </button>
          </>
        )}

        {phase === 'done' && (
          <div className="td-overlay" role="status">
            {pieceLabel(order[selected])} 걸렸다!
          </div>
        )}
      </div>
    </div>
  )
}
