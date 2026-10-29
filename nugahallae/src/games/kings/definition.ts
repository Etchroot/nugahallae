import type { GameDefinition } from '../types'
import { lazyGame } from '../lazyGame'

const definition: GameDefinition = {
  id: 'kings',
  icon: '👑',
  title: '왕 뽑기',
  summary: '마지막 왕을 뽑으면 벌칙',
  rule: '뒤집힌 카드 16장 중 왕 카드가 4장 있어요. 차례대로 카드를 한 장씩 뽑아요. 네 번째 왕을 뽑는 사람이 벌칙이에요.',
  tint: '#fff4d6',
  minPlayers: 2,
  Component: lazyGame(() => import('./KingsGame').then((m) => ({ default: m.KingsGame }))),
}

export default definition
