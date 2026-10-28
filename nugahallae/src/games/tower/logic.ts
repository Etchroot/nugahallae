import type { Piece } from '../../domain/pieces'
import type { Rng } from '../../domain/rng'

export const ROWS = 14
export const COLS = 3
/** 맨 윗줄 인덱스(0이 맨 아래). 못 뺀다 */
export const TOP = ROWS - 1

export interface TowerState {
  /** rows[0]이 맨 아래 줄. true면 블록이 남아 있다 */
  rows: boolean[][]
  pulled: number
  idx: number
  phase: 'play' | 'collapsed'
  loser: Piece | null
}

export type PullResult = 'ignored' | 'top' | 'last' | 'safe' | 'collapse'

export function initTower(): TowerState {
  return {
    rows: Array.from({ length: ROWS }, () => Array<boolean>(COLS).fill(true)),
    pulled: 0,
    idx: 0,
    phase: 'play',
    loser: null,
  }
}

/** 블록을 뺀 직후의 줄(left)과 누적 뺀 개수(pulled)로 무너질 확률을 구한다 */
export function collapseRisk(left: boolean[], r: number, pulled: number): number {
  let risk = 0.02 + pulled * 0.02
  const remain = left.filter(Boolean).length
  if (remain === 1 && !left[1]) risk += 0.35 // 가장자리 하나만 남음
  else if (remain === 1) risk += 0.08 // 가운데 하나만 남음
  risk += (ROWS - r) * 0.004 // 아래쪽일수록 위험
  return risk
}

export function pullBlock(
  s: TowerState,
  r: number,
  i: number,
  order: Piece[],
  rng: Rng,
): { state: TowerState; result: PullResult } {
  if (s.phase !== 'play') return { state: s, result: 'ignored' }
  if (r === TOP) return { state: s, result: 'top' }
  const row = s.rows[r]
  if (!row || !row[i]) return { state: s, result: 'ignored' }
  if (row.filter(Boolean).length === 1) return { state: s, result: 'last' }
  const left = row.map((b, k) => (k === i ? false : b))
  const rows = s.rows.map((x, k) => (k === r ? left : x))
  const pulled = s.pulled + 1
  if (rng() < collapseRisk(left, r, pulled)) {
    return {
      state: { ...s, rows, pulled, phase: 'collapsed', loser: order[s.idx % order.length] },
      result: 'collapse',
    }
  }
  return {
    state: { ...s, rows, pulled, idx: (s.idx + 1) % order.length },
    result: 'safe',
  }
}
