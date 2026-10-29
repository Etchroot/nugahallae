import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { drawPieces, pieceLabel } from '../../../domain/pieces'
import { NunchiGame } from '../NunchiGame'
import { COUNT_STEP_MS, OVERLAP_MS } from '../logic'
import { END_EFFECT_MS } from '../../shared/timing'
import { haptic } from '../../../platform/sdk'

vi.mock('../../../platform/sdk', () => ({ haptic: vi.fn(async () => {}) }))

const order = drawPieces(4, () => 0.5)
let t = 0
const now = () => t

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(haptic).mockClear()
  t = 10000
})
afterEach(() => vi.useRealTimers())

const advance = (ms: number) =>
  act(() => {
    t += ms
    vi.advanceTimersByTime(ms)
  })
const tile = (i: number) => screen.getByRole('button', { name: pieceLabel(order[i]) })
let pid = 0
const press = (i: number) => {
  const e = new Event('pointerdown', { bubbles: true, cancelable: true })
  Object.assign(e, { pointerId: ++pid, pointerType: 'touch' })
  fireEvent(tile(i), e)
}
const begin = (onFinish = vi.fn(), rng = () => 0) => {
  render(<NunchiGame order={order} onFinish={onFinish} rng={rng} now={now} />)
  fireEvent.click(screen.getByRole('button', { name: '시작' }))
  advance(COUNT_STEP_MS * 3)
  return onFinish
}

test('규칙 띠와 시작 버튼', () => {
  render(<NunchiGame order={order} onFinish={() => {}} now={now} />)
  expect(screen.getByText('동시에 누르면 벌칙! 마지막까지 못 누르면 벌칙')).toBeTruthy()
  expect(screen.getByRole('button', { name: '시작' })).toBeTruthy()
})

test('시작 → 3·2·1 카운트다운, 그 사이 누른 터치는 무시', () => {
  const onFinish = vi.fn()
  render(<NunchiGame order={order} onFinish={onFinish} rng={() => 0} now={now} />)
  fireEvent.click(screen.getByRole('button', { name: '시작' }))
  expect(screen.getByTestId('nunchi-count').textContent).toBe('3')
  press(0)
  advance(COUNT_STEP_MS)
  expect(screen.getByTestId('nunchi-count').textContent).toBe('2')
  advance(COUNT_STEP_MS)
  expect(screen.getByTestId('nunchi-count').textContent).toBe('1')
  advance(COUNT_STEP_MS)
  expect(screen.queryByTestId('nunchi-count')).toBeNull()
  expect(screen.queryByText('1번')).toBeNull()
  advance(10000)
  expect(onFinish).not.toHaveBeenCalled()
})

test('누른 순서대로 번호가 붙고 그 칸은 비활성, 다시 눌러도 무시', () => {
  begin()
  press(2)
  advance(1000)
  press(0)
  expect(screen.getByText('1번')).toBeTruthy()
  expect(screen.getByText('2번')).toBeTruthy()
  expect(tile(2).getAttribute('aria-disabled')).toBe('true')
  advance(500)
  press(2)
  expect(screen.queryByText('3번')).toBeNull()
})

test('겹침: 250ms 이내 두 사람 → 묶음 중 rng로 한 명, 햅틱 error 1회, onFinish 1회', () => {
  const onFinish = begin(vi.fn(), () => 0.99)
  press(1)
  advance(OVERLAP_MS - 1)
  press(3)
  expect(screen.queryByText(/겹쳤어요/)).toBeNull()
  advance(OVERLAP_MS)
  expect(screen.getByText(`${pieceLabel(order[3])} 겹쳤어요`)).toBeTruthy()
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledWith('error')
  advance(END_EFFECT_MS - 1)
  expect(onFinish).not.toHaveBeenCalled()
  advance(1)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledWith(order[3])
  press(0)
  advance(10000)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledTimes(1)
})

test('연쇄 겹침: 같은 순간 세 번째 손가락도 후보에 들어간다', () => {
  const onFinish = begin(vi.fn(), () => 0.99)
  press(0)
  press(1)
  press(2)
  advance(OVERLAP_MS)
  expect(screen.getByText(`${pieceLabel(order[2])} 겹쳤어요`)).toBeTruthy()
  advance(END_EFFECT_MS)
  expect(onFinish).toHaveBeenCalledWith(order[2])
})

test('겹침 없이 n-1명이 누르면 남은 한 명이 마지막', () => {
  const onFinish = begin()
  press(0)
  advance(1000)
  press(3)
  advance(1000)
  press(1)
  advance(OVERLAP_MS)
  expect(screen.getByText(`${pieceLabel(order[2])} 마지막이에요`)).toBeTruthy()
  expect(haptic).toHaveBeenCalledTimes(1)
  advance(END_EFFECT_MS)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledWith(order[2])
})

test('첫 입력 전에는 시간 제한 없이 기다려도 된다', () => {
  const onFinish = begin()
  advance(600000)
  expect(onFinish).not.toHaveBeenCalled()
  expect(screen.queryByText(/겹쳤어요|마지막이에요/)).toBeNull()
})

test('백그라운드로 가면 그 판은 무효 + 다시 해 주세요, 다시 시작할 수 있다', () => {
  const onFinish = begin()
  press(0)
  Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
  expect(screen.getByText('다시 해 주세요')).toBeTruthy()
  expect(screen.queryByText('1번')).toBeNull()
  advance(10000)
  expect(onFinish).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: '시작' }))
  expect(screen.getByTestId('nunchi-count')).toBeTruthy()
})

test('언마운트하면 타이머가 정리되어 onFinish가 불리지 않는다', () => {
  const onFinish = vi.fn()
  const { unmount } = render(<NunchiGame order={order} onFinish={onFinish} rng={() => 0} now={now} />)
  fireEvent.click(screen.getByRole('button', { name: '시작' }))
  advance(COUNT_STEP_MS * 3)
  press(0)
  advance(10)
  press(1)
  unmount()
  advance(10000)
  expect(onFinish).not.toHaveBeenCalled()
  expect(haptic).not.toHaveBeenCalled()
})
