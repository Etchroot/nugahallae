import type { GameDefinition } from './types'
import { RouletteGame } from './roulette/RouletteGame'

export const GAMES: GameDefinition[] = [
  {
    id: 'roulette',
    icon: '🎡',
    title: '돌림판',
    summary: '걸리면 통과, 끝까지 남으면 벌칙',
    rule: '차례대로 돌림판을 돌려요. 화살표가 가리킨 말은 통과! 마지막까지 남은 말이 벌칙이에요.',
    Component: RouletteGame,
  },
]

export function findGame(id: string): GameDefinition | undefined {
  return GAMES.find((g) => g.id === id)
}
