import type { Piece } from '../../domain/pieces'
import type { Rng } from '../../domain/rng'

/** 한쪽 끝에서 반대쪽 끝까지 걸리는 시간 */
export const SWEEP_MS = 900

export interface Round {
  /** 시작 위치 0~1 */
  start: number
  dir: 1 | -1
}

export interface GaugeRecord {
  piece: Piece
  /** 중앙으로부터의 거리 0~100 (소수 1자리) */
  d: number
}

export function pickRound(rng: Rng): Round {
  const start = Math.min(1, Math.max(0, rng()))
  return { start, dir: rng() < 0.5 ? 1 : -1 }
}

/** 시작 후 경과 시간(ms) → 막대 위치 0~1. 등속 왕복(삼각파) */
export function positionAt(round: Round, elapsedMs: number): number {
  const u = round.start + (round.dir * elapsedMs) / SWEEP_MS
  const m = ((u % 2) + 2) % 2
  return m <= 1 ? m : 2 - m
}

export function distanceOf(pos: number): number {
  return Math.round(Math.abs(pos - 0.5) * 200 * 10) / 10
}

export function makeRecord(piece: Piece, rawDistance: number): GaugeRecord {
  return { piece, d: Math.round(rawDistance * 10) / 10 }
}

export function recordText(r: GaugeRecord): string {
  return `중앙에서 ${r.d.toFixed(1)}`
}

export function whyText(r: GaugeRecord): string {
  return `중앙에서 ${r.d.toFixed(1)} 벗어났어요`
}
