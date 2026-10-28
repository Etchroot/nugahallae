import type { Piece } from '../../domain/pieces'
import type { Rng } from '../../domain/rng'

const norm = (x: number) => ((x % 360) + 360) % 360

/** 칸 0은 12시에서 시계방향으로 시작, 포인터는 12시 고정. 휠이 시계방향으로 rotationDeg만큼 돌았을 때 포인터가 가리키는 칸. */
export function segmentAtPointer(rotationDeg: number, count: number): number {
  const a = (360 - norm(rotationDeg)) % 360
  return Math.min(count - 1, Math.floor(a / (360 / count)))
}

const MARGIN = 0.15

export function planSpin(
  currentRotation: number,
  count: number,
  rng: Rng,
  isFinal: boolean,
): { targetRotation: number; landedIndex: number; durationMs: number } {
  const w = 360 / count
  const u = Math.min(rng(), 1 - Number.EPSILON) * count
  const k = Math.min(count - 1, Math.floor(u))
  const frac = MARGIN + (1 - 2 * MARGIN) * (u - k)
  const pointerAngle = (k + frac) * w
  const offset = norm(360 - pointerAngle - norm(currentRotation))
  const turns = isFinal ? 9 : 6
  const targetRotation = currentRotation + 360 * turns + offset
  return {
    targetRotation,
    landedIndex: segmentAtPointer(targetRotation, count),
    durationMs: isFinal ? 7000 : 4500,
  }
}

export interface RouletteState {
  remaining: Piece[]
  spinnerTurn: number
  phase: 'idle' | 'spinning' | 'done'
  lastPassed: Piece | null
  loser: Piece | null
}

export function initRoulette(order: Piece[]): RouletteState {
  return { remaining: [...order], spinnerTurn: 0, phase: 'idle', lastPassed: null, loser: null }
}

export function startSpin(s: RouletteState): RouletteState {
  return s.phase === 'idle' ? { ...s, phase: 'spinning' } : s
}

export function resolveSpin(s: RouletteState, landedIndex: number): RouletteState {
  if (s.phase !== 'spinning') return s
  const passed = s.remaining[landedIndex]
  if (!passed) return s
  const remaining = s.remaining.filter((_, i) => i !== landedIndex)
  const base = { ...s, remaining, lastPassed: passed, spinnerTurn: s.spinnerTurn + 1 }
  return remaining.length === 1
    ? { ...base, phase: 'done', loser: remaining[0] }
    : { ...base, phase: 'idle' }
}

export function currentSpinner(s: RouletteState, order: Piece[]): Piece {
  return order[s.spinnerTurn % order.length]
}
