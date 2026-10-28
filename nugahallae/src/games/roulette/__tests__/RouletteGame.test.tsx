import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { drawPieces } from '../../../domain/pieces'
import { RouletteGame } from '../RouletteGame'

vi.mock('../../../platform/sdk', () => ({ haptic: vi.fn(async () => {}) }))

const order = drawPieces(3, () => 0.5)

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

test('규칙 문구와 남은 말 수가 보인다', () => {
  render(<RouletteGame order={order} onFinish={() => {}} />)
  expect(screen.getByText('걸리면 통과! 마지막까지 남으면 벌칙')).toBeTruthy()
  expect(screen.getByText('남은 말 3개')).toBeTruthy()
  expect(screen.getByRole('button', { name: '돌리기' })).toBeTruthy()
})

test('돌리기 연타해도 한 번만 돈다', () => {
  render(<RouletteGame order={order} onFinish={() => {}} rng={() => 0.1} />)
  const btn = screen.getByRole('button', { name: '돌리기' })
  fireEvent.click(btn)
  fireEvent.click(btn)
  act(() => { vi.advanceTimersByTime(4500) })
  expect(screen.getByText('남은 말 2개')).toBeTruthy()
  act(() => { vi.advanceTimersByTime(1200) })
  expect(screen.getByText('남은 말 2개')).toBeTruthy()
})

test('3명이면 통과 2번 후 onFinish가 남은 말로 1번 호출된다', () => {
  const onFinish = vi.fn()
  render(<RouletteGame order={order} onFinish={onFinish} rng={() => 0.1} />)
  fireEvent.click(screen.getByRole('button', { name: '돌리기' }))
  act(() => { vi.advanceTimersByTime(4500) })
  expect(screen.getByText(/통과!$/)).toBeTruthy()
  act(() => { vi.advanceTimersByTime(1200) })
  fireEvent.click(screen.getByRole('button', { name: '돌리기' }))
  act(() => { vi.advanceTimersByTime(7000 + 1200 + 1000) })
  expect(onFinish).toHaveBeenCalledTimes(1)
  // rng 0.1 -> 첫 칸 통과(여행 순서 0), 다음에도 첫 칸 -> 마지막은 order[2]
  expect(onFinish).toHaveBeenCalledWith(order[2])
  act(() => { vi.advanceTimersByTime(10000) })
  expect(onFinish).toHaveBeenCalledTimes(1)
})

test('돌리는 중 언마운트하면 onFinish가 호출되지 않는다', () => {
  const onFinish = vi.fn()
  const { unmount } = render(<RouletteGame order={drawPieces(2, () => 0.5)} onFinish={onFinish} />)
  fireEvent.click(screen.getByRole('button', { name: '돌리기' }))
  act(() => { vi.advanceTimersByTime(1000) })
  unmount()
  act(() => { vi.advanceTimersByTime(20000) })
  expect(onFinish).not.toHaveBeenCalled()
})
