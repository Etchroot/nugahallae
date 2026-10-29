import type { GameDefinition } from '../types'
import { TowerGame } from './TowerGame'

const definition: GameDefinition = {
  id: 'tower',
  icon: '🧱',
  title: '블록 탑',
  summary: '하나씩 빼다 무너뜨리면 벌칙',
  rule: '돌아가며 블록을 하나씩 빼요. 맨 윗줄은 못 빼고, 한 줄에 마지막 남은 블록도 못 빼요. 뺄수록 탑이 불안해져요. 무너뜨린 사람이 벌칙이에요.',
  tint: '#fbeee0',
  order: 8,
  Component: TowerGame,
}

export default definition
