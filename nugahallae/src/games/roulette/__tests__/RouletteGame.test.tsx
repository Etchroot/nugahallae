import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { drawPieces } from '../../../domain/pieces'
import { RouletteGame } from '../RouletteGame'
import { END_EFFECT_MS } from '../../shared/timing'
import { haptic } from '../../../platform/sdk'

vi.mock('../../../platform/sdk', () => ({ haptic: vi.fn(async () => {}) }))

const order = drawPieces(3, () => 0.5)

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(haptic).mockClear()
})
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
  act(() => { vi.advanceTimersByTime(4500 + 1200) })
  expect(screen.getByText('남은 말 2개')).toBeTruthy()
  act(() => { vi.advanceTimersByTime(10000) })
  expect(screen.getByText('남은 말 2개')).toBeTruthy()
})

test('통과 오버레이 동안 돌리기는 비활성이고 눌러도 아무 일도 없다', () => {
  render(<RouletteGame order={order} onFinish={() => {}} rng={() => 0.1} />)
  fireEvent.click(screen.getByRole('button', { name: '돌리기' }))
  act(() => { vi.advanceTimersByTime(4500) })
  expect(screen.getByText('남은 말 3개')).toBeTruthy()
  const btn = screen.getByRole('button', { name: '돌리기' }) as HTMLButtonElement
  expect(btn.disabled).toBe(true)
  fireEvent.click(btn)
  act(() => { vi.advanceTimersByTime(1200) })
  expect(screen.getByText('남은 말 2개')).toBeTruthy()
  act(() => { vi.advanceTimersByTime(10000) })
  expect(screen.getByText('남은 말 2개')).toBeTruthy()
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledWith('tap')
})

test('3명이면 통과 2번 후 onFinish가 남은 말로 1번 호출된다', () => {
  const onFinish = vi.fn()
  render(<RouletteGame order={order} onFinish={onFinish} rng={() => 0.1} />)
  fireEvent.click(screen.getByRole('button', { name: '돌리기' }))
  act(() => { vi.advanceTimersByTime(4500) })
  expect(screen.getByText(/통과!$/)).toBeTruthy()
  act(() => { vi.advanceTimersByTime(1200) })
  expect(haptic).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: '돌리기' }))
  act(() => { vi.advanceTimersByTime(7000) })
  expect(screen.getByText(/통과!$/)).toBeTruthy() // 마지막 스핀은 1200ms 대기 없이 바로
  act(() => { vi.advanceTimersByTime(END_EFFECT_MS - 1) })
  expect(onFinish).not.toHaveBeenCalled()
  act(() => { vi.advanceTimersByTime(1) })
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
