import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'
import { pieceLabel } from '../../domain/pieces'
import { defaultRng } from '../../domain/rng'
import type { Rng } from '../../domain/rng'
import { haptic } from '../../platform/sdk'
import { playSfx } from '../../platform/sound'
import { useTapGuard } from '../../app/useTapGuard'
import { RECORD_END_MS } from '../shared/timing'
import { initLiar, resolveLiar, tally } from './logic'
import type { LiarSetup } from './logic'
import './liar.css'

export const DISCUSS_MS = 120_000

type Phase = 'topic' | 'reveal' | 'discuss' | 'vote' | 'result'

interface Result {
  caught: boolean
  loser: number
}

const fmt = (ms: number) => {
  const s = Math.ceil(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function LiarGame({
  order,
  onFinish,
  rng = defaultRng,
  now = () => performance.now(),
}: GameProps & { rng?: Rng; now?: () => number }) {
  const [setup] = useState<LiarSetup>(() => initLiar(rng, order.length))
  const [phase, setPhase] = useState<Phase>('topic')
  const [turn, setTurn] = useState(0)
  const [seen, setSeen] = useState(false)
  const [holding, setHolding] = useState(false)
  const [remaining, setRemaining] = useState(DISCUSS_MS)
  const [voteTurn, setVoteTurn] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [result, setResult] = useState<Result | null>(null)

  const guard = useTapGuard(now)
  const phaseRef = useRef<Phase>('topic')
  const holdRef = useRef<{ id: number } | null>(null)
  const votes = useRef<number[]>([])
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish
  const nowRef = useRef(now)
  nowRef.current = now

  useEffect(() => {
    const list = timers.current
    return () => {
      list.forEach(clearTimeout)
      list.length = 0
    }
  }, [])

  const go = useCallback((p: Phase) => {
    phaseRef.current = p
    setPhase(p)
    void haptic('tap')
    playSfx(p === 'discuss' ? 'chime' : 'tapSoft')
  }, [])

  const release = useCallback(() => {
    holdRef.current = null
    setHolding(false)
  }, [])

  // 앱이 백그라운드로 가면 카드를 즉시 가린다.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden') release()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [release])

  // 누르는 동안: 버튼이 pointerup을 못 받는 경우(캡처 실패·WebView 누락)에도 window에서 해제한다.
  useEffect(() => {
    if (!holding) return
    const onEnd = (e: PointerEvent) => {
      if (holdRef.current && holdRef.current.id === e.pointerId) release()
    }
    window.addEventListener('pointerup', onEnd)
    window.addEventListener('pointercancel', onEnd)
    return () => {
      window.removeEventListener('pointerup', onEnd)
      window.removeEventListener('pointercancel', onEnd)
    }
  }, [holding, release])

  // 토론 타이머
  useEffect(() => {
    if (phase !== 'discuss') return
    const start = nowRef.current()
    setRemaining(DISCUSS_MS)
    let lastSec = 11
    const id = setInterval(() => {
      const rem = Math.max(0, DISCUSS_MS - (nowRef.current() - start))
      setRemaining(rem)
      // 마지막 10초는 1초마다 째깍(모두에게 보이는 타이머와 같은 정보)
      const sec = Math.ceil(rem / 1000)
      if (sec <= 10 && sec < lastSec) {
        lastSec = sec
        if (sec > 0) playSfx('tick')
      }
      if (rem <= 0) {
        clearInterval(id)
        if (phaseRef.current === 'discuss') {
          playSfx('buzz', { gain: 0.6 })
          go('vote')
        }
      }
    }, 250)
    return () => clearInterval(id)
  }, [phase, go])

  const nextPerson = () => {
    if (!seen) return
    release()
    if (turn + 1 >= order.length) {
      go('discuss')
    } else {
      setTurn(turn + 1)
      setSeen(false)
      void haptic('tap')
      playSfx('tapSoft')
    }
  }

  const confirmVote = () => {
    if (selected === null) return
    votes.current[voteTurn] = selected
    if (voteTurn + 1 < order.length) {
      setVoteTurn(voteTurn + 1)
      setSelected(null)
      void haptic('tap')
      playSfx('tapSoft')
      return
    }
    const pointed = tally(votes.current, order.length, rng)
    const res = resolveLiar(pointed, setup.liar)
    phaseRef.current = 'result'
    setPhase('result')
    setResult(res)
    void haptic('error')
    playSfx(res.caught ? 'success' : 'loseSting')
    const loser = order[res.loser]
    timers.current.push(setTimeout(() => onFinishRef.current(loser), RECORD_END_MS))
  }

  const isLiar = turn === setup.liar

  return (
    <div className="lr-root">
      <div className="lr-bar">한 명은 라이어! 투표로 찾아요</div>

      {phase === 'topic' && (
        <div className="lr-body">
          <div className="lr-topic">주제: {setup.topic}</div>
          <p className="lr-hint">모두 같은 주제예요. 라이어만 제시어를 몰라요</p>
          <button type="button" className="lr-btn" onClick={guard(() => go('reveal'))}>
            제시어 확인 시작
          </button>
        </div>
      )}

      {phase === 'reveal' && (
        <div className="lr-body">
          <div className="lr-turn">👉 {pieceLabel(order[turn])} 차례예요</div>
          <div className="lr-cardwrap">
            {holding && (
              <div className="lr-card" role="status">
                {isLiar ? '당신이 라이어예요' : `제시어: ${setup.word}`}
              </div>
            )}
            <button
              type="button"
              className="lr-hold"
              onPointerDown={(e) => {
                if (holdRef.current || e.button > 0) return
                holdRef.current = { id: e.pointerId }
                // 라이어든 아니든 똑같은 소리(누가 라이어인지 소리로 드러나지 않게)
                playSfx('cardFlip')
                setHolding(true)
                setSeen(true)
                try {
                  e.currentTarget.setPointerCapture?.(e.pointerId)
                } catch {
                  /* 캡처 실패는 무시 */
                }
              }}
              onPointerUp={(e) => {
                if (holdRef.current && holdRef.current.id === e.pointerId) release()
              }}
              onPointerCancel={(e) => {
                if (holdRef.current && holdRef.current.id === e.pointerId) release()
              }}
              onLostPointerCapture={(e) => {
                if (holdRef.current && holdRef.current.id === e.pointerId) release()
              }}
              onPointerLeave={(e) => {
                if (holdRef.current && holdRef.current.id === e.pointerId) release()
              }}
              onBlur={release}
              onContextMenu={(e) => e.preventDefault()}
            >
              꾹 눌러서 확인
            </button>
          </div>
          <p className="lr-hint">손을 떼면 바로 가려져요. 다른 사람은 보지 마세요</p>
          <button type="button" className="lr-btn" disabled={!seen} onClick={guard(nextPerson)}>
            다음 사람
          </button>
        </div>
      )}

      {phase === 'discuss' && (
        <div className="lr-body">
          <div className="lr-topic">주제: {setup.topic}</div>
          <div className="lr-timer" role="timer">
            {fmt(remaining)}
          </div>
          <p className="lr-hint">돌아가며 제시어를 설명하고 이야기를 나눠요</p>
          <button type="button" className="lr-btn" onClick={guard(() => go('vote'))}>
            투표하러 가기
          </button>
        </div>
      )}

      {phase === 'vote' && (
        <div className="lr-body">
          <div className="lr-turn">👉 {pieceLabel(order[voteTurn])} 차례예요</div>
          <p className="lr-hint">라이어로 의심되는 사람을 골라요</p>
          <div className="lr-grid">
            {order.map((p, i) =>
              i === voteTurn ? null : (
                <button
                  key={p.id}
                  type="button"
                  aria-label={pieceLabel(p)}
                  aria-pressed={selected === i}
                  className={'lr-pick' + (selected === i ? ' lr-on' : '')}
                  onClick={() => {
                    // 누구를 골랐는지 드러나지 않게 모든 칸이 같은 소리(동물 울음은 쓰지 않는다)
                    playSfx('tapSoft')
                    setSelected(i)
                  }}
                >
                  <span className="lr-emoji" aria-hidden="true">
                    {p.emoji}
                  </span>
                  <span aria-hidden="true">
                    {p.colorName} {p.animalName}
                  </span>
                </button>
              ),
            )}
          </div>
          <p className="lr-hint">
            투표 완료 {voteTurn}/{order.length}
          </p>
          <button type="button" className="lr-btn" disabled={selected === null} onClick={guard(confirmVote)}>
            확인했어요
          </button>
        </div>
      )}

      {phase === 'result' && result && (
        <div className="lr-body">
          <div className="lr-overlay" role="status">
            {result.caught
              ? `${pieceLabel(order[result.loser])} 라이어였어요`
              : `${pieceLabel(order[result.loser])} 잘못 지목됐어요`}
          </div>
          <p className="lr-reveal">{`라이어는 ${pieceLabel(order[setup.liar])}, 제시어는 ${setup.word}`}</p>
        </div>
      )}
    </div>
  )
}
