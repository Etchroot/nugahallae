import type { Piece } from '../../domain/pieces'
import type { Rng } from '../../domain/rng'

export const PENALTY_MS = 1000
export const COUNT_STEP_MS = 700
export const WRONG_FLASH_MS = 200
export const PENALTY_FLASH_MS = 600
/** 격자 등장 직후 입력 무시 시간(카운트다운 때 올라온 늦은 손가락 보호) */
export const INPUT_LOCK_MS = 120
export const GRID_SIZE = 16

export interface OrderRecord {
  piece: Piece
  /** 벌점 포함 총 시간(ms) */
  ms: number
  /** 틀린 탭 수 */
  k: number
}

/** 1~16을 Fisher-Yates로 섞는다 */
export function shuffleGrid(rng: Rng): number[] {
  const a = Array.from({ length: GRID_SIZE }, (_, i) => i + 1)
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function makeRecord(piece: Piece, elapsedMs: number, mistakes: number): OrderRecord {
  return { piece, ms: Math.round(elapsedMs) + mistakes * PENALTY_MS, k: mistakes }
}

const secText = (ms: number) => `${(Math.round(ms / 10) / 100).toFixed(2)}초`

export function recordText(r: OrderRecord): string {
  return r.k > 0 ? `${secText(r.ms)} (실수 ${r.k})` : secText(r.ms)
}

export function whyText(r: OrderRecord): string {
  return `${secText(r.ms)}로 가장 느렸어요`
}
