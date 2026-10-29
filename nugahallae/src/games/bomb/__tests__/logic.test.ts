import { test, expect } from 'vitest'
import { drawPieces } from '../../../domain/pieces'
import { NEED, FUSE_MIN, FUSE_MAX, initBomb, ignite, tapBomb, explode, shakeSeconds } from '../logic'

const order = drawPieces(3, () => 0.5)

test('심지는 12~30초(rng), 7번 탭', () => {
  expect(NEED).toBe(7)
  expect(initBomb(() => 0).fuse).toBe(FUSE_MIN)
  expect(FUSE_MIN).toBe(12000)
  expect(initBomb(() => 1).fuse).toBe(FUSE_MAX)
  expect(FUSE_MAX).toBe(30000)
})

test('불 붙이기 전에는 탭이 무시된다', () => {
  const s = initBomb(() => 0)
  expect(tapBomb(s, order).state).toBe(s)
})

test('7번 탭하면 다음 사람에게 넘어가고 탭 수가 0으로', () => {
  let s = ignite(initBomb(() => 0))
  for (let i = 0; i < 6; i++) {
    const r = tapBomb(s, order)
    expect(r.passed).toBe(false)
    s = r.state
  }
  expect(s.taps).toBe(6)
  const r = tapBomb(s, order)
  expect(r.passed).toBe(true)
  expect(r.state.idx).toBe(1)
  expect(r.state.taps).toBe(0)
})

test('차례는 순환한다', () => {
  let s = ignite(initBomb(() => 0))
  for (let i = 0; i < NEED * 3; i++) s = tapBomb(s, order).state
  expect(s.idx).toBe(0)
})

test('터지면 들고 있던 말이 loser, 이후 탭 무시', () => {
  let s = ignite(initBomb(() => 0))
  for (let i = 0; i < NEED; i++) s = tapBomb(s, order).state
  s = explode(s, order)
  expect(s.phase).toBe('exploded')
  expect(s.loser).toBe(order[1])
  expect(tapBomb(s, order).state).toBe(s)
  expect(explode(s, order)).toBe(s)
})

test('흔들림 주기는 시간이 갈수록 짧아지고 0.08초 아래로 안 내려간다', () => {
  expect(shakeSeconds(0, 20000)).toBeCloseTo(0.5)
  expect(shakeSeconds(5000, 20000)).toBeGreaterThan(shakeSeconds(10000, 20000))
  expect(shakeSeconds(15000, 20000)).toBeCloseTo(0.08)
  expect(shakeSeconds(99999, 20000)).toBeCloseTo(0.08)
  expect(shakeSeconds(99999, 20000)).toBeGreaterThanOrEqual(0.08)
})

test('흔들림은 심지의 75%에서 포화해 남은 시간을 드러내지 않는다', () => {
  // 75% 이후로는 심지가 얼마나 남았든 같은 속도다
  expect(shakeSeconds(15000, 20000)).toBe(shakeSeconds(19999, 20000))
  expect(shakeSeconds(9000, 12000)).toBe(shakeSeconds(11999, 12000))
  // 마지막 25%(3~7.5초)는 흔들림이 변하지 않는다
  expect(shakeSeconds(22500, 30000)).toBe(shakeSeconds(29999, 30000))
})
