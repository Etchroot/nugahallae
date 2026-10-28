import type { Rng } from '../../domain/rng'

export interface Settled<T> {
  /** 좋은 순서. 맨 끝이 loser */
  ranked: T[]
  loser: T
  /** 가장 나쁜 기록이 동점이라 rng로 골랐는지 */
  tie: boolean
}

/**
 * 순서 기록형 게임 정산. worse가 'higher'면 값이 클수록 나쁘다.
 * 가장 나쁜 기록이 동점이면 그중 rng로 하나를 loser로 고른다.
 */
export function settleWorst<T>(
  rows: T[],
  score: (r: T) => number,
  worse: 'higher' | 'lower',
  rng: Rng,
): Settled<T> {
  if (rows.length === 0) throw new RangeError('rows must not be empty')
  const sign = worse === 'higher' ? 1 : -1
  const sorted = [...rows].sort((a, b) => sign * (score(a) - score(b)))
  const worst = sign * score(sorted[sorted.length - 1])
  const tied = sorted.filter((r) => sign * score(r) === worst)
  const idx = Math.min(tied.length - 1, Math.floor(rng() * tied.length))
  // 동점 구간은 정렬 결과의 끝에 모여 있다. 고른 행을 인덱스로 빼서 중복 값도 안전하다.
  const pos = sorted.length - tied.length + idx
  const loser = sorted[pos]
  const ranked = [...sorted.slice(0, pos), ...sorted.slice(pos + 1), loser]
  return { ranked, loser, tie: tied.length > 1 }
}
