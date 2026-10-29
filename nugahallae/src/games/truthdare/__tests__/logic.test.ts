import { test, expect } from 'vitest'
import { TRUTHS, DARES, pickPlayer, drawCard } from '../logic'

test('카드 목록은 각 15장, 지시서 그대로', () => {
  expect(TRUTHS).toHaveLength(15)
  expect(DARES).toHaveLength(15)
  expect(TRUTHS[0]).toBe('요즘 가장 자주 듣는 노래는?')
  expect(TRUTHS[14]).toBe('지금 가장 먹고 싶은 음식은?')
  expect(DARES[0]).toBe('10초 동안 가장 웃긴 표정 짓기')
  expect(DARES[14]).toBe('30초 동안 존댓말만 쓰기')
  expect(new Set(TRUTHS).size).toBe(15)
  expect(new Set(DARES).size).toBe(15)
})

test('pickPlayer: 0..n-1 범위, 경계 포함, 재현 가능', () => {
  for (let n = 2; n <= 10; n++) {
    expect(pickPlayer(() => 0, n)).toBe(0)
    expect(pickPlayer(() => 0.9999999, n)).toBe(n - 1)
    expect(pickPlayer(() => 1, n)).toBe(n - 1)
  }
  expect(pickPlayer(() => 0.5, 4)).toBe(2)
})

test('drawCard: 목록 안에서만, 이미 쓴 카드는 제외', () => {
  expect(drawCard('truth', [], () => 0)).toBe(0)
  expect(drawCard('dare', [], () => 0.9999)).toBe(14)
  expect(drawCard('truth', [0], () => 0)).toBe(1)
  expect(drawCard('truth', [14], () => 0.9999)).toBe(13)
  const used: number[] = []
  for (let i = 0; i < 15; i++) used.push(drawCard('dare', used, () => 0.3))
  expect(new Set(used).size).toBe(15)
})
