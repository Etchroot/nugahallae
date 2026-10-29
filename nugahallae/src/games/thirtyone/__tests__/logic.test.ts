import { test, expect } from 'vitest'
import { drawPieces } from '../../../domain/pieces'
import { LIMIT, canPick, currentPlayer, initThirtyOne, pickCount, spoken } from '../logic'

const order = drawPieces(3, () => 0.5)

test('0에서 시작하고 첫 차례는 order[0]', () => {
  const s = initThirtyOne()
  expect(s.n).toBe(0)
  expect(LIMIT).toBe(31)
  expect(currentPlayer(s, order)).toBe(order[0])
})

test('spoken은 실제로 불러야 할 숫자들', () => {
  expect(spoken(0, 1)).toEqual([1])
  expect(spoken(4, 3)).toEqual([5, 6, 7])
})

test('n=29: 1개·2개만 가능, 3개 불가', () => {
  expect([1, 2, 3].map((c) => canPick(29, c))).toEqual([true, true, false])
})
test('n=30: 1개만 가능', () => {
  expect([1, 2, 3].map((c) => canPick(30, c))).toEqual([true, false, false])
})
test('n=28: 3개(29,30,31)까지 가능', () => {
  expect([1, 2, 3].map((c) => canPick(28, c))).toEqual([true, true, true])
})
test('범위 밖 개수는 불가', () => {
  expect(canPick(0, 0)).toBe(false)
  expect(canPick(0, 4)).toBe(false)
  expect(canPick(0, 1.5)).toBe(false)
})

test('고르면 n이 늘고 차례가 순환한다', () => {
  let s = initThirtyOne()
  s = pickCount(s, 2, order)
  expect(s.n).toBe(2)
  expect(currentPlayer(s, order)).toBe(order[1])
  s = pickCount(s, 3, order)
  s = pickCount(s, 1, order)
  expect(s.n).toBe(6)
  expect(currentPlayer(s, order)).toBe(order[0])
})

test('31을 부르면 그 차례 말이 loser', () => {
  let s = { ...initThirtyOne(), n: 30, turn: 1 }
  s = pickCount(s, 1, order)
  expect(s.phase).toBe('lost')
  expect(s.n).toBe(31)
  expect(s.loser).toBe(order[1])
})
test('3개로 31에 도달해도 loser', () => {
  const s = pickCount({ ...initThirtyOne(), n: 28, turn: 2 }, 3, order)
  expect(s.loser).toBe(order[2])
})

test('불가능한 선택과 결정 뒤 입력은 무시(같은 객체)', () => {
  const s = { ...initThirtyOne(), n: 30 }
  expect(pickCount(s, 2, order)).toBe(s)
  const lost = pickCount(s, 1, order)
  expect(pickCount(lost, 1, order)).toBe(lost)
})
