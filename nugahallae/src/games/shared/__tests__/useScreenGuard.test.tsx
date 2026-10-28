import { test, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useScreenGuard } from '../useScreenGuard'

test('가드를 통과한 탭 이후 400ms 안의 탭은 무시, 이후엔 통과', () => {
  let t = 1000
  const { result } = renderHook(() => useScreenGuard(() => t))
  const a = vi.fn()
  const b = vi.fn()
  result.current.guard(a)()
  t += 100
  result.current.guard(b)() // 다른 버튼이어도 같은 가드
  expect(a).toHaveBeenCalledTimes(1)
  expect(b).not.toHaveBeenCalled()
  t += 400
  result.current.guard(b)()
  expect(b).toHaveBeenCalledTimes(1)
})

test('prime은 가드 없이 시각만 기록해 직후의 탭을 막는다', () => {
  let t = 5000
  const { result } = renderHook(() => useScreenGuard(() => t))
  result.current.prime()
  t += 399
  const f = vi.fn()
  result.current.guard(f)()
  expect(f).not.toHaveBeenCalled()
  t += 1
  result.current.guard(f)()
  expect(f).toHaveBeenCalledTimes(1)
})
