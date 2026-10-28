import { test, expect } from 'vitest'
import {
  COUNT_STEP_MS, GO_AT_MS, DURATION_MS, initRound, startCountdown, beginGo, tapPad, endRound,
  recordText, whyText,
} from '../logic'

test('상수: 3·2·1 카운트다운(700ms 간격), 2100ms 후 시작, 5초 진행', () => {
  expect(COUNT_STEP_MS).toBe(700)
  expect(GO_AT_MS).toBe(2100)
  expect(DURATION_MS).toBe(5000)
})

test('카운트다운 중 탭은 세지 않는다', () => {
  let s = initRound()
  s = tapPad(s)
  expect(s.count).toBe(0)
  s = startCountdown(s)
  expect(s.phase).toBe('count')
  s = tapPad(s)
  expect(s.count).toBe(0)
})

test('시작 후 탭이 세어지고, 끝난 뒤 탭은 무시', () => {
  let s = beginGo(startCountdown(initRound()))
  expect(s.phase).toBe('go')
  s = tapPad(tapPad(tapPad(s)))
  expect(s.count).toBe(3)
  s = endRound(s)
  expect(s.phase).toBe('done')
  expect(tapPad(s)).toBe(s)
  expect(s.count).toBe(3)
})

test('단계는 순서대로만 진행(중복 시작·건너뛰기 무시)', () => {
  const idle = initRound()
  expect(beginGo(idle)).toBe(idle)
  expect(endRound(idle)).toBe(idle)
  const c = startCountdown(idle)
  expect(startCountdown(c)).toBe(c)
})

test('기록·연출 문구', () => {
  expect(recordText(23)).toBe('23회')
  expect(whyText(7)).toBe('5초 동안 7번밖에 못 눌렀어요 🐌')
})
