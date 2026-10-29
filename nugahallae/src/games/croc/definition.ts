import type { GameDefinition } from '../types'
import { lazyGame } from '../lazyGame'

const definition: GameDefinition = {
  id: 'croc',
  icon: '🐊',
  title: '악어 이빨',
  summary: '아픈 이빨 누르면 콱!',
  rule: '돌아가며 악어 이빨을 하나씩 눌러요. 숨겨진 아픈 이빨을 누르면 악어가 콱! 물린 사람이 벌칙이에요.',
  tint: '#e6f6e6',
  order: 4,
  Component: lazyGame(() => import('./CrocGame').then((m) => ({ default: m.CrocGame }))),
}

export default definition
