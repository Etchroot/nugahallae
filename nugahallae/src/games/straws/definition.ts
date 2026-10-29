import type { GameDefinition } from '../types'
import { StrawsGame } from './StrawsGame'

const definition: GameDefinition = {
  id: 'straws',
  icon: '🥢',
  title: '제비뽑기',
  summary: '짧은 막대를 뽑으면 벌칙',
  rule: '막대가 사람 수만큼 있어요. 차례대로 하나씩 뽑아요. 짧은 막대를 뽑은 사람이 벌칙이에요.',
  tint: '#fff4d6',
  minPlayers: 2,
  Component: StrawsGame,
}

export default definition
