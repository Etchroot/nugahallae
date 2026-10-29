import type { GameDefinition } from '../types'
import { NeverGame } from './NeverGame'

const definition: GameDefinition = {
  id: 'never',
  icon: '✋',
  title: '나는 해본 적 없다',
  summary: '손가락 5개를 먼저 접으면 벌칙',
  rule: '문장이 나오면 그 일을 해 본 사람은 자기 칸을 눌러 손가락을 하나 접어요. 손가락 5개를 먼저 다 접은 사람이 벌칙이에요. 솔직하게 눌러요.',
  tint: '#f6e8ff',
  Component: NeverGame,
}

export default definition
