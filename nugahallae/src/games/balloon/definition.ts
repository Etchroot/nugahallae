import type { GameDefinition } from '../types'
import { lazyGame } from '../lazyGame'

const definition: GameDefinition = {
  id: 'balloon',
  icon: '🎈',
  title: '풍선 터뜨리기',
  summary: '내 차례에 터지면 벌칙',
  rule: '내 차례에 펌프를 1~3번 누르고 넘겨요(최소 1번). 풍선은 언제 터질지 몰라요. 터뜨린 사람이 벌칙이에요.',
  tint: '#ffeaf6',
  order: 6,
  Component: lazyGame(() => import('./BalloonGame').then((m) => ({ default: m.BalloonGame }))),
}

export default definition
