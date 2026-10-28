import type { Piece } from '../../domain/pieces'
import type { Rng } from '../../domain/rng'

/** CSS 기준 1cm = 37.8px */
export const CM_PX = 37.8
/** 이보다 짧은 선은 무시하고 다시 그리게 한다 */
export const MIN_CM = 0.5
export const MIN_TARGET_CM = 3
export const MAX_TARGET_CM = 9
/** 그리는 영역 좌우 여백(px) */
export const SIDE_PAD = 16

export interface RulerRecord {
  piece: Piece
  /** 그은 길이(cm, 가공 전) */
  cm: number
  /** 정답과의 차이(cm, 소수 1자리 반올림) */
  err: number
}

/** 화면 폭에 들어가는 목표 최대치(0.5cm 단위). 375px 폭이면 9cm */
export function maxTargetCm(viewWidth: number): number {
  const fit = Math.floor(((viewWidth - SIDE_PAD * 2) / CM_PX) * 2) / 2
  return Math.max(MIN_TARGET_CM, Math.min(MAX_TARGET_CM, fit))
}

/** 3cm ~ maxCm, 0.5cm 단위 */
export function pickTarget(rng: Rng, maxCm: number = MAX_TARGET_CM): number {
  const n = Math.round((maxCm - MIN_TARGET_CM) * 2) + 1
  const i = Math.min(n - 1, Math.floor(rng() * n))
  return MIN_TARGET_CM + i / 2
}

/** 가로 거리만 길이로 본다 */
export function dragCm(x0: number, x1: number): number {
  return Math.abs(x1 - x0) / CM_PX
}

export function errorOf(drawnCm: number, target: number): number {
  return Math.round(Math.abs(drawnCm - target) * 10) / 10
}

export function makeRecord(piece: Piece, cm: number, target: number): RulerRecord {
  return { piece, cm, err: errorOf(cm, target) }
}

export function recordText(r: RulerRecord): string {
  return `${r.cm.toFixed(1)}cm (±${r.err.toFixed(1)}cm)`
}

export function whyText(r: RulerRecord): string {
  return `${r.err.toFixed(1)}cm 차이 났어요`
}
