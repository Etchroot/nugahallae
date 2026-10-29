import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'
import { pieceLabel } from '../../domain/pieces'
import { defaultRng } from '../../domain/rng'
import type { Rng } from '../../domain/rng'
import { haptic } from '../../platform/sdk'
import { playSfx } from '../../platform/sound'
import { PlayerTiles } from '../shared/PlayerTiles'
import { useScreenGuard } from '../shared/useScreenGuard'
import { END_EFFECT_MS } from '../shared/timing'
import { ZERO_SETTLE_MS, draw, foldFinger, initFingers, newDeck, zeroed } from './logic'
import type { Deck } from './logic'
import '../shared/record.css'
import './never.css'

const RULE = '해 본 사람만 누르기! 손가락 5개를 먼저 접으면 벌칙'

export function NeverGame({
  order,
  onFinish,
  rng = defaultRng,
  now = () => performance.now(),
}: GameProps & { rng?: Rng; now?: () => number }) {
  const n = order.length
  const [first] = useState(() => draw(newDeck(rng), rng))
  const [sentence, setSentence] = useState(first.sentence)
  const [round, setRound] = useState(1)
  const [fingers, setFingers] = useState<number[]>(() => initFingers(n))
  const [folded, setFolded] = useState<number[]>([])
  const [overlay, setOverlay] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)
  const deckRef = useRef<Deck>(first.deck)
  const fingersRef = useRef(fingers)
  const foldedRef = useRef<number[]>([])
  const decidedRef = useRef(false)
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const endTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish
  const { guard } = useScreenGuard(now)

  useEffect(
    () => () => {
      if (settleTimer.current !== null) clearTimeout(settleTimer.current)
      if (endTimer.current !== null) clearTimeout(endTimer.current)
    },
    [],
  )

  const conclude = () => {
    settleTimer.current = null
    const zeros = zeroed(fingersRef.current)
    if (zeros.length === 0) return
    decidedRef.current = true
    const loser = zeros[Math.min(zeros.length - 1, Math.floor(rng() * zeros.length))]
    void haptic('error')
    playSfx('loseSting')
    setOverlay(`${pieceLabel(order[loser])} 손가락을 다 접었어요`)
    endTimer.current = setTimeout(() => onFinishRef.current(order[loser]), END_EFFECT_MS)
  }

  const onTileDown = (index: number) => {
    if (decidedRef.current) return
    if (foldedRef.current.includes(index)) return
    fingersRef.current = foldFinger(fingersRef.current, index)
    playSfx('never.fold', { pitch: 0.8 + 0.05 * fingersRef.current[index] })
    foldedRef.current = [...foldedRef.current, index]
    setFingers(fingersRef.current)
    setFolded(foldedRef.current)
    // 같은 순간 0이 된 다른 사람을 기다렸다가 확정한다
    if (zeroed(fingersRef.current).length > 0 && settleTimer.current === null) {
      setLocked(true)
      settleTimer.current = setTimeout(conclude, ZERO_SETTLE_MS)
    }
  }

  const next = () => {
    if (decidedRef.current || settleTimer.current !== null) return
    const r = draw(deckRef.current, rng)
    deckRef.current = r.deck
    playSfx('cardFlip')
    foldedRef.current = []
    setFolded([])
    setSentence(r.sentence)
    setRound((k) => k + 1)
  }

  return (
    <div className="rg-root">
      <div className="rg-bar">{RULE}</div>
      <div className="nv-field">
        <div className="nv-round" data-testid="never-round">
          라운드 {round}
        </div>
        <p className="nv-sentence" data-testid="never-sentence">
          {sentence}
        </p>
        <PlayerTiles
          order={order}
          now={now}
          onTileDown={onTileDown}
          disabled={(i) => decidedRef.current || folded.includes(i)}
          renderStatus={(i) => (
            <>
              <span aria-hidden="true">✋ ×{fingers[i]}</span>
              <span className="nv-sr">남은 손가락 {fingers[i]}</span>
              {folded.includes(i) && <span className="nv-done"> 접었어요</span>}
            </>
          )}
        />
        {overlay && (
          <div className="rg-overlay" role="status">
            {overlay}
          </div>
        )}
      </div>
      <div className="rg-after">
        <button
          type="button"
          className={'rg-btn' + (locked ? ' nv-off' : '')}
          aria-disabled={locked}
          onClick={guard(next)}
        >
          다음 문장
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginLeft: 6, verticalAlign: '-3px' }}
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  )
}
