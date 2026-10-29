import { useEffect } from 'react'
import type { Piece } from '../domain/pieces'
import { stopAllSounds } from '../platform/sound'
import type { GameDefinition } from '../games/types'
import './screens.css'

interface Props {
  game: GameDefinition
  order: Piece[]
  onFinish: (loser: Piece) => void
}

export function PlayScreen({ game, order, onFinish }: Props) {
  const Game = game.Component
  // 게임을 떠나면 이어지던 소리(물 붓기·심지 등)를 모두 끈다
  useEffect(() => stopAllSounds, [])
  // 게임은 자기 효과음을 낸다: 기본 클릭음은 끄고, data-click이 붙은 버튼만 클릭음을 낸다
  return (
    <div className="play-root" data-silent>
      <div className="play-title">{game.title}</div>
      <div className="play-game">
        <Game order={order} onFinish={onFinish} />
      </div>
    </div>
  )
}
