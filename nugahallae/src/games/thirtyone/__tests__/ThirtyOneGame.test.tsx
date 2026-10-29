import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { drawPieces, pieceLabel } from '../../../domain/pieces'
import { ThirtyOneGame } from '../ThirtyOneGame'
import { END_EFFECT_MS } from '../../shared/timing'
import { haptic } from '../../../platform/sdk'

vi.mock('../../../platform/sdk', () => ({ haptic: vi.fn(async () => {}) }))

const order = drawPieces(3, () => 0.5)

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(haptic).mockClear()
})
afterEach(() => vi.useRealTimers())

const btn = (c: number) => screen.getByRole('button', { name: `${c}개 부르기` }) as HTMLButtonElement
const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })
const pick = (c: number) => {
  advance(400)
  fireEvent.click(btn(c))
}

test('규칙 띠, 차례, 지금까지 0, 버튼 3개', () => {
  render(<ThirtyOneGame order={order} onFinish={() => {}} />)
  expect(screen.getByText('1~3개씩 이어 세기! 31을 부르면 벌칙')).toBeTruthy()
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  expect(screen.getByText('지금까지 0')).toBeTruthy()
  expect([1, 2, 3].every((c) => !btn(c).disabled)).toBe(true)
})

test('고르면 숫자가 늘고 차례가 넘어가며 haptic tap 1회', () => {
  render(<ThirtyOneGame order={order} onFinish={() => {}} />)
  pick(2)
  expect(screen.getByText('지금까지 2')).toBeTruthy()
  expect(screen.getByText(`👉 ${pieceLabel(order[1])} 차례예요`)).toBeTruthy()
  expect(screen.getByText(`${pieceLabel(order[0])}: 1, 2`)).toBeTruthy()
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledWith('tap')
})

test('연타(400ms 안)는 한 번만 처리', () => {
  render(<ThirtyOneGame order={order} onFinish={() => {}} />)
  pick(1)
  fireEvent.click(btn(3))
  expect(screen.getByText('지금까지 1')).toBeTruthy()
})

test('n=30에서는 1개만 활성, 눌러 31을 부르면 즉결 + onFinish 1회 + error 1회', () => {
  const onFinish = vi.fn()
  render(<ThirtyOneGame order={order} onFinish={onFinish} />)
  // 0 -> 3 -> ... 30 (3개씩 10번): 차례는 0,1,2,0,1,2,0,1,2,0 → 다음은 order[1]
  for (let i = 0; i < 10; i++) pick(3)
  expect(screen.getByText('지금까지 30')).toBeTruthy()
  expect(btn(1).disabled).toBe(false)
  expect(btn(2).disabled).toBe(true)
  expect(btn(3).disabled).toBe(true)
  vi.mocked(haptic).mockClear()
  pick(1)
  expect(screen.getByText(`${pieceLabel(order[1])} 31을 불렀어요`)).toBeTruthy()
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledWith('error')
  advance(END_EFFECT_MS - 1)
  expect(onFinish).not.toHaveBeenCalled()
  advance(1)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledWith(order[1])
  fireEvent.click(btn(1))
  advance(5000)
  expect(onFinish).toHaveBeenCalledTimes(1)
})

test('n=29에서는 3개만 비활성', () => {
  render(<ThirtyOneGame order={order} onFinish={() => {}} />)
  for (let i = 0; i < 9; i++) pick(3)
  pick(2)
  expect(screen.getByText('지금까지 29')).toBeTruthy()
  expect([1, 2, 3].map((c) => btn(c).disabled)).toEqual([false, false, true])
})

test('언마운트하면 onFinish 미호출', () => {
  const onFinish = vi.fn()
  const { unmount } = render(<ThirtyOneGame order={order} onFinish={onFinish} />)
  for (let i = 0; i < 10; i++) pick(3)
  pick(1)
  unmount()
  advance(5000)
  expect(onFinish).not.toHaveBeenCalled()
})
