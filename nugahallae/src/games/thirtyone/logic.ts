import type { Piece } from '../../domain/pieces'

export const LIMIT = 31
export const MAX_PICK = 3

export interface ThirtyOneState {
  /** 지금까지 부른 마지막 숫자 */
  n: number
  turn: number
  phase: 'playing' | 'lost'
  loser: Piece | null
}

export function initThirtyOne(): ThirtyOneState {
  return { n: 0, turn: 0, phase: 'playing', loser: null }
}

export function currentPlayer(s: ThirtyOneState, order: Piece[]): Piece {
  return order[s.turn % order.length]
}

/** n 다음부터 count개를 이어 부를 때 실제로 부르는 숫자들 */
export function spoken(n: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) => n + i + 1)
}

/** 31을 넘기지 않는 1~3개만 고를 수 있다(31을 부르는 버튼은 가능) */
export function canPick(n: number, count: number): boolean {
  return Number.isInteger(count) && count >= 1 && count <= MAX_PICK && n + count <= LIMIT
}

export function pickCount(s: ThirtyOneState, count: number, order: Piece[]): ThirtyOneState {
  if (s.phase !== 'playing' || !canPick(s.n, count)) return s
  const n = s.n + count
  if (n >= LIMIT) return { ...s, n, phase: 'lost', loser: currentPlayer(s, order) }
  return { ...s, n, turn: (s.turn + 1) % order.length }
}
