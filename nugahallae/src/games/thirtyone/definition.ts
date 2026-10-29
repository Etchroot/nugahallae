import type { GameDefinition } from '../types'
import { ThirtyOneGame } from './ThirtyOneGame'

const definition: GameDefinition = {
  id: 'thirtyone',
  icon: '🧮',
  title: '31 게임',
  summary: '31을 부르면 벌칙',
  rule: '차례대로 1개에서 3개까지 이어서 숫자를 불러요. 31을 부르는 사람이 벌칙이에요.',
  tint: '#e8f0ff',
  minPlayers: 2,
  Component: ThirtyOneGame,
}

export default definition
