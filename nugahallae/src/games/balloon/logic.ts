import type { Piece } from '../../domain/pieces'
import type { Rng } from '../../domain/rng'

export const MAX_PUMP = 3
export const POP_MIN = 4

export interface BalloonState {
  /** 터지는 누적 펌프 횟수. 화면에 보이지 않는다 */
  pop: number
  total: number
  mine: number
  turn: number
  phase: 'playing' | 'popped'
  loser: Piece | null
}

export function initBalloon(rng: Rng, players: number): BalloonState {
  const max = 6 + players * 3
  const pop = Math.min(max, POP_MIN + Math.floor(rng() * (max - POP_MIN + 1)))
  return { pop, total: 0, mine: 0, turn: 0, phase: 'playing', loser: null }
}

export function canPump(s: BalloonState): boolean {
  return s.phase === 'playing' && s.mine < MAX_PUMP
}

export function canPass(s: BalloonState): boolean {
  return s.phase === 'playing' && s.mine >= 1
}

export function pump(s: BalloonState, order: Piece[]): BalloonState {
  if (!canPump(s)) return s
  const total = s.total + 1
  const mine = s.mine + 1
  if (total >= s.pop) {
    return { ...s, total, mine, phase: 'popped', loser: order[s.turn % order.length] }
  }
  return { ...s, total, mine }
}

export function passTurn(s: BalloonState, order: Piece[]): BalloonState {
  if (!canPass(s)) return s
  return { ...s, mine: 0, turn: (s.turn + 1) % order.length }
}

export function balloonScale(total: number): number {
  return Math.min(2.6, 1 + total * 0.09)
}
