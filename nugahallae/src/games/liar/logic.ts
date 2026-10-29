import type { Rng } from '../../domain/rng'

export const TOPICS: Record<string, readonly string[]> = {
  음식: ['김밥', '떡볶이', '비빔밥', '된장찌개', '냉면', '잡채', '만두', '호떡'],
  동물: ['고양이', '코끼리', '펭귄', '기린', '거북이', '다람쥐', '돌고래', '하마'],
  장소: ['도서관', '놀이공원', '지하철역', '수영장', '공항', '박물관', '시장', '해수욕장'],
  직업: ['소방관', '요리사', '의사', '선생님', '우주비행사', '사진작가', '경찰관', '농부'],
  스포츠: ['축구', '농구', '야구', '수영', '배드민턴', '탁구', '스키', '볼링'],
  물건: ['우산', '가위', '시계', '안경', '이어폰', '거울', '열쇠', '베개'],
}

export interface LiarSetup {
  topic: string
  word: string
  /** order 안에서의 라이어 인덱스 */
  liar: number
}

const pick = (rng: Rng, n: number) => Math.min(n - 1, Math.floor(rng() * n))

export function initLiar(rng: Rng, players: number): LiarSetup {
  const topics = Object.keys(TOPICS)
  const topic = topics[pick(rng, topics.length)]
  const words = TOPICS[topic]
  const word = words[pick(rng, words.length)]
  const liar = pick(rng, players)
  return { topic, word, liar }
}

/** votes[i] = i번째 사람이 지목한 인덱스(미투표는 -1). 최다 득표 인덱스, 동점이면 rng. */
export function tally(votes: number[], players: number, rng: Rng): number {
  const counts = Array.from({ length: players }, () => 0)
  for (const v of votes) if (v >= 0 && v < players) counts[v]++
  const max = Math.max(...counts)
  const top = counts.flatMap((c, i) => (c === max ? [i] : []))
  return top[pick(rng, top.length)]
}

export function resolveLiar(pointed: number, liar: number): { caught: boolean; loser: number } {
  return { caught: pointed === liar, loser: pointed }
}
