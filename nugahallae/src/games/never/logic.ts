import type { Rng } from '../../domain/rng'

export const FINGERS = 5
/** 첫 0이 나온 뒤 같은 순간 접은 다른 사람을 기다리는 시간 */
export const ZERO_SETTLE_MS = 500

export const SENTENCES: readonly string[] = [
  '나는 지하철에서 내릴 역을 지나쳐 본 적 없다',
  '나는 약속에 늦어서 뛰어가 본 적 없다',
  '나는 우산을 어딘가에 두고 와 본 적 없다',
  '나는 휴대폰을 손에 들고 한참 찾아 본 적 없다',
  '나는 알람을 끄고 다시 잠들어 본 적 없다',
  '나는 같은 영화를 세 번 이상 본 적 없다',
  '나는 혼자 노래방에 가 본 적 없다',
  '나는 라면 국물까지 다 마셔 본 적 없다',
  '나는 비 오는 날 일부러 물웅덩이를 밟아 본 적 없다',
  '나는 밤새 영상을 보다 해가 뜬 적 없다',
  '나는 친구 생일을 깜빡해 본 적 없다',
  '나는 놀이공원에서 길을 잃어 본 적 없다',
  '나는 엘리베이터 닫힘 버튼을 괜히 여러 번 눌러 본 적 없다',
  '나는 말하다가 갑자기 할 말을 잊어 본 적 없다',
  '나는 혼자 연습한 말을 실제로 써먹어 본 적 없다',
  '나는 길에서 아는 사람을 보고 못 본 척해 본 적 없다',
  '나는 이름을 잘못 불러서 민망했던 적 없다',
  '나는 모르는 번호 전화를 받고 당황해 본 적 없다',
  '나는 택배를 기다리며 문 앞에 한참 서 있어 본 적 없다',
  '나는 시험 전날 밤에 처음 책을 펴 본 적 없다',
  '나는 여행 짐을 싸고 가장 중요한 걸 두고 가 본 적 없다',
  '나는 하루 종일 같은 노래만 들어 본 적 없다',
  '나는 맛집 줄을 한 시간 넘게 서 본 적 없다',
  '나는 단체 사진에서 눈을 감은 채 찍혀 본 적 없다',
  '나는 비밀번호를 까먹어서 재설정해 본 적 없다',
  '나는 버스를 반대 방향으로 타 본 적 없다',
  '나는 하루에 커피나 차를 다섯 잔 이상 마셔 본 적 없다',
  '나는 새벽에 갑자기 야식이 먹고 싶어 일어나 본 적 없다',
  '나는 친구에게 받은 선물을 다른 사람에게 줘 본 적 없다',
  '나는 웃음을 참느라 눈물이 난 적 없다',
]

export interface Deck {
  queue: string[]
  last: string | null
}

function shuffled(rng: Rng): string[] {
  const a = [...SENTENCES]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function newDeck(rng: Rng): Deck {
  return { queue: shuffled(rng), last: null }
}

/** 한 문장을 뽑는다. 30개를 다 쓰면 다시 섞되, 직전 문장이 곧바로 또 나오지 않게 한다. */
export function draw(deck: Deck, rng: Rng): { sentence: string; deck: Deck } {
  let q = deck.queue
  if (q.length === 0) {
    q = shuffled(rng)
    if (q[0] === deck.last) [q[0], q[q.length - 1]] = [q[q.length - 1], q[0]]
  }
  return { sentence: q[0], deck: { queue: q.slice(1), last: q[0] } }
}

export function initFingers(n: number): number[] {
  return Array.from({ length: n }, () => FINGERS)
}

export function foldFinger(fingers: number[], index: number): number[] {
  return fingers.map((f, i) => (i === index ? Math.max(0, f - 1) : f))
}

export function zeroed(fingers: number[]): number[] {
  return fingers.flatMap((f, i) => (f === 0 ? [i] : []))
}
