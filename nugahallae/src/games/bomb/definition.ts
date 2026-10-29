import type { GameDefinition } from '../types'
import { lazyGame } from '../lazyGame'

const definition: GameDefinition = {
  id: 'bomb',
  icon: '💣',
  title: '폭탄 돌리기',
  summary: '언제 터질지 몰라요',
  rule: '불을 붙이면 폭탄이 돌아가요. 내 차례에 7번 연타해야 다음 사람에게 넘어가요. 손에서 터지면 벌칙이에요.',
  tint: '#ffe8ec',
  order: 5,
  Component: lazyGame(() => import('./BombGame').then((m) => ({ default: m.BombGame }))),
}

export default definition
