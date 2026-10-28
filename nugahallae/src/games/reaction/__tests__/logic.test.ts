import { test, expect } from 'vitest'
import { pickWait, FOUL, isFoul, recordText, whyText } from '../logic'

test('대기 시간은 1.5~4.5초(rng)', () => {
  expect(pickWait(() => 0)).toBe(1500)
  expect(pickWait(() => 0.999999)).toBe(4500)
  expect(pickWait(() => 0.5)).toBe(3000)
})

test('부정출발은 9999(최악)로 기록되고 판정된다', () => {
  expect(FOUL).toBe(9999)
  expect(isFoul(9999)).toBe(true)
  expect(isFoul(312)).toBe(false)
})

test('기록 문구', () => {
  expect(recordText(312)).toBe('312 ms')
  expect(recordText(FOUL)).toBe('부정출발 🚫')
})

test('연출 문구', () => {
  expect(whyText(480)).toBe('480ms로 제일 느렸어요 🐢')
  expect(whyText(FOUL)).toBe('부정출발로 탈락했어요 🚫')
})
