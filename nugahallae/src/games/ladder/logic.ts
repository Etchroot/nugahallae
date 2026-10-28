import type { Piece } from '../../domain/pieces'
import type { Rng } from '../../domain/rng'

export const LEVELS = 10
export const RUNG_PROB = 0.45
export const TRACE_MS = 2500

export interface Ladder {
  cols: number
  /** rungs[level][gap]: gap은 세로줄 gap과 gap+1 사이 */
  rungs: boolean[][]
  bad: number
}

const pick = (rng: Rng, n: number) => Math.min(n - 1, Math.floor(rng() * n))

export function createLadder(cols: number, rng: Rng): Ladder {
  if (!Number.isInteger(cols) || cols < 2 || cols > 10) {
    throw new RangeError('cols must be an integer between 2 and 10')
  }
  const gaps = cols - 1
  const rungs: boolean[][] = Array.from({ length: LEVELS }, () => Array<boolean>(gaps).fill(false))
  // 모든 gap에 최소 1개: 이웃 gap과 다른 높이로 먼저 하나씩 놓는다.
  let prev = -1
  for (let g = 0; g < gaps; g++) {
    let level = pick(rng, prev < 0 ? LEVELS : LEVELS - 1)
    if (prev >= 0 && level >= prev) level++
    rungs[level][g] = true
    prev = level
  }
  // 나머지는 확률로, 이웃한 가로줄이 없을 때만.
  for (let l = 0; l < LEVELS; l++) {
    for (let g = 0; g < gaps; g++) {
      if (rungs[l][g]) continue
      const r = rng()
      if (r < RUNG_PROB && !rungs[l][g - 1] && !rungs[l][g + 1]) rungs[l][g] = true
    }
  }
  return { cols, rungs, bad: pick(rng, cols) }
}

export interface TracePoint {
  x: number
  y: number
}

export function traceLadder(l: Ladder, start: number): { points: TracePoint[]; end: number } {
  let x = start
  const points: TracePoint[] = [{ x, y: 0 }]
  for (let level = 0; level < LEVELS; level++) {
    const y = level + 1
    const row = l.rungs[level]
    let nx = x
    if (row[x]) nx = x + 1
    else if (x > 0 && row[x - 1]) nx = x - 1
    if (nx !== x) {
      points.push({ x, y }, { x: nx, y })
      x = nx
    }
  }
  points.push({ x, y: LEVELS + 1 })
  return { points, end: x }
}

export interface LadderState {
  turn: number
  phase: 'idle' | 'tracing' | 'done'
  revealed: Array<{ col: number; piece: Piece; bad: boolean }>
  loser: Piece | null
}

export function initLadderState(): LadderState {
  return { turn: 0, phase: 'idle', revealed: [], loser: null }
}

export function startTrace(s: LadderState): LadderState {
  if (s.phase !== 'idle') return s
  return { ...s, phase: 'tracing' }
}

export function finishTrace(s: LadderState, l: Ladder, order: Piece[]): LadderState {
  if (s.phase !== 'tracing') return s
  const piece = order[s.turn]
  const col = traceLadder(l, s.turn).end
  const bad = col === l.bad
  const revealed = [...s.revealed, { col, piece, bad }]
  if (bad) return { turn: s.turn, phase: 'done', revealed, loser: piece }
  return { turn: s.turn + 1, phase: 'idle', revealed, loser: null }
}

export function currentTracer(s: LadderState, order: Piece[]): Piece {
  return order[Math.min(s.turn, order.length - 1)]
}
