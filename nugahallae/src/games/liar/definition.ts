import type { GameDefinition } from '../types'
import { LiarGame } from './LiarGame'

const definition: GameDefinition = {
  id: 'liar',
  icon: '🤥',
  title: '라이어 게임',
  summary: '라이어를 찾아라',
  rule: '한 명만 라이어예요. 모두 같은 주제의 제시어를 확인하지만 라이어는 제시어를 몰라요. 돌아가며 제시어를 설명하고, 이야기를 나눈 뒤 투표로 라이어를 찾아요. 라이어를 못 찾으면 잘못 지목된 사람이 벌칙, 찾으면 라이어가 벌칙이에요.',
  tint: '#e3f7f4',
  minPlayers: 3,
  Component: LiarGame,
}

export default definition
