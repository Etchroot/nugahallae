import { test, expect } from 'vitest'
import { PENALTY_MS, makeRecord, recordText, shuffleGrid, whyText } from '../logic'
import { drawPieces } from '../../../domain/pieces'

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

test('shuffleGrid는 1~16 순열이고 같은 시드면 같다', () => {
  const a = shuffleGrid(seeded(7))
  const b = shuffleGrid(seeded(7))
  expect(a).toEqual(b)
  expect([...a].sort((x, y) => x - y)).toEqual(Array.from({ length: 16 }, (_, i) => i + 1))
})

test('시드가 다르면 보통 다르게 섞인다', () => {
  expect(shuffleGrid(seeded(1))).not.toEqual(shuffleGrid(seeded(2)))
})

test('벌점은 실수당 1초, 기록 문구', () => {
  const p = drawPieces(2, () => 0.5)[0]
  expect(PENALTY_MS).toBe(1000)
  const r = makeRecord(p, 12340, 0)
  expect(r.ms).toBe(12340)
  expect(recordText(r)).toBe('12.34초')
  const r2 = makeRecord(p, 12340, 2)
  expect(r2.ms).toBe(14340)
  expect(recordText(r2)).toBe('14.34초 (실수 2)')
  expect(whyText(r2)).toBe('14.34초로 가장 느렸어요')
})
