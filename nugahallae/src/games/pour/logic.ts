import type { Piece } from '../../domain/pieces'
import type { Rng } from '../../domain/rng'

export const CAP = 100
export const POUR_RATE = 14
export const DROP = 0.6
export const TAP_MS = 160
export const DOME_RANGE = 14
export const LIMIT_MIN = 6
export const LIMIT_MAX = 14
export const TREMBLE_RATIO = 0.8

export interface PourState {
  volume: number
  limit: number
  turn: number
  pouredThisTurn: number
  phase: 'playing' | 'spilled'
  loser: Piece | null
}

export function initPour(rng: Rng): PourState {
  return {
    volume: 0,
    limit: LIMIT_MIN + rng() * (LIMIT_MAX - LIMIT_MIN),
    turn: 0,
    pouredThisTurn: 0,
    phase: 'playing',
    loser: null,
  }
}

export function currentPourer(s: PourState, order: Piece[]): Piece {
  return order[s.turn % order.length]
}

export function addWater(s: PourState, amount: number, order: Piece[]): PourState {
  if (s.phase !== 'playing' || !(amount > 0)) return s
  const volume = s.volume + amount
  const pouredThisTurn = s.pouredThisTurn + amount
  if (volume - CAP >= s.limit) {
    return { ...s, volume, pouredThisTurn, phase: 'spilled', loser: currentPourer(s, order) }
  }
  return { ...s, volume, pouredThisTurn }
}

export function canPass(s: PourState): boolean {
  return s.phase === 'playing' && s.pouredThisTurn > 0
}

export function passTurn(s: PourState): PourState {
  if (!canPass(s)) return s
  return { ...s, turn: s.turn + 1, pouredThisTurn: 0 }
}

export function domeLevel(volume: number): number {
  return Math.min(1, Math.max(0, (volume - CAP) / DOME_RANGE))
}

export function isTrembling(s: PourState): boolean {
  return s.phase === 'playing' && s.volume - CAP >= s.limit * TREMBLE_RATIO
}
