import type { GameDefinition } from '../types'
import { lazyGame } from '../lazyGame'

const definition: GameDefinition = {
  id: 'topicbomb',
  icon: '💬',
  title: '주제 말하기 폭탄',
  summary: '주제를 말하며 폭탄 넘기기',
  rule: '주제가 정해지면 폭탄이 돌아요. 폭탄을 받으면 주제에 맞는 말을 하나 소리 내어 말하고 다음 사람에게 넘겨요. 이미 나온 말은 안 돼요. 폭탄이 터질 때 들고 있는 사람이 벌칙이에요.',
  tint: '#efe8ff',
  minPlayers: 2,
  Component: lazyGame(() => import('./TopicBombGame').then((m) => ({ default: m.TopicBombGame }))),
}

export default definition
