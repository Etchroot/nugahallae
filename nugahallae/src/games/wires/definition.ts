import type { GameDefinition } from '../types'
import { WiresGame } from './WiresGame'

const definition: GameDefinition = {
  id: 'wires',
  icon: '✂️',
  title: '전선 자르기',
  summary: '틀린 전선을 자르면 펑',
  rule: '폭탄에 전선이 여러 개 있어요. 차례마다 제한 시간 안에 하나씩 잘라요. 틀린 전선을 자르거나 시간이 다 되면 펑! 그 사람이 벌칙이에요.',
  tint: '#ffe9e3',
  minPlayers: 2,
  Component: WiresGame,
}

export default definition
