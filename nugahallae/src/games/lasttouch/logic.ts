import type { Rng } from '../../domain/rng'

export const COUNT_STEP_MS = 700
export const WAIT_MIN_MS = 1500
export const WAIT_MAX_MS = 6000
/** 신호 뒤 이 시간이 지나면 끝(안 누른 사람은 최하위) */
export const LIMIT_MS = 3000
/** 가장 늦은 기록과 이 차이(ms) 이하면 동시 도착 */
export const TIE_MS = 1

export interface Press {
  index: number
  at: number
}

export interface LastResult {
  loser: number
  /** 사람별 신호 뒤 걸린 시간(ms). 안 눌렀으면 null */
  times: (number | null)[]
  tie: boolean
}

export function signalDelay(rng: Rng): number {
  return WAIT_MIN_MS + rng() * (WAIT_MAX_MS - WAIT_MIN_MS)
}

export function judgeLast(presses: Press[], n: number, signalAt: number, rng: Rng): LastResult {
  const times: (number | null)[] = Array.from({ length: n }, () => null)
  for (const p of presses) {
    if (p.index >= 0 && p.index < n && times[p.index] === null) times[p.index] = Math.max(0, p.at - signalAt)
  }
  const missing = times.flatMap((t, i) => (t === null ? [i] : []))
  let candidates: number[]
  if (missing.length > 0) {
    candidates = missing
  } else {
    const max = Math.max(...(times as number[]))
    candidates = times.flatMap((t, i) => ((t as number) >= max - TIE_MS ? [i] : []))
  }
  const loser = candidates[Math.min(candidates.length - 1, Math.floor(rng() * candidates.length))]
  return { loser, times, tie: candidates.length > 1 }
}
