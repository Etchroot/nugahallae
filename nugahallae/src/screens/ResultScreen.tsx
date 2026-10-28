import { useEffect, useState } from 'react'
import { BottomCTA, Button } from '@toss/tds-mobile'
import { pieceLabel } from '../domain/pieces'
import type { Piece } from '../domain/pieces'
import { haptic } from '../platform/sdk'
import './screens.css'

const SUSPENSE_MS = 1500

interface Props {
  loser: Piece
  onAgain: () => void
  onOtherGame: () => void
}

export function ResultScreen({ loser, onAgain, onOtherGame }: Props) {
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
      setShown(true)
      void haptic('success')
    }, SUSPENSE_MS)
    return () => clearTimeout(t)
  }, [])

  if (!shown) {
    return (
      <div className="rs-root">
        <div className="rs-wait" role="status">
          두구두구…
        </div>
      </div>
    )
  }

  return (
    <div className="rs-root">
      <div className="rs-flash" style={{ background: loser.color }} aria-hidden="true" />
      <div className="rs-emoji" aria-hidden="true">
        {loser.emoji}
      </div>
      <div className="rs-loser">{pieceLabel(loser)} 걸렸다!</div>
      <BottomCTA.Double
        fixed
        leftButton={
          <Button color="dark" variant="weak" display="full" onClick={onOtherGame}>
            다른 게임
          </Button>
        }
        rightButton={
          <Button display="full" onClick={onAgain}>
            한 판 더
          </Button>
        }
      />
    </div>
  )
}
