import type { GameDefinition } from '../types'
import { LastTouchGame } from './LastTouchGame'

const definition: GameDefinition = {
  id: 'lasttouch',
  icon: '☝️',
  title: '마지막 터치',
  summary: '신호 뒤 가장 늦게 누르면 벌칙',
  rule: '화면이 바뀌는 신호가 나오면 모두 자기 칸을 최대한 빨리 눌러요. 가장 늦게 누른 사람이 벌칙이에요. 신호 전에 누르면 바로 벌칙이에요.',
  tint: '#fff0e3',
  minPlayers: 3,
  Component: LastTouchGame,
}

export default definition
