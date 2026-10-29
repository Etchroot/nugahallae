import type { GameDefinition } from '../types'
import { NunchiGame } from './NunchiGame'

const definition: GameDefinition = {
  id: 'nunchi',
  icon: '👀',
  title: '눈치 게임',
  summary: '겹치면 벌칙, 마지막도 벌칙',
  rule: '모두 차례 없이 자기 칸을 한 번씩 눌러요. 먼저 누른 순서대로 번호가 붙어요. 다른 사람과 동시에 누르면 겹친 사람이 벌칙이고, 끝까지 누르지 못한 마지막 한 명도 벌칙이에요.',
  tint: '#e6f4ff',
  minPlayers: 3,
  Component: NunchiGame,
}

export default definition
