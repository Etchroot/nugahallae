import type { GameDefinition } from '../types'
import { lazyGame } from '../lazyGame'

const definition: GameDefinition = {
  id: 'ladder',
  icon: '🪜',
  title: '사다리 타기',
  summary: '벌칙 칸은 딱 하나',
  rule: '차례대로 내 동물을 눌러 사다리를 내려가요. 아래 칸 중 벌칙은 딱 하나! 벌칙 칸에 도착한 사람이 걸려요.',
  tint: '#e8f8ef',
  order: 3,
  Component: lazyGame(() => import('./LadderGame').then((m) => ({ default: m.LadderGame }))),
}

export default definition
