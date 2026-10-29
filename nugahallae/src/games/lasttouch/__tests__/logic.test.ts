import { test, expect } from 'vitest'
import { LIMIT_MS, WAIT_MAX_MS, WAIT_MIN_MS, judgeLast, signalDelay } from '../logic'

const P = (index: number, at: number) => ({ index, at })

test('신호 시점은 1.5~6초 범위', () => {
  expect(WAIT_MIN_MS).toBe(1500)
  expect(WAIT_MAX_MS).toBe(6000)
  expect(signalDelay(() => 0)).toBe(1500)
  expect(signalDelay(() => 0.5)).toBe(3750)
  const hi = signalDelay(() => 0.999999)
  expect(hi).toBeGreaterThan(5990)
  expect(hi).toBeLessThanOrEqual(6000)
  for (let i = 0; i < 100; i++) {
    const d = signalDelay(Math.random)
    expect(d).toBeGreaterThanOrEqual(1500)
    expect(d).toBeLessThanOrEqual(6000)
  }
})

test('가장 늦게 누른 사람이 loser, 시간은 신호 기준', () => {
  const r = judgeLast([P(2, 1300), P(0, 1450), P(1, 1900)], 3, 1000, () => 0)
  expect(r.loser).toBe(1)
  expect(r.times).toEqual([450, 900, 300])
  expect(r.tie).toBe(false)
})

test('누르지 않은 사람은 3초 초과로 최하위', () => {
  expect(LIMIT_MS).toBe(3000)
  const r = judgeLast([P(0, 1100), P(2, 1200)], 3, 1000, () => 0)
  expect(r.loser).toBe(1)
  expect(r.times[1]).toBeNull()
})

test('안 누른 사람이 여러 명이면 그중 rng', () => {
  const rows = [P(0, 1100)]
  expect(judgeLast(rows, 4, 1000, () => 0).loser).toBe(1)
  expect(judgeLast(rows, 4, 1000, () => 0.5).loser).toBe(2)
  expect(judgeLast(rows, 4, 1000, () => 0.99).loser).toBe(3)
  expect(judgeLast(rows, 4, 1000, () => 0).tie).toBe(true)
})

test('가장 늦은 기록이 1ms 이하 차이면 동시 도착으로 rng, 2ms면 아님', () => {
  const close = [P(0, 1100), P(1, 1500), P(2, 1501)]
  expect(judgeLast(close, 3, 1000, () => 0)).toMatchObject({ loser: 1, tie: true })
  expect(judgeLast(close, 3, 1000, () => 0.99)).toMatchObject({ loser: 2, tie: true })
  const apart = [P(0, 1100), P(1, 1500), P(2, 1502)]
  expect(judgeLast(apart, 3, 1000, () => 0)).toMatchObject({ loser: 2, tie: false })
})

test('신호보다 이른 기록은 0ms로 본다', () => {
  expect(judgeLast([P(0, 990), P(1, 1100)], 2, 1000, () => 0).times).toEqual([0, 100])
})
