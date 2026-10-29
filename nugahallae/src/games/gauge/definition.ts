import type { GameDefinition } from '../types'
import { GaugeGame } from './GaugeGame'

const definition: GameDefinition = {
  id: 'gauge',
  icon: '🎯',
  title: '게이지 멈추기',
  summary: '정중앙에서 가장 먼 사람이 벌칙',
  rule: '좌우로 오가는 막대를 정중앙에서 멈춰요. 모두 같은 속도예요. 중앙에서 가장 먼 사람이 벌칙이에요.',
  tint: '#ffe9e3',
  order: 14,
  Component: GaugeGame,
}

export default definition
