import type { GameDefinition } from '../types'
import { Clap369Game } from './Clap369Game'

const definition: GameDefinition = {
  id: 'clap369',
  icon: '👏',
  title: '369 짝',
  summary: '짝 타이밍을 놓치면 벌칙',
  rule: '숫자가 올라가요. 3, 6, 9가 들어간 숫자는 그 개수만큼 짝! 아니면 숫자 넘기기. 제한 시간 안에 틀리면 벌칙이에요.',
  tint: '#fff0e3',
  minPlayers: 2,
  Component: Clap369Game,
}

export default definition
