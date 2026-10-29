import type { GameDefinition } from '../types'
import { lazyGame } from '../lazyGame'

const definition: GameDefinition = {
  id: 'trace',
  icon: '〰️',
  title: '선 따라 그리기',
  summary: '벽에 닿으면 끝, 가장 짧게 간 사람이 벌칙',
  rule: '꾸불꾸불한 길을 손가락으로 따라 그려요. 벽에 닿거나 손을 떼면 거기서 끝! 가장 짧게 간 사람이 벌칙이에요. 모두 같은 길이에요.',
  tint: '#e8f0ff',
  order: 13,
  Component: lazyGame(() => import('./TraceGame').then((m) => ({ default: m.TraceGame }))),
}

export default definition
