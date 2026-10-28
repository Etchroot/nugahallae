import { test, expect } from 'vitest'
import { drawPieces } from '../../../domain/pieces'
import { pickTarget, displayElapsed, makeRecord, recordText, BLIND_MS } from '../logic'

const p = drawPieces(2, () => 0.5)

test('목표는 5.0~10.0초, 0.1초 단위', () => {
  expect(pickTarget(() => 0)).toBe(5)
  expect(pickTarget(() => 0.999)).toBe(10)
  expect(pickTarget(() => 0.5)).toBe(7.5)
  const t = pickTarget(() => 0.123)
  expect(Math.round(t * 10)).toBeCloseTo(t * 10, 9)
})

test('1.5초가 지나면 숫자가 ?.??로 가려진다(경계 포함 안 가림)', () => {
  expect(BLIND_MS).toBe(1500)
  expect(displayElapsed(0)).toBe('0.00')
  expect(displayElapsed(1500)).toBe('1.50')
  expect(displayElapsed(1501)).toBe('?.??')
  expect(displayElapsed(8000)).toBe('?.??')
})

test('기록은 실제 시간과 목표와의 차이(절댓값)', () => {
  const r = makeRecord(p[0], 7310, 7)
  expect(r.v).toBeCloseTo(7.31)
  expect(r.d).toBeCloseTo(0.31)
  expect(makeRecord(p[0], 6500, 7).d).toBeCloseTo(0.5)
})

test('기록 문구는 {v}초 (±{d})', () => {
  expect(recordText(makeRecord(p[0], 7310, 7))).toBe('7.31초 (±0.31)')
})

test('차이는 0.01초로 반올림해 화면에 같게 보이는 기록은 같은 값이다', () => {
  expect(makeRecord(p[0], 7310, 7.5).d).toBe(makeRecord(p[1], 7690, 7.5).d)
  expect(makeRecord(p[0], 7310, 7.5).d).toBe(0.19)
})
