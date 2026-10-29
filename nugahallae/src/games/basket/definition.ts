import type { GameDefinition } from '../types'
import { BasketGame } from './BasketGame'

const definition: GameDefinition = {
  id: 'basket',
  icon: '🧺',
  title: '바구니에 공 넣기',
  summary: '가장 적게 넣으면 벌칙',
  rule: '공을 뒤로 당겼다 놓아서 바구니에 던져 넣어요. 한 사람이 세 번씩 던지고, 가장 적게 넣은 사람이 벌칙이에요. 바구니 위치는 모두 같아요.',
  tint: '#e8f8ef',
  minPlayers: 2,
  Component: BasketGame,
}

export default definition
