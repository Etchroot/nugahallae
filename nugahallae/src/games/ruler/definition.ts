import type { GameDefinition } from '../types'
import { lazyGame } from '../lazyGame'

const definition: GameDefinition = {
  id: 'ruler',
  icon: '📏',
  title: '감으로 길이 그리기',
  summary: '자 없이 감으로, 가장 많이 틀리면 벌칙',
  rule: '제시된 길이만큼 손가락으로 가로선을 그어요. 자는 없어요, 감으로! 정답과 가장 많이 차이 난 사람이 벌칙이에요.',
  tint: '#fff4e0',
  order: 15,
  Component: lazyGame(() => import('./RulerGame').then((m) => ({ default: m.RulerGame }))),
}

export default definition
