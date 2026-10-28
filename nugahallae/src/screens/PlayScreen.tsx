import type { Piece } from '../domain/pieces'
import type { GameDefinition } from '../games/types'
import './screens.css'

interface Props {
  game: GameDefinition
  order: Piece[]
  onFinish: (loser: Piece) => void
}

export function PlayScreen({ game, order, onFinish }: Props) {
  const Game = game.Component
  return (
    <div className="play-root">
      <div className="play-title">{game.title}</div>
      <div className="play-game">
        <Game order={order} onFinish={onFinish} />
      </div>
    </div>
  )
}
