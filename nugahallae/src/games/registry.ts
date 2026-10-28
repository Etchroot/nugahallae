import type { GameDefinition } from './types'
import { RouletteGame } from './roulette/RouletteGame'
import { PourGame } from './pour/PourGame'

export const GAMES: GameDefinition[] = [
  {
    id: 'roulette',
    icon: '🎡',
    title: '돌림판',
    summary: '걸리면 통과, 끝까지 남으면 벌칙',
    rule: '차례대로 돌림판을 돌려요. 화살표가 가리킨 말은 통과! 마지막까지 남은 말이 벌칙이에요.',
    Component: RouletteGame,
  },
  {
    id: 'pour',
    icon: '🥛',
    title: '잔 채우기',
    summary: '꾹 눌러 붓기, 넘치게 하면 벌칙',
    rule: '차례대로 잔에 물을 부어요. 꾹 누르면 콸콸, 살짝 탭하면 한 방울! 한 방울이라도 부어야 넘길 수 있고, 넘치게 한 사람이 벌칙이에요.',
    Component: PourGame,
  },
]

export function findGame(id: string): GameDefinition | undefined {
  return GAMES.find((g) => g.id === id)
}
