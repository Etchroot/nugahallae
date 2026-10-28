import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { drawPieces, pieceLabel } from '../../../domain/pieces'
import { BalloonGame } from '../BalloonGame'
import { haptic } from '../../../platform/sdk'

vi.mock('../../../platform/sdk', () => ({ haptic: vi.fn(async () => {}) }))

const order = drawPieces(3, () => 0.5)

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(haptic).mockClear()
})
afterEach(() => vi.useRealTimers())

const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })
const pumpBtn = () => screen.getByRole('button', { name: /펌프!/ }) as HTMLButtonElement
const passBtn = () => screen.getByRole('button', { name: '다음 사람에게 넘기기' }) as HTMLButtonElement
const doPump = (n = 1) => { for (let i = 0; i < n; i++) fireEvent.click(pumpBtn()) }

test('규칙 띠, 차례, 펌프 버튼 문구가 보인다', () => {
  render(<BalloonGame order={order} onFinish={() => {}} rng={() => 0.999} />)
  expect(screen.getByText('1~3번 펌프하고 넘기기! 터뜨리면 벌칙')).toBeTruthy()
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  expect(pumpBtn().textContent).toBe('💨 펌프! (0/3)')
})

test('펌프 전엔 넘기기 비활성, 3번 하면 펌프 비활성', () => {
  render(<BalloonGame order={order} onFinish={() => {}} rng={() => 0.999} />)
  expect(passBtn().disabled).toBe(true)
  doPump(3)
  expect(pumpBtn().textContent).toBe('💨 펌프! (3/3)')
  expect(pumpBtn().disabled).toBe(true)
  expect(passBtn().disabled).toBe(false)
})

test('넘기기를 누르면 차례가 한 번 넘어가고 넘기기는 다시 비활성', () => {
  render(<BalloonGame order={order} onFinish={() => {}} rng={() => 0.999} />)
  doPump()
  fireEvent.click(passBtn())
  expect(screen.getByText(`👉 ${pieceLabel(order[1])} 차례예요`)).toBeTruthy()
  expect(passBtn().disabled).toBe(true)
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledWith('tap')
})

test('탭 가드: 넘긴 직후 다음 사람이 펌프하고 곧바로 넘기기를 눌러도(더블탭) 무시', () => {
  render(<BalloonGame order={order} onFinish={() => {}} rng={() => 0.999} />)
  doPump()
  fireEvent.click(passBtn()) // order[1]에게 넘어감
  doPump() // 가드는 넘기기 탭만 보호: 펌프는 가드 없음
  expect(passBtn().disabled).toBe(false)
  fireEvent.click(passBtn()) // 400ms 안 → 가드가 막는다
  expect(screen.getByText(`👉 ${pieceLabel(order[1])} 차례예요`)).toBeTruthy()
  expect(haptic).toHaveBeenCalledTimes(1)
})

test('터지면 연출 후 onFinish가 터뜨린 말로 1회, haptic error 1회, 펌프에는 햅틱 없음', () => {
  const onFinish = vi.fn()
  render(<BalloonGame order={order} onFinish={onFinish} rng={() => 0} />) // pop 4
  doPump(3)
  expect(haptic).not.toHaveBeenCalled()
  vi.advanceTimersByTime(500)
  fireEvent.click(passBtn())
  vi.mocked(haptic).mockClear()
  advance(500)
  doPump(1) // total 4 -> pop (order[1])
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledWith('error')
  advance(5000)
  expect(screen.getByText(`${pieceLabel(order[1])} 펑!`)).toBeTruthy()
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledWith(order[1])
})

test('진행 중 언마운트 → onFinish 미호출', () => {
  const onFinish = vi.fn()
  const { unmount } = render(<BalloonGame order={order} onFinish={onFinish} rng={() => 0} />)
  doPump(3)
  fireEvent.click(passBtn())
  doPump(1) // 터짐
  unmount()
  advance(5000)
  expect(onFinish).not.toHaveBeenCalled()
})
