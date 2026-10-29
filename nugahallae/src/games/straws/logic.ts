import type { Piece } from '../../domain/pieces'
import type { Rng } from '../../domain/rng'

export const SHORT_LEN = 22
export const LONG_LEN = 50

export interface StrawsState {
  /** 막대별 길이(화면에는 뽑은 뒤에만 반영) */
  lengths: number[]
  /** 짧은 막대의 인덱스 */
  short: number
  drawn: boolean[]
  turn: number
  phase: 'playing' | 'lost'
  loser: Piece | null
}

export function initStraws(count: number, rng: Rng): StrawsState {
  const short = Math.min(count - 1, Math.floor(rng() * count))
  return {
    lengths: Array.from({ length: count }, (_, i) => (i === short ? SHORT_LEN : LONG_LEN)),
    short,
    drawn: Array.from({ length: count }, () => false),
    turn: 0,
    phase: 'playing',
    loser: null,
  }
}

export function currentPlayer(s: StrawsState, order: Piece[]): Piece {
  return order[s.turn % order.length]
}

export function drawStraw(s: StrawsState, i: number, order: Piece[]): StrawsState {
  if (s.phase !== 'playing') return s
  if (!Number.isInteger(i) || i < 0 || i >= s.lengths.length || s.drawn[i]) return s
  const drawn = s.drawn.map((d, k) => (k === i ? true : d))
  if (i === s.short) return { ...s, drawn, phase: 'lost', loser: currentPlayer(s, order) }
  return { ...s, drawn, turn: (s.turn + 1) % order.length }
}
