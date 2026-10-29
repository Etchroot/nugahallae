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

// 휠 CSS 전환과 같은 곡선: cubic-bezier(0.12, 0.7, 0.1, 1)
const EASE = { x1: 0.12, y1: 0.7, x2: 0.1, y2: 1 }
const bez = (a: number, b: number, s: number) => 3 * (1 - s) * (1 - s) * s * a + 3 * (1 - s) * s * s * b + s * s * s

/** 진행률 y(0~1)에 닿는 시간 비율 x(0~1). 곡선의 y는 단조 증가라 이분법으로 찾는다 */
export function easeTimeAt(y: number): number {
  let lo = 0
  let hi = 1
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (bez(EASE.y1, EASE.y2, mid) < y) lo = mid
    else hi = mid
  }
  return bez(EASE.x1, EASE.x2, (lo + hi) / 2)
}

/**
 * 돌림판 걸쇠 소리 시각(ms). 회전이 칸 경계(360/count의 배수)를 지날 때마다 한 번.
 * 처음엔 너무 촘촘하므로 직전 틱과 minGapMs보다 가까운 틱은 버린다.
 */
export function tickTimes(
  fromDeg: number,
  toDeg: number,
  count: number,
  durationMs: number,
  minGapMs = 40,
): number[] {
  if (!(toDeg > fromDeg) || count < 1 || !(durationMs > 0)) return []
  const w = 360 / count
  const out: number[] = []
  for (let m = Math.floor(fromDeg / w) + 1; m * w <= toDeg; m++) {
    const t = easeTimeAt((m * w - fromDeg) / (toDeg - fromDeg)) * durationMs
    if (out.length === 0 || t - out[out.length - 1] >= minGapMs) out.push(t)
  }
  return out
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
