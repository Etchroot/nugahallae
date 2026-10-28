import type { Piece } from '../../domain/pieces'
import type { Rng } from '../../domain/rng'

export const TEETH = 12

export interface CrocState {
  trap: number
  pressed: boolean[]
  turn: number
  phase: 'playing' | 'bitten'
  loser: Piece | null
}

export function initCroc(rng: Rng): CrocState {
  return {
    trap: Math.min(TEETH - 1, Math.floor(rng() * TEETH)),
    pressed: Array.from({ length: TEETH }, () => false),
    turn: 0,
    phase: 'playing',
    loser: null,
  }
}

export function currentPlayer(s: CrocState, order: Piece[]): Piece {
  return order[s.turn % order.length]
}

export function pressTooth(s: CrocState, i: number, order: Piece[]): CrocState {
  if (s.phase !== 'playing') return s
  if (!Number.isInteger(i) || i < 0 || i >= TEETH || s.pressed[i]) return s
  const pressed = s.pressed.map((p, k) => (k === i ? true : p))
  if (i === s.trap) {
    return { ...s, pressed, phase: 'bitten', loser: currentPlayer(s, order) }
  }
  return { ...s, pressed, turn: (s.turn + 1) % order.length }
}
