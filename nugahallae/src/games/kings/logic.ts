import type { Rng } from '../../domain/rng'

export const CARD_COUNT = 16
export const KING_COUNT = 4

export type EffectKind = 'again' | 'skip' | 'say'
export interface Effect {
  kind: EffectKind
  text: string
}

/** 효과 카드 12종(중복 없이 한 장씩). again·skip만 앱이 처리하고 나머지는 말·행동 안내 */
export const EFFECTS: readonly Effect[] = [
  { kind: 'again', text: '한 번 더 뽑기' },
  { kind: 'skip', text: '다음 사람 건너뛰기' },
  { kind: 'say', text: '왼쪽 사람에게 칭찬 한마디' },
  { kind: 'say', text: '오른쪽 사람과 하이파이브' },
  { kind: 'say', text: '지금 기대되는 일 하나 말하기' },
  { kind: 'say', text: '좋아하는 음식 하나 말하기' },
  { kind: 'say', text: '모두 박수 세 번' },
  { kind: 'say', text: '오늘 있었던 일 한 가지 말하기' },
  { kind: 'say', text: '쉬어 가요 (아무 일 없음)' },
  { kind: 'say', text: '쉬어 가요 (아무 일 없음)' },
  { kind: 'say', text: '옆 사람에게 가볍게 인사하기' },
  { kind: 'say', text: '가장 좋아하는 계절 말하기' },
]

export interface KingsState {
  players: number
  /** 카드 배치. -1 = 왕, 0..11 = EFFECTS 번호. 화면에 보이지 않는다 */
  cards: number[]
  drawn: boolean[]
  kings: number
  idx: number
  phase: 'pick' | 'show' | 'over'
  last: number | null
  loserIdx: number | null
}

export function initKings(players: number, rng: Rng): KingsState {
  const pool = [
    ...Array.from({ length: KING_COUNT }, () => -1),
    ...EFFECTS.map((_, i) => i),
  ]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return {
    players,
    cards: pool,
    drawn: pool.map(() => false),
    kings: 0,
    idx: 0,
    phase: 'pick',
    last: null,
    loserIdx: null,
  }
}

export type Face = { kind: 'king' } | { kind: 'effect'; effect: EffectKind; text: string }

export function faceOf(s: KingsState, i: number): Face {
  const c = s.cards[i]
  if (c < 0) return { kind: 'king' }
  return { kind: 'effect', effect: EFFECTS[c].kind, text: EFFECTS[c].text }
}

export type DrawEvent = 'ignored' | 'king' | 'last-king' | 'effect'

export function drawCard(s: KingsState, i: number): { state: KingsState; event: DrawEvent } {
  if (s.phase !== 'pick' || i < 0 || i >= s.cards.length || s.drawn[i])
    return { state: s, event: 'ignored' }
  const drawn = s.drawn.slice()
  drawn[i] = true
  if (s.cards[i] < 0) {
    const kings = s.kings + 1
    if (kings >= KING_COUNT)
      return {
        state: { ...s, drawn, kings, phase: 'over', last: i, loserIdx: s.idx % s.players },
        event: 'last-king',
      }
    return { state: { ...s, drawn, kings, phase: 'show', last: i }, event: 'king' }
  }
  return { state: { ...s, drawn, phase: 'show', last: i }, event: 'effect' }
}

/** 뽑은 카드를 확인하고 다음 뽑기로. passed: 차례가 다른 사람에게 넘어갔는지 */
export function confirmCard(s: KingsState): { state: KingsState; passed: boolean } {
  if (s.phase !== 'show' || s.last === null) return { state: s, passed: false }
  const face = faceOf(s, s.last)
  let step = 1
  if (face.kind === 'effect' && face.effect === 'again') step = 0
  else if (face.kind === 'effect' && face.effect === 'skip') step = 2
  return {
    state: { ...s, idx: s.idx + step, phase: 'pick', last: null },
    passed: step % s.players !== 0,
  }
}
