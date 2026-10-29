import { test, expect } from 'vitest'
import { OVERLAP_MS, findOverlapGroup, judge, pickOne } from '../logic'

const P = (index: number, at: number) => ({ index, at })

test('겹침 경계: 249·250ms는 겹침, 251ms는 아님', () => {
  expect(OVERLAP_MS).toBe(250)
  expect(findOverlapGroup([P(0, 0), P(1, 249)])).toEqual([0, 1])
  expect(findOverlapGroup([P(0, 0), P(1, 250)])).toEqual([0, 1])
  expect(findOverlapGroup([P(0, 0), P(1, 251)])).toBeNull()
})

test('같은 시각이면 겹침, 눌린 순서와 상관없이 시각순으로 본다', () => {
  expect(findOverlapGroup([P(2, 100), P(1, 100)])?.slice().sort()).toEqual([1, 2])
  expect(findOverlapGroup([P(3, 900), P(1, 0), P(2, 400)])).toBeNull()
})

test('3명 이상 연쇄 겹침은 이어진 전부를 묶는다', () => {
  const g = findOverlapGroup([P(0, 0), P(1, 200), P(2, 400), P(3, 900)])
  expect(g?.slice().sort()).toEqual([0, 1, 2])
})

test('겹침이 여러 묶음이면 먼저 생긴 묶음', () => {
  expect(findOverlapGroup([P(0, 0), P(1, 100), P(2, 2000), P(3, 2100)])?.slice().sort()).toEqual([0, 1])
})

test('겹치지 않고 n-1명이 누르면 남은 한 명이 마지막', () => {
  const v = judge([P(0, 0), P(2, 1000), P(3, 2000)], 4, () => 0)
  expect(v).toEqual({ kind: 'last', loser: 1 })
})

test('아직 n-2명 이하이고 겹침 없으면 판정 없음', () => {
  expect(judge([P(0, 0), P(2, 1000)], 4, () => 0)).toBeNull()
  expect(judge([], 3, () => 0)).toBeNull()
})

test('겹침이 있으면 마지막 판정보다 우선하고 묶음 중 rng로 한 명', () => {
  const presses = [P(0, 0), P(1, 100), P(3, 5000)]
  expect(judge(presses, 4, () => 0)).toEqual({ kind: 'overlap', loser: 0, group: [0, 1] })
  expect(judge(presses, 4, () => 0.99)).toEqual({ kind: 'overlap', loser: 1, group: [0, 1] })
})

test('같은 사람이 두 번 눌린 기록은 한 번으로 센다', () => {
  expect(judge([P(0, 0), P(0, 10), P(1, 2000)], 3, () => 0)).toEqual({ kind: 'last', loser: 2 })
})

test('pickOne은 rng 값에 따라 고르고 범위를 넘지 않는다', () => {
  expect(pickOne([5, 6, 7], () => 0)).toBe(5)
  expect(pickOne([5, 6, 7], () => 0.5)).toBe(6)
  expect(pickOne([5, 6, 7], () => 0.9999)).toBe(7)
  expect(pickOne([5, 6, 7], () => 1)).toBe(7)
})
