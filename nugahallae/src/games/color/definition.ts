import type { GameDefinition } from '../types'
import { ColorGame } from './ColorGame'

const definition: GameDefinition = {
  id: 'color',
  icon: '🎨',
  title: '글자 색 맞히기',
  summary: '글자 말고 색을 골라요',
  rule: '화면에 나온 글자의 뜻이 아니라 글자 색을 골라요. 10문제를 가장 느리게 푼 사람이 벌칙이에요. 틀리면 1초가 더해져요.',
  tint: '#f6e8ff',
  order: 17,
  Component: ColorGame,
}

export default definition
