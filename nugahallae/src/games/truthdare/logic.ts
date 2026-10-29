import type { Rng } from '../../domain/rng'

export const TRUTHS: readonly string[] = [
  '요즘 가장 자주 듣는 노래는?',
  '초등학생 때 별명은?',
  '가장 좋아하는 간식 세 가지는?',
  '이번 달에 가장 웃겼던 일은?',
  '처음으로 혼자 가 본 곳은?',
  '지금 가장 가고 싶은 여행지는?',
  '최근에 가장 잘 샀다고 생각한 물건은?',
  '어릴 때 꿈은 무엇이었나요?',
  '하루만 투명해진다면 하고 싶은 일은?',
  '남들은 모르는 나만의 습관이 있다면?',
  '지금까지 받은 선물 중 가장 기억에 남는 것은?',
  '살면서 가장 크게 웃었던 순간은?',
  '무인도에 세 가지만 가져간다면?',
  '최근 가장 열심히 한 일은?',
  '지금 가장 먹고 싶은 음식은?',
]

export const DARES: readonly string[] = [
  '10초 동안 가장 웃긴 표정 짓기',
  '왼쪽 사람을 칭찬 한마디로 웃게 하기',
  '좋아하는 노래 한 소절 부르기',
  "30초 동안 모든 문장 끝에 '~냥' 붙여 말하기",
  '오른쪽 사람과 하이파이브 세 번',
  '동물 흉내를 내고 다른 사람이 맞히기',
  '10초 동안 웃지 않고 버티기(다른 사람은 웃겨 보기)',
  '오늘 있었던 일을 한 문장으로 발표하기',
  '좋아하는 영화 장면 연기하기',
  '앉은 자리에서 가장 멋진 포즈 취하기',
  '한 손으로 박수 소리 내 보기',
  "모두에게 '수고했어요' 한마디씩 듣기",
  '3초 안에 세 글자 단어 말하기',
  '다음 사람에게 인사 크게 하기',
  '30초 동안 존댓말만 쓰기',
]

export type CardKind = 'truth' | 'dare'

export const cardsOf = (kind: CardKind): readonly string[] => (kind === 'truth' ? TRUTHS : DARES)

const pick = (rng: Rng, n: number) => Math.min(n - 1, Math.floor(rng() * n))

export function pickPlayer(rng: Rng, n: number): number {
  return pick(rng, n)
}

/** 이미 쓴 카드를 뺀 나머지 중 하나의 인덱스를 돌려준다. */
export function drawCard(kind: CardKind, used: readonly number[], rng: Rng): number {
  const all = cardsOf(kind).map((_, i) => i)
  const left = all.filter((i) => !used.includes(i))
  const pool = left.length > 0 ? left : all
  return pool[pick(rng, pool.length)]
}
