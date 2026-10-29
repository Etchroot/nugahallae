import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { drawPieces, pieceLabel } from '../../../domain/pieces'
import { LastTouchGame } from '../LastTouchGame'
import { COUNT_STEP_MS, LIMIT_MS, WAIT_MIN_MS } from '../logic'
import { END_EFFECT_MS } from '../../shared/timing'
import { haptic } from '../../../platform/sdk'

vi.mock('../../../platform/sdk', () => ({ haptic: vi.fn(async () => {}) }))

const order = drawPieces(3, () => 0.5)
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
const msg = () => screen.getByTestId('lasttouch-msg').textContent

// rng가 항상 0이면 신호 지연은 WAIT_MIN_MS
const begin = (onFinish = vi.fn(), rng = () => 0) => {
  render(<LastTouchGame order={order} onFinish={onFinish} rng={rng} now={now} />)
  fireEvent.click(screen.getByRole('button', { name: '시작' }))
  advance(COUNT_STEP_MS * 3)
  return onFinish
}

test('규칙 띠, 시작 → 3·2·1 → 신호를 기다려요 → 지금!', () => {
  render(<LastTouchGame order={order} onFinish={() => {}} rng={() => 0} now={now} />)
  expect(screen.getByText('신호가 뜨면 빨리 누르기! 가장 늦으면 벌칙')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '시작' }))
  expect(msg()).toBe('3')
  advance(COUNT_STEP_MS)
  expect(msg()).toBe('2')
  advance(COUNT_STEP_MS)
  expect(msg()).toBe('1')
  advance(COUNT_STEP_MS)
  expect(msg()).toBe('신호를 기다려요')
  advance(WAIT_MIN_MS - 1)
  expect(msg()).toBe('신호를 기다려요')
  advance(1)
  expect(msg()).toBe('지금!')
})

test('카운트다운 중 누른 터치는 반칙이 아니고 무시', () => {
  const onFinish = vi.fn()
  render(<LastTouchGame order={order} onFinish={onFinish} rng={() => 0} now={now} />)
  fireEvent.click(screen.getByRole('button', { name: '시작' }))
  press(0)
  advance(COUNT_STEP_MS * 3)
  expect(msg()).toBe('신호를 기다려요')
  expect(screen.queryByText(/너무 빨랐어요/)).toBeNull()
})

test('반칙: 신호 전에 누르면 즉결 + haptic error 1회 + onFinish 1회, 신호는 오지 않는다', () => {
  const onFinish = begin()
  advance(500)
  press(1)
  expect(screen.getByText(`${pieceLabel(order[1])} 너무 빨랐어요`)).toBeTruthy()
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledWith('error')
  advance(END_EFFECT_MS)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledWith(order[1])
  press(0)
  advance(20000)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(msg()).not.toBe('지금!')
})

test('모두 누르면 즉시 종료, 가장 늦게 누른 사람이 loser, 신호 때 햅틱 없음', () => {
  const onFinish = begin()
  advance(WAIT_MIN_MS)
  expect(msg()).toBe('지금!')
  expect(haptic).not.toHaveBeenCalled()
  advance(300)
  press(2)
  advance(200)
  press(0)
  expect(haptic).not.toHaveBeenCalled()
  advance(400)
  press(1)
  expect(screen.getByText(`${pieceLabel(order[1])} 가장 늦었어요`)).toBeTruthy()
  expect(screen.getByText('0.30초')).toBeTruthy()
  expect(screen.getByText('0.50초')).toBeTruthy()
  expect(screen.getByText('0.90초')).toBeTruthy()
  expect(haptic).toHaveBeenCalledTimes(1)
  advance(END_EFFECT_MS)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledWith(order[1])
})

test('같은 칸 중복 입력은 무시하고, 신호 3초 뒤 안 누른 사람이 loser', () => {
  const onFinish = begin()
  advance(WAIT_MIN_MS)
  press(0)
  press(0)
  advance(200)
  press(2)
  advance(LIMIT_MS - 200 - 1)
  expect(onFinish).not.toHaveBeenCalled()
  expect(screen.queryByText(/가장 늦었어요/)).toBeNull()
  advance(1)
  expect(screen.getByText(`${pieceLabel(order[1])} 가장 늦었어요`)).toBeTruthy()
  expect(screen.getByText('못 눌렀어요')).toBeTruthy()
  advance(END_EFFECT_MS)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledWith(order[1])
})

test('안 누른 사람이 여러 명이면 rng로 고른다', () => {
  const onFinish = begin(vi.fn(), () => 0.99)
  advance(0)
  // rng 0.99는 지연이 길어 신호가 늦다: 대기 시간만큼 흘려보낸다
  advance(6000)
  press(0)
  advance(LIMIT_MS)
  advance(END_EFFECT_MS)
  expect(onFinish).toHaveBeenCalledWith(order[2])
})

test('백그라운드로 가면 라운드 무효 + 다시 해 주세요, 다시 시작하면 대기부터', () => {
  const onFinish = begin()
  advance(WAIT_MIN_MS)
  press(0)
  Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
  expect(msg()).toBe('다시 해 주세요')
  advance(20000)
  expect(onFinish).not.toHaveBeenCalled()
  expect(haptic).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: '시작' }))
  advance(COUNT_STEP_MS * 3)
  expect(msg()).toBe('신호를 기다려요')
  advance(WAIT_MIN_MS)
  expect(msg()).toBe('지금!')
  expect(screen.queryByText('눌렀어요')).toBeNull()
})

test('언마운트하면 타이머가 정리된다', () => {
  const onFinish = vi.fn()
  const { unmount } = render(<LastTouchGame order={order} onFinish={onFinish} rng={() => 0} now={now} />)
  fireEvent.click(screen.getByRole('button', { name: '시작' }))
  advance(COUNT_STEP_MS * 3 + WAIT_MIN_MS)
  unmount()
  advance(30000)
  expect(onFinish).not.toHaveBeenCalled()
  expect(haptic).not.toHaveBeenCalled()
})
