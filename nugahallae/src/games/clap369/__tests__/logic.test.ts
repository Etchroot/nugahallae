import { test, expect } from 'vitest'
import { clapCount, judgeTap, limitMs, nextNumber } from '../logic'

test.each([
  [1, 0], [3, 1], [6, 1], [9, 1], [12, 0], [13, 1], [40, 0],
  [33, 2], [36, 2], [63, 2], [66, 2], [69, 2], [96, 2], [99, 2],
])('clapCount(%i) = %i', (n, k) => {
  expect(clapCount(n)).toBe(k)
})

test('30~39는 모두 1개 이상', () => {
  for (let n = 30; n <= 39; n++) expect(clapCount(n), String(n)).toBeGreaterThanOrEqual(1)
})

test('제한 시간 공식 max(1500, 3500-60n)', () => {
  expect(limitMs(1)).toBe(3440)
  expect(limitMs(10)).toBe(2900)
  expect(limitMs(33)).toBe(1520)
  expect(limitMs(34)).toBe(1500)
  expect(limitMs(99)).toBe(1500)
})

test('99 다음은 1로 되돌아간다', () => {
  expect(nextNumber(1)).toBe(2)
  expect(nextNumber(98)).toBe(99)
  expect(nextNumber(99)).toBe(1)
})

test('짝이 필요 없는 숫자: 넘기기는 통과, 짝은 오답', () => {
  expect(judgeTap(12, 0, 'skip')).toBe('pass')
  expect(judgeTap(12, 0, 'clap')).toBe('wrong')
})
test('짝이 필요한 숫자: 넘기기는 오답', () => {
  expect(judgeTap(13, 0, 'skip')).toBe('wrong')
})
test('짝 1개: 한 번에 통과, 두 번째 짝은 없음', () => {
  expect(judgeTap(13, 0, 'clap')).toBe('pass')
})
test('짝 2개: 첫 탭은 계속, 둘째에 통과', () => {
  expect(judgeTap(33, 0, 'clap')).toBe('continue')
  expect(judgeTap(33, 1, 'clap')).toBe('pass')
})
test('짝 2개인데 중간에 넘기기는 오답', () => {
  expect(judgeTap(33, 1, 'skip')).toBe('wrong')
})
