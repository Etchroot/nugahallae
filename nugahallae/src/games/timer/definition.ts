import type { GameDefinition } from '../types'
import { lazyGame } from '../lazyGame'

const definition: GameDefinition = {
  id: 'timer',
  icon: '⏱️',
  title: '타이머 멈추기',
  summary: '목표 시간에 가장 먼 사람',
  rule: '목표 시간이 정해져요. 시작을 누르고 목표 시간이라고 생각될 때 멈추세요. 1.5초가 지나면 숫자가 가려져요. 목표에서 가장 먼 사람이 벌칙이에요.',
  tint: '#e3f7f4',
  order: 9,
  Component: lazyGame(() => import('./TimerGame').then((m) => ({ default: m.TimerGame }))),
}

export default definition
