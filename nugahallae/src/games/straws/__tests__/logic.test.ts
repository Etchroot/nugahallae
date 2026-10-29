import { test, expect } from 'vitest'
import { drawPieces } from '../../../domain/pieces'
import { LONG_LEN, SHORT_LEN, currentPlayer, drawStraw, initStraws } from '../logic'

const order = drawPieces(4, () => 0.5)

test('막대 수 = 인원수, 짧은 막대는 정확히 하나이고 길이 값이 다르다', () => {
  const s = initStraws(4, () => 0.6)
  expect(s.lengths).toHaveLength(4)
  expect(s.lengths.filter((l) => l === SHORT_LEN)).toHaveLength(1)
  expect(s.lengths.filter((l) => l === LONG_LEN)).toHaveLength(3)
  expect(SHORT_LEN).toBeLessThan(LONG_LEN)
  expect(s.lengths[s.short]).toBe(SHORT_LEN)
})

test('짧은 막대 위치는 rng 한 번으로 정해진다(경계 포함)', () => {
  expect(initStraws(5, () => 0).short).toBe(0)
  expect(initStraws(5, () => 0.999999).short).toBe(4)
  expect(initStraws(5, () => 1).short).toBe(4)
  let calls = 0
  initStraws(5, () => (calls++, 0.3))
  expect(calls).toBe(1)
})

test('긴 막대를 뽑으면 통과: 그 막대는 뽑힘, 차례 순환', () => {
  const s0 = initStraws(4, () => 0)
  const s1 = drawStraw(s0, 2, order)
  expect(s1.drawn[2]).toBe(true)
  expect(s1.phase).toBe('playing')
  expect(currentPlayer(s1, order)).toBe(order[1])
})

test('뽑은 막대는 다시 못 뽑는다(같은 객체 반환)', () => {
  const s1 = drawStraw(initStraws(4, () => 0), 2, order)
  expect(drawStraw(s1, 2, order)).toBe(s1)
})

test('범위 밖 인덱스는 무시', () => {
  const s = initStraws(4, () => 0)
  expect(drawStraw(s, -1, order)).toBe(s)
  expect(drawStraw(s, 4, order)).toBe(s)
  expect(drawStraw(s, 1.5, order)).toBe(s)
})

test('짧은 막대를 뽑으면 그 차례 말이 loser, 이후 입력 무시', () => {
  const s0 = { ...initStraws(4, () => 0), turn: 1 }
  const s1 = drawStraw(s0, 0, order)
  expect(s1.phase).toBe('lost')
  expect(s1.loser).toBe(order[1])
  expect(drawStraw(s1, 3, order)).toBe(s1)
})

test('마지막 사람은 남은 막대가 하나뿐이고 그것이 짧은 막대', () => {
  for (const r of [0, 0.3, 0.6, 0.99]) {
    let s = initStraws(4, () => r)
    for (let t = 0; t < 3; t++) {
      const i = s.drawn.findIndex((d, k) => !d && k !== s.short)
      s = drawStraw(s, i, order)
      expect(s.phase).toBe('playing')
    }
    const remaining = s.drawn.map((d, k) => (d ? -1 : k)).filter((k) => k >= 0)
    expect(remaining).toEqual([s.short])
    s = drawStraw(s, s.short, order)
    expect(s.loser).toBe(order[3])
  }
})
