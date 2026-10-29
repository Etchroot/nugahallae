import type { GameDefinition } from '../types'
import { TruthdareGame } from './TruthdareGame'

const definition: GameDefinition = {
  id: 'truthdare',
  icon: '🗣️',
  title: '진실 혹은 미션',
  summary: '걸리면 질문이나 미션 수행',
  rule: '룰렛이 한 명을 정해요. 걸린 사람은 진실 질문과 미션 중 하나를 골라 카드에 적힌 대로 해요.',
  tint: '#ffeaf6',
  minPlayers: 2,
  Component: TruthdareGame,
}

export default definition
