import type { Rng } from '../../domain/rng'

export const WAIT_MIN = 1500
export const WAIT_MAX = 4500
/** 부정출발은 최악의 기록으로 친다 */
export const FOUL = 9999

/** 초록색으로 바뀌기까지의 대기(ms), 1.5~4.5초 */
export function pickWait(rng: Rng): number {
  return Math.min(WAIT_MAX, WAIT_MIN + Math.floor(rng() * (WAIT_MAX - WAIT_MIN + 1)))
}

export function isFoul(v: number): boolean {
  return v >= FOUL
}

export function recordText(v: number): string {
  return isFoul(v) ? '부정출발 🚫' : `${v} ms`
}

export function whyText(v: number): string {
  return isFoul(v) ? '부정출발로 탈락했어요 🚫' : `${v}ms로 제일 느렸어요 🐢`
}
