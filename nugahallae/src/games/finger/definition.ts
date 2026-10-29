import type { GameDefinition } from '../types'
import { FingerGame } from './FingerGame'

const definition: GameDefinition = {
  id: 'finger',
  icon: '🖐️',
  title: '손가락 룰렛',
  summary: '다 같이 손가락 올리고 찍히면 벌칙',
  rule: '모두 동시에 화면에 손가락을 올려요. 빛이 손가락들을 돌다가 한 명을 찍어요. 찍힌 사람이 벌칙이에요. 손가락을 떼면 다시 시작해요.',
  tint: '#fff3d6',
  badge: 'NEW',
  pieceMode: 'auto',
  order: 12,
  Component: FingerGame,
}

export default definition
