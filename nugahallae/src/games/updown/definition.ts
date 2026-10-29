import type { GameDefinition } from '../types'
import { lazyGame } from '../lazyGame'

const definition: GameDefinition = {
  id: 'updown',
  icon: '🔢',
  title: '숫자 폭탄',
  summary: '업다운! 폭탄 숫자를 피해라',
  rule: '1~100 사이에 폭탄 숫자가 숨어 있어요. 돌아가며 범위 안의 숫자를 부르면 UP/DOWN으로 범위가 좁혀져요. 폭탄 숫자를 부른 사람이 벌칙이에요.',
  tint: '#efe8ff',
  order: 7,
  Component: lazyGame(() => import('./UpdownGame').then((m) => ({ default: m.UpdownGame }))),
}

export default definition
