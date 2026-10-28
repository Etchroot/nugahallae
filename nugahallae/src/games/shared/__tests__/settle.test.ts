import { test, expect } from 'vitest'
import { settleWorst } from '../settle'

type R = { n: string; v: number }
const rows: R[] = [
  { n: 'a', v: 5 },
  { n: 'b', v: 9 },
  { n: 'c', v: 2 },
]

test('높을수록 나쁨: 가장 큰 값이 loser, ranked는 좋은 순', () => {
  const r = settleWorst(rows, (x) => x.v, 'higher', () => 0)
  expect(r.ranked.map((x) => x.n)).toEqual(['c', 'a', 'b'])
  expect(r.loser.n).toBe('b')
  expect(r.tie).toBe(false)
})

test('낮을수록 나쁨: 가장 작은 값이 loser', () => {
  const r = settleWorst(rows, (x) => x.v, 'lower', () => 0)
  expect(r.ranked.map((x) => x.n)).toEqual(['b', 'a', 'c'])
  expect(r.loser.n).toBe('c')
  expect(r.tie).toBe(false)
})

test('동점이면 rng로 하나 고르고 tie=true, loser는 ranked 맨 끝', () => {
  const t: R[] = [
    { n: 'a', v: 1 },
    { n: 'b', v: 7 },
    { n: 'c', v: 7 },
  ]
  const first = settleWorst(t, (x) => x.v, 'higher', () => 0)
  expect(first.tie).toBe(true)
  expect(first.loser.n).toBe('b')
  expect(first.ranked[first.ranked.length - 1]).toBe(first.loser)
  const last = settleWorst(t, (x) => x.v, 'higher', () => 0.99)
  expect(last.loser.n).toBe('c')
  expect(last.ranked.map((x) => x.n)).toEqual(['a', 'b', 'c'])
})

test('최선 동점은 tie가 아님', () => {
  const r = settleWorst([{ n: 'a', v: 1 }, { n: 'b', v: 1 }, { n: 'c', v: 5 }], (x) => x.v, 'higher', () => 0)
  expect(r.tie).toBe(false)
  expect(r.loser.n).toBe('c')
})

test('원본 배열을 바꾸지 않는다', () => {
  const copy = [...rows]
  settleWorst(rows, (x) => x.v, 'higher', () => 0)
  expect(rows).toEqual(copy)
})
