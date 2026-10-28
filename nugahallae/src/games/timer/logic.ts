import type { Piece } from '../../domain/pieces'
import type { Rng } from '../../domain/rng'

export const BLIND_MS = 1500

export interface TimerRecord {
  piece: Piece
  /** 실제로 멈춘 시간(초) */
  v: number
  /** 목표와의 차이(초, 절댓값) */
  d: number
}

/** 5.0~10.0초, 0.1초 단위 */
export function pickTarget(rng: Rng): number {
  const tenths = Math.min(100, 50 + Math.floor(rng() * 51))
  return tenths / 10
}

export function displayElapsed(ms: number): string {
  return ms > BLIND_MS ? '?.??' : (ms / 1000).toFixed(2)
}

export function makeRecord(piece: Piece, elapsedMs: number, target: number): TimerRecord {
  const v = elapsedMs / 1000
  return { piece, v, d: Math.abs(v - target) }
}

export function recordText(r: TimerRecord): string {
  return `${r.v.toFixed(2)}초 (±${r.d.toFixed(2)})`
}
