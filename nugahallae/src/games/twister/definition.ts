import type { GameDefinition } from '../types'
import { lazyGame } from '../lazyGame'

const definition: GameDefinition = {
  id: 'twister',
  icon: '🌀',
  title: '잰말놀이',
  summary: '틀리거나 느리면 벌칙',
  rule: '어려운 문장을 소리 내어 빠르고 정확하게 읽어요. 모두 같은 문장이에요. 틀린 사람이 가장 나쁘고, 모두 맞히면 가장 느린 사람이 벌칙이에요.',
  tint: '#fff4d6',
  minPlayers: 2,
  Component: lazyGame(() => import('./TwisterGame').then((m) => ({ default: m.TwisterGame }))),
}

export default definition
