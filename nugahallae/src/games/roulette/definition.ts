import type { GameDefinition } from '../types'
import { RouletteGame } from './RouletteGame'

const definition: GameDefinition = {
  id: 'roulette',
  icon: '🎡',
  title: '돌림판',
  summary: '걸리면 통과, 끝까지 남으면 벌칙',
  rule: '차례대로 돌림판을 돌려요. 화살표가 가리킨 동물은 통과! 마지막까지 남은 동물이 벌칙이에요.',
  tint: '#fff4d6',
  badge: '인기',
  order: 1,
  Component: RouletteGame,
}

export default definition
