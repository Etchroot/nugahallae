import { test, expect } from 'vitest'
import { TOPICS, initLiar, tally, resolveLiar } from '../logic'

const seq = (...v: number[]) => {
  let i = 0
  return () => v[i++ % v.length]
}

test('주제 6개, 각 8단어', () => {
  expect(Object.keys(TOPICS)).toEqual(['음식', '동물', '장소', '직업', '스포츠', '물건'])
  for (const w of Object.values(TOPICS)) expect(w).toHaveLength(8)
  expect(TOPICS['음식'][0]).toBe('김밥')
  expect(TOPICS['물건'][7]).toBe('베개')
})

test('initLiar: 주제·단어·라이어를 rng로 고른다(재현성)', () => {
  expect(initLiar(seq(0, 0, 0), 4)).toEqual({ topic: '음식', word: '김밥', liar: 0 })
  expect(initLiar(seq(0.999, 0.999, 0.999), 4)).toEqual({ topic: '물건', word: '베개', liar: 3 })
  expect(initLiar(seq(0.3, 0.6, 0.5), 5)).toEqual(initLiar(seq(0.3, 0.6, 0.5), 5))
  const r = initLiar(() => 1, 3) // 경계
  expect(r.liar).toBe(2)
  expect(TOPICS[r.topic]).toContain(r.word)
})

test('tally: 최다 득표, 동점은 rng', () => {
  expect(tally([2, 2, 1, 2], 4, () => 0)).toBe(2)
  expect(tally([0, 1, 2, 3], 4, () => 0)).toBe(0)
  expect(tally([0, 1, 2, 3], 4, () => 0.999)).toBe(3)
  expect(tally([1, 1, 0, 0], 4, () => 0.5)).toBe(1)
})

test('resolveLiar: 적중이면 라이어, 아니면 지목된 사람이 loser', () => {
  expect(resolveLiar(2, 2)).toEqual({ caught: true, loser: 2 })
  expect(resolveLiar(1, 2)).toEqual({ caught: false, loser: 1 })
})
