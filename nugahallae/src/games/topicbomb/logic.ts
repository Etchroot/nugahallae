import type { Rng } from '../../domain/rng'

export const FUSE_MIN = 9000
export const FUSE_MAX = 25000
export const MAX_SWAPS = 3

export const TOPICS: readonly string[] = [
  '과일',
  '채소',
  '동물',
  '곤충',
  '바다 생물',
  '나라 이름',
  '도시 이름',
  '지하철역 이름',
  '교과목',
  '운동 종목',
  '악기',
  '직업',
  '한식 메뉴',
  '분식 메뉴',
  '배달 음식',
  '카페 메뉴',
  '명절 음식',
  '영화 장르',
  '탈것',
  '가전제품',
  '집에 있는 물건',
  '학교에 있는 물건',
  '캠핑 준비물',
  '여행지',
  '계절 하면 떠오르는 것',
  '색깔이 들어간 단어',
  '세 글자 단어',
  '꽃 이름',
  '겨울에 생각나는 것',
  '놀이공원 시설',
]

export interface TopicBombState {
  /** TOPICS 번호 */
  topic: number
  swaps: number
  /** 심지 길이(ms). 화면에 보이지 않는다 */
  fuse: number
  idx: number
  phase: 'idle' | 'lit' | 'exploded'
  loserIdx: number | null
}

export function initTopicBomb(rng: Rng): TopicBombState {
  const topic = Math.min(TOPICS.length - 1, Math.floor(rng() * TOPICS.length))
  const fuse = Math.min(FUSE_MAX, FUSE_MIN + Math.floor(rng() * (FUSE_MAX - FUSE_MIN + 1)))
  return { topic, swaps: 0, fuse, idx: 0, phase: 'idle', loserIdx: null }
}

/** 시작 전에만, 최대 MAX_SWAPS번. 현재 주제를 뺀 나머지 중에서 고른다 */
export function swapTopic(s: TopicBombState, rng: Rng): TopicBombState {
  if (s.phase !== 'idle' || s.swaps >= MAX_SWAPS) return s
  const k = Math.min(TOPICS.length - 2, Math.floor(rng() * (TOPICS.length - 1)))
  return { ...s, topic: k >= s.topic ? k + 1 : k, swaps: s.swaps + 1 }
}

export function ignite(s: TopicBombState): TopicBombState {
  return s.phase === 'idle' ? { ...s, phase: 'lit' } : s
}

export function passBomb(s: TopicBombState, players: number): TopicBombState {
  return s.phase === 'lit' ? { ...s, idx: (s.idx + 1) % players } : s
}

export function explode(s: TopicBombState, players: number): TopicBombState {
  return s.phase === 'lit' ? { ...s, phase: 'exploded', loserIdx: s.idx % players } : s
}

/** 시간이 갈수록 빨라지는 흔들림 한 번의 길이(초) */
export function shakeSeconds(elapsed: number, fuse: number): number {
  return Math.max(0.08, 0.5 - (elapsed / fuse) * 0.42)
}
