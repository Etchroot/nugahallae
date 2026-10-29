import type { GameDefinition } from '../types'
import { lazyGame } from '../lazyGame'

const definition: GameDefinition = {
  id: 'reaction',
  icon: '⚡',
  title: '반응속도',
  summary: '제일 느린 사람',
  rule: '화면을 누르면 빨간색으로 바뀌어요. 초록색이 되는 순간 최대한 빨리 탭! 빨간색일 때 누르면 부정출발이에요. 가장 느린 사람이 벌칙이에요.',
  tint: '#e5effa',
  order: 10,
  Component: lazyGame(() => import('./ReactionGame').then((m) => ({ default: m.ReactionGame }))),
}

export default definition
