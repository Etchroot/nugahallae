import type { Piece } from '../../domain/pieces'
import type { Rng } from '../../domain/rng'

export const NEED = 7
export const FUSE_MIN = 12000
export const FUSE_MAX = 30000

export interface BombState {
  /** 심지 길이(ms). 화면에 보이지 않는다 */
  fuse: number
  idx: number
  taps: number
  phase: 'idle' | 'lit' | 'exploded'
  loser: Piece | null
}

export function initBomb(rng: Rng): BombState {
  return {
    fuse: Math.min(FUSE_MAX, FUSE_MIN + Math.floor(rng() * (FUSE_MAX - FUSE_MIN + 1))),
    idx: 0,
    taps: 0,
    phase: 'idle',
    loser: null,
  }
}

export function ignite(s: BombState): BombState {
  return s.phase === 'idle' ? { ...s, phase: 'lit' } : s
}

export function tapBomb(
  s: BombState,
  order: Piece[],
): { state: BombState; passed: boolean } {
  if (s.phase !== 'lit') return { state: s, passed: false }
  const taps = s.taps + 1
  if (taps >= NEED) {
    return { state: { ...s, taps: 0, idx: (s.idx + 1) % order.length }, passed: true }
  }
  return { state: { ...s, taps }, passed: false }
}

export function explode(s: BombState, order: Piece[]): BombState {
  if (s.phase !== 'lit') return s
  return { ...s, phase: 'exploded', loser: order[s.idx % order.length] }
}

/** 시간이 갈수록 빨라지는 흔들림 한 번의 길이(초). 심지의 75% 지점에서 포화해 남은 시간을 짐작하기 어렵다 */
export function shakeSeconds(elapsed: number, fuse: number): number {
  const p = Math.min(1, elapsed / (fuse * 0.75))
  const eased = 1 - (1 - p) * (1 - p)
  return Math.max(0.08, 0.5 - eased * 0.42)
}
