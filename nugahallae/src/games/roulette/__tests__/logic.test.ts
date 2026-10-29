import { test, expect } from 'vitest'
import { drawPieces } from '../../../domain/pieces'
import {
  segmentAtPointer, planSpin, initRoulette, startSpin, resolveSpin, currentSpinner, easeTimeAt, tickTimes,
} from '../logic'

const norm = (x: number) => ((x % 360) + 360) % 360

test('segmentAtPointer: 회전 0이면 칸 0', () => expect(segmentAtPointer(0, 4)).toBe(0))
test('segmentAtPointer: 시계방향 90° 회전(4칸)이면 포인터는 칸 3', () => expect(segmentAtPointer(90, 4)).toBe(3))
test('segmentAtPointer: 경계값 360, 720, 360/n 배수, 음수, 큰 값에서도 0..n-1', () => {
  for (const n of [2, 3, 7, 10]) for (const r of [0, 360, 720, 360 / n, 2 * 360 / n, -45, 1e6 + 0.5]) {
    const i = segmentAtPointer(r, n)
    expect(i).toBeGreaterThanOrEqual(0)
    expect(i).toBeLessThan(n)
  }
})
test('planSpin: 착지 칸이 경계에서 칸 폭 15% 이상 떨어져 있다', () => {
  for (const n of [2, 3, 5, 10]) for (const cur of [0, 123.4, 1000]) for (const r of [0, 0.25, 0.5, 0.999999, 1 - 1e-12]) {
    const plan = planSpin(cur, n, () => r, false)
    const w = 360 / n
    const a = (360 - norm(plan.targetRotation)) % 360
    const within = (a % w) / w
    expect(within).toBeGreaterThanOrEqual(0.15 - 1e-9)
    expect(within).toBeLessThanOrEqual(0.85 + 1e-9)
    expect(plan.landedIndex).toBe(segmentAtPointer(plan.targetRotation, n))
    expect(plan.targetRotation).toBeGreaterThanOrEqual(cur + 360 * 6)
  }
})
test('planSpin: 바퀴 수는 일반 6, 마지막 9', () => {
  const a = planSpin(0, 4, () => 0.5, false)
  const b = planSpin(0, 4, () => 0.5, true)
  expect(b.targetRotation - a.targetRotation).toBeCloseTo(360 * 3)
})
test('planSpin: isFinal이면 durationMs 7000, 아니면 4500', () => {
  expect(planSpin(0, 4, () => 0.3, true).durationMs).toBe(7000)
  expect(planSpin(0, 4, () => 0.3, false).durationMs).toBe(4500)
})
test('resolveSpin: 4명 → 통과 3번 후 done, loser는 남은 1명', () => {
  const order = drawPieces(4, () => 0.1)
  let s = initRoulette(order)
  for (let i = 0; i < 3; i++) {
    expect(s.phase).toBe('idle')
    s = resolveSpin(startSpin(s), 0)
    expect(s.lastPassed).toBe(order[i])
    expect(s.spinnerTurn).toBe(i + 1)
  }
  expect(s.phase).toBe('done')
  expect(s.remaining).toHaveLength(1)
  expect(s.loser).toBe(order[3])
})
test('resolveSpin: 2명 남았을 때 하나 통과하면 나머지가 loser', () => {
  const order = drawPieces(2, () => 0.1)
  const s = resolveSpin(startSpin(initRoulette(order)), 0)
  expect(s.phase).toBe('done')
  expect(s.loser).toBe(order[1])
  expect(s.lastPassed).toBe(order[0])
})
test('startSpin 연타: spinning 중 startSpin은 상태를 바꾸지 않는다', () => {
  const s = startSpin(initRoulette(drawPieces(3, () => 0.1)))
  expect(s.phase).toBe('spinning')
  expect(startSpin(s)).toBe(s)
})
test('resolveSpin은 idle 상태에서 무시된다', () => {
  const s = initRoulette(drawPieces(3, () => 0.1))
  expect(resolveSpin(s, 0)).toBe(s)
})
test('currentSpinner는 order를 순환한다', () => {
  const order = drawPieces(3, () => 0.1)
  const s = initRoulette(order)
  expect(currentSpinner(s, order)).toBe(order[0])
  expect(currentSpinner({ ...s, spinnerTurn: 4 }, order)).toBe(order[1])
})

test('easeTimeAt: 양 끝은 0과 1, 진행률이 늘면 시간도 는다', () => {
  expect(easeTimeAt(0)).toBeCloseTo(0, 5)
  expect(easeTimeAt(1)).toBeCloseTo(1, 5)
  for (let y = 0.1; y < 1; y += 0.1) expect(easeTimeAt(y)).toBeGreaterThan(easeTimeAt(y - 0.1))
  // 출발이 빠른 곡선: 절반을 도는 데 시간은 절반보다 훨씬 적게 든다
  expect(easeTimeAt(0.5)).toBeLessThan(0.2)
})

test('tickTimes: 칸 경계마다 한 번, 시간순, 회전 시간 안, 간격은 minGap 이상', () => {
  const plan = planSpin(30, 6, () => 0.42, false)
  const times = tickTimes(30, plan.targetRotation, 6, plan.durationMs, 40)
  expect(times.length).toBeGreaterThan(5)
  for (let i = 1; i < times.length; i++) expect(times[i] - times[i - 1]).toBeGreaterThanOrEqual(40)
  expect(times[times.length - 1]).toBeLessThanOrEqual(plan.durationMs)
  // 버리지 않으면 지나간 경계 수와 같다
  const all = tickTimes(30, plan.targetRotation, 6, plan.durationMs, 0)
  const crossed = Math.floor(plan.targetRotation / 60) - Math.floor(30 / 60)
  expect(all).toHaveLength(crossed)
  // 끝으로 갈수록 느려진다(마지막 간격이 처음 간격보다 길다)
  expect(all[all.length - 1] - all[all.length - 2]).toBeGreaterThan(all[1] - all[0])
})

test('tickTimes: 돌지 않으면 빈 배열', () => {
  expect(tickTimes(100, 100, 4, 4500)).toEqual([])
  expect(tickTimes(0, 360, 4, 0)).toEqual([])
})
