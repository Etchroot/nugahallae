export const MAX_NUMBER = 99
/** 차례 전환 직후 이 시간 동안은 입력을 무시한다(이전 사람의 연타 방지) */
export const SWITCH_IGNORE_MS = 150

/** n의 각 자리 중 3·6·9의 개수 = 필요한 짝 수 */
export function clapCount(n: number): number {
  return String(Math.abs(Math.trunc(n)))
    .split('')
    .filter((d) => d === '3' || d === '6' || d === '9').length
}

export function limitMs(n: number): number {
  return Math.max(1500, 3500 - 60 * n)
}

export function nextNumber(n: number): number {
  return n >= MAX_NUMBER ? 1 : n + 1
}

export type TapAction = 'skip' | 'clap'
export type TapResult = 'pass' | 'wrong' | 'continue'

/** claps: 지금까지 이 숫자에서 누른 짝 수(이번 탭 제외) */
export function judgeTap(n: number, claps: number, action: TapAction): TapResult {
  const k = clapCount(n)
  if (action === 'skip') return k === 0 ? 'pass' : 'wrong'
  if (k === 0) return 'wrong'
  const total = claps + 1
  if (total > k) return 'wrong'
  return total === k ? 'pass' : 'continue'
}
