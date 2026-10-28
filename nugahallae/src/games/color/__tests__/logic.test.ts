import { test, expect } from 'vitest'
import { COLORS, QUESTION_COUNT, makeQuestions, makeRecord, recordText, whyText } from '../logic'
import { drawPieces } from '../../../domain/pieces'

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

test('색은 4가지, 초록 제외, 지정한 값', () => {
  expect(COLORS.map((c) => [c.name, c.hex])).toEqual([
    ['빨강', '#F04452'],
    ['파랑', '#3182F6'],
    ['노랑', '#FFC342'],
    ['보라', '#8B5CF6'],
  ])
})

test('10문제, 같은 시드면 같은 문제', () => {
  const a = makeQuestions(seeded(5))
  expect(a).toHaveLength(QUESTION_COUNT)
  expect(QUESTION_COUNT).toBe(10)
  expect(makeQuestions(seeded(5))).toEqual(a)
  expect(makeQuestions(seeded(6))).not.toEqual(a)
})

test('뜻과 색이 같은 문제는 약 25%', () => {
  let same = 0
  let total = 0
  for (let seed = 1; seed <= 400; seed++) {
    for (const q of makeQuestions(seeded(seed * 7919))) {
      total++
      if (q.word === q.ink) same++
    }
  }
  const ratio = same / total
  expect(ratio).toBeGreaterThan(0.2)
  expect(ratio).toBeLessThan(0.3)
})

test('기록 문구: 벌점 1초, 실수 표시', () => {
  const p = drawPieces(2, () => 0.5)[0]
  const r = makeRecord(p, 9000, 1)
  expect(r.ms).toBe(10000)
  expect(recordText(r)).toBe('10.00초 (실수 1)')
  expect(recordText(makeRecord(p, 9876, 0))).toBe('9.88초')
  expect(whyText(r)).toBe('10.00초로 가장 느렸어요')
})
