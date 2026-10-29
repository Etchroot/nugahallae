import { useEffect } from 'react'
import { BottomCTA, Button } from '@toss/tds-mobile'
import { pieceLabel } from '../domain/pieces'
import type { Piece } from '../domain/pieces'
import { haptic } from '../platform/sdk'
import { playResult } from '../platform/sound'
import './screens.css'

interface Props {
  loser: Piece
  onAgain: () => void
  onOtherGame: () => void
}

// 대부분의 게임은 끝나는 순간 벌칙자가 정해지므로, 결과는 기다림 없이 바로 보여 준다.
export function ResultScreen({ loser, onAgain, onOtherGame }: Props) {
  useEffect(() => {
    void haptic('success')
    playResult(loser.id)
  }, [loser.id])

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
