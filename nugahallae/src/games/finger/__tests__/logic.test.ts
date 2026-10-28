import { test, expect } from 'vitest'
import {
  ARM_MS,
  SPIN_MS,
  addFinger,
  finishSpin,
  initFinger,
  removeFinger,
  spinSchedule,
  startSpin,
} from '../logic'

function full(n: number) {
  let s = initFinger(n)
  for (let id = 1; id <= n; id++) s = addFinger(s, id)
  return s
}

test('대기/돌기 시간 상수', () => {
  expect(ARM_MS).toBe(1000)
  expect(SPIN_MS).toBe(2000)
})

test('손가락이 인원수와 같아지면 waiting에서 armed로', () => {
  let s = initFinger(3)
  expect(s.phase).toBe('waiting')
  s = addFinger(s, 10)
  s = addFinger(s, 11)
  expect(s.phase).toBe('waiting')
  s = addFinger(s, 12)
  expect(s.phase).toBe('armed')
  expect(s.fingers).toEqual([10, 11, 12])
})

test('같은 pointerId 중복은 무시', () => {
  const s = addFinger(addFinger(initFinger(3), 1), 1)
  expect(s.fingers).toEqual([1])
})

test('인원 초과 손가락은 무시되고 ignored에 기록, 떼도 게임 상태는 그대로', () => {
  let s = full(2)
  s = addFinger(s, 3)
  expect(s.fingers).toEqual([1, 2])
  expect(s.ignored).toEqual([3])
  expect(s.phase).toBe('armed')
  const after = removeFinger(s, 3)
  expect(after.phase).toBe('armed')
  expect(after.fingers).toEqual([1, 2])
  expect(after.ignored).toEqual([])
})

test('armed/spinning 중 손가락이 떨어지면 waiting으로, 남은 손가락 유지', () => {
  const s = full(3)
  const a = removeFinger(s, 2)
  expect(a.phase).toBe('waiting')
  expect(a.fingers).toEqual([1, 3])
  expect(a.target).toBeNull()
  const sp = startSpin(s, () => 0)
  expect(sp.phase).toBe('spinning')
  const b = removeFinger(sp, 1)
  expect(b.phase).toBe('waiting')
  expect(b.target).toBeNull()
  const c = addFinger(b, 9)
  expect(c.phase).toBe('armed')
  expect(c.fingers).toEqual([2, 3, 9])
})

test('말 번호(slot)는 손가락이 떠 있는 동안 고정, 뗀 번호는 가장 낮은 빈 번호로 재사용', () => {
  const s = full(3)
  expect(s.slots).toEqual({ 1: 0, 2: 1, 3: 2 })
  const a = removeFinger(s, 2)
  expect(a.slots).toEqual({ 1: 0, 3: 2 })
  const b = addFinger(a, 9)
  expect(b.slots).toEqual({ 1: 0, 3: 2, 9: 1 })
  const sp = startSpin(b, () => 0.5) // fingers [1,3,9] 중 위치 1 = 손가락 3
  expect(sp.target).toBe(1)
  expect(sp.targetSlot).toBe(2)
})

test('startSpin은 armed에서만, rng로 대상 고정', () => {
  const w = addFinger(initFinger(3), 1)
  expect(startSpin(w, () => 0)).toBe(w)
  const s = full(3)
  expect(startSpin(s, () => 0).target).toBe(0)
  expect(startSpin(s, () => 0.5).target).toBe(1)
  expect(startSpin(s, () => 0.999).target).toBe(2)
})

test('finishSpin: spinning → done, 그 외엔 그대로. done 후 입력 무시', () => {
  const s = full(2)
  expect(finishSpin(s)).toBe(s)
  const d = finishSpin(startSpin(s, () => 0.9))
  expect(d.phase).toBe('done')
  expect(d.target).toBe(1)
  expect(addFinger(d, 5)).toBe(d)
  expect(removeFinger(d, 1)).toBe(d)
})

test('spinSchedule: 처음 빠르고 끝에 느리며 SPIN_MS에 target에서 끝난다', () => {
  for (const n of [2, 3, 7, 10]) {
    for (let target = 0; target < n; target++) {
      const steps = spinSchedule(n, target)
      expect(steps[0].at).toBe(0)
      const last = steps[steps.length - 1]
      expect(last.index).toBe(target)
      expect(last.at).toBe(SPIN_MS)
      for (let i = 1; i < steps.length; i++) {
        expect(steps[i].index).toBe((steps[i - 1].index + 1) % n)
        expect(steps[i].at).toBeGreaterThanOrEqual(steps[i - 1].at)
      }
      const k = steps.length
      expect(steps[k - 1].at - steps[k - 2].at).toBeGreaterThan(steps[1].at - steps[0].at)
    }
  }
})
