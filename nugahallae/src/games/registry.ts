import type { GameDefinition } from './types'
import { RouletteGame } from './roulette/RouletteGame'
import { PourGame } from './pour/PourGame'
import { LadderGame } from './ladder/LadderGame'

export const GAMES: GameDefinition[] = [
  {
    id: 'roulette',
    icon: '🎡',
    title: '돌림판',
    summary: '걸리면 통과, 끝까지 남으면 벌칙',
    rule: '차례대로 돌림판을 돌려요. 화살표가 가리킨 말은 통과! 마지막까지 남은 말이 벌칙이에요.',
    tint: '#fff4d6',
    badge: '인기',
    Component: RouletteGame,
  },
  {
    id: 'pour',
    icon: '🥛',
    title: '잔 채우기',
    summary: '꾹 눌러 붓기, 넘치게 하면 벌칙',
    rule: '차례대로 잔에 물을 부어요. 꾹 누르면 콸콸, 살짝 탭하면 한 방울! 한 방울이라도 부어야 넘길 수 있고, 넘치게 한 사람이 벌칙이에요.',
    tint: '#e3f2ff',
    badge: 'NEW',
    Component: PourGame,
  },
  {
    id: 'ladder',
    icon: '🪜',
    title: '사다리 타기',
    summary: '벌칙 칸은 딱 하나',
    rule: '차례대로 내 말을 눌러 사다리를 내려가요. 아래 칸 중 벌칙은 딱 하나! 벌칙 칸에 도착한 사람이 걸려요.',
    tint: '#e8f8ef',
    Component: LadderGame,
  },
]

export function findGame(id: string): GameDefinition | undefined {
  return GAMES.find((g) => g.id === id)
}
