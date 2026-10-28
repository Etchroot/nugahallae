import { test, expect } from 'vitest'
import { drawPieces } from '../../../domain/pieces'
import {
  CM_PX, MIN_CM, dragCm, errorOf, makeRecord, maxTargetCm, pickTarget, recordText, whyText,
} from '../logic'

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}
const [p] = drawPieces(2, () => 0.5)

test('1cm는 CSS 37.8px, 최소 길이는 0.5cm', () => {
  expect(CM_PX).toBe(37.8)
  expect(MIN_CM).toBe(0.5)
})

test('목표는 3~9cm, 0.5cm 단위이고 양 끝도 나온다', () => {
  const seen = new Set<number>()
  const rng = seeded(5)
  for (let i = 0; i < 400; i++) {
    const t = pickTarget(rng)
    expect(t).toBeGreaterThanOrEqual(3)
    expect(t).toBeLessThanOrEqual(9)
    expect(Number.isInteger(t * 2)).toBe(true)
    seen.add(t)
  }
  expect(seen.has(3)).toBe(true)
  expect(seen.has(9)).toBe(true)
  expect(pickTarget(() => 0)).toBe(3)
  expect(pickTarget(() => 0.999999)).toBe(9)
})

test('같은 rng면 같은 목표', () => {
  expect(pickTarget(seeded(9))).toBe(pickTarget(seeded(9)))
})

test('좁은 화면이면 목표 최대치를 낮춘다', () => {
  expect(maxTargetCm(375)).toBe(9)
  expect(maxTargetCm(1024)).toBe(9)
  expect(maxTargetCm(320)).toBeLessThan(9)
  expect(maxTargetCm(320) * CM_PX).toBeLessThanOrEqual(320)
  expect(maxTargetCm(100)).toBe(3)
  for (let i = 0; i < 100; i++) {
    expect(pickTarget(seeded(i), maxTargetCm(320))).toBeLessThanOrEqual(maxTargetCm(320))
  }
})

test('길이는 가로 거리만 쓴다(방향 무관)', () => {
  expect(dragCm(10, 10 + 37.8 * 4)).toBeCloseTo(4, 6)
  expect(dragCm(300, 300 - 37.8 * 4)).toBeCloseTo(4, 6)
})

test('오차는 소수 1자리 반올림, 기록·문구', () => {
  expect(errorOf(5.04, 6)).toBe(1)
  expect(errorOf(6.26, 6)).toBe(0.3)
  const r = makeRecord(p, 7.26, 6)
  expect(r.err).toBe(1.3)
  expect(recordText(r)).toBe('7.3cm (±1.3cm)')
  expect(whyText(r)).toBe('1.3cm 차이 났어요')
})
