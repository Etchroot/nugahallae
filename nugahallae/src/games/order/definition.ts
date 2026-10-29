import type { GameDefinition } from '../types'
import { lazyGame } from '../lazyGame'

const definition: GameDefinition = {
  id: 'order',
  icon: '🔢',
  title: '1부터 16까지',
  summary: '순서대로 누르기, 가장 느리면 벌칙',
  rule: '1부터 16까지 숫자를 순서대로 최대한 빨리 눌러요. 틀린 숫자를 누르면 1초가 더해져요. 가장 느린 사람이 벌칙이에요.',
  tint: '#e6f4ff',
  order: 16,
  Component: lazyGame(() => import('./OrderGame').then((m) => ({ default: m.OrderGame }))),
}

export default definition
