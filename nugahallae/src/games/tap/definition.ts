import type { GameDefinition } from '../types'
import { lazyGame } from '../lazyGame'

const definition: GameDefinition = {
  id: 'tap',
  icon: '👆',
  title: '연타 대결',
  summary: '5초 동안 가장 적게 누른 사람',
  rule: '내 차례에 버튼을 누르면 3초 카운트다운 후 5초 동안 연타! 가장 적게 누른 사람이 벌칙이에요.',
  tint: '#fff0e3',
  order: 11,
  Component: lazyGame(() => import('./TapGame').then((m) => ({ default: m.TapGame }))),
}

export default definition
