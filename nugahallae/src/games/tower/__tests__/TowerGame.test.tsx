import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { drawPieces, pieceLabel } from '../../../domain/pieces'
import { TowerGame } from '../TowerGame'
import { END_EFFECT_MS } from '../../shared/timing'
import { haptic } from '../../../platform/sdk'

vi.mock('../../../platform/sdk', () => ({ haptic: vi.fn(async () => {}) }))

const order = drawPieces(3, () => 0.5)
const SAFE = () => 0.999
const BOOM = () => 0

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(haptic).mockClear()
})
afterEach(() => vi.useRealTimers())

// r: 0이 맨 아래 줄
const block = (r: number, i: number) =>
  screen.getByRole('button', { name: `블록 ${r + 1}-${i + 1}` }) as HTMLButtonElement
const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })

test('규칙 띠, 차례, 14줄 블록 42개가 보인다', () => {
  render(<TowerGame order={order} onFinish={() => {}} rng={SAFE} />)
  expect(screen.getByText('블록을 하나씩 빼기! 무너뜨리면 벌칙')).toBeTruthy()
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  expect(screen.getAllByRole('button', { name: /^블록 / })).toHaveLength(42)
})

test('맨 윗줄을 누르면 안내가 나오고 차례는 그대로', () => {
  render(<TowerGame order={order} onFinish={() => {}} rng={SAFE} />)
  fireEvent.click(block(13, 0))
  expect(screen.getByText('맨 윗줄은 뺄 수 없어요')).toBeTruthy()
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  expect(haptic).not.toHaveBeenCalled()
})

test('한 줄의 마지막 블록 안내, 안전하게 빼면 안내가 사라지고 차례가 넘어간다', () => {
  render(<TowerGame order={order} onFinish={() => {}} rng={SAFE} />)
  fireEvent.click(block(0, 0))
  fireEvent.click(block(0, 1))
  expect(screen.getByText(`👉 ${pieceLabel(order[2])} 차례예요`)).toBeTruthy()
  fireEvent.click(block(0, 2))
  expect(screen.getByText('이 줄의 마지막 블록은 못 빼요')).toBeTruthy()
  expect(screen.getByText(`👉 ${pieceLabel(order[2])} 차례예요`)).toBeTruthy()
  fireEvent.click(block(1, 0))
  expect(screen.queryByText('이 줄의 마지막 블록은 못 빼요')).toBeNull()
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
})

test('무너지면 연출 후 onFinish가 뺀 말로 1회, haptic error 1회', () => {
  const onFinish = vi.fn()
  render(<TowerGame order={order} onFinish={onFinish} rng={BOOM} />)
  fireEvent.click(block(0, 0))
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledWith('error')
  expect(screen.getByText(`${pieceLabel(order[0])} 와르르!`)).toBeTruthy()
  advance(END_EFFECT_MS - 1)
  expect(onFinish).not.toHaveBeenCalled()
  advance(1)
  expect(onFinish).toHaveBeenCalledTimes(1)
  advance(5000)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledWith(order[0])
})

test('무너진 뒤 블록 입력은 판정(rng)을 다시 부르지 않고 햅틱·종료도 늘지 않는다', () => {
  const onFinish = vi.fn()
  const rng = vi.fn(() => 0)
  render(<TowerGame order={order} onFinish={onFinish} rng={rng} />)
  fireEvent.click(block(0, 0))
  const calls = rng.mock.calls.length
  // 무너진 뒤 모든 블록은 disabled라 클릭 자체가 막힌다
  expect(screen.getAllByRole('button', { name: /^블록 / }).every((b) => (b as HTMLButtonElement).disabled)).toBe(true)
  fireEvent.click(block(0, 0))
  fireEvent.click(block(1, 0))
  expect(rng.mock.calls.length).toBe(calls)
  advance(5000)
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledTimes(1)
})

test('이미 뺀 블록은 비활성이라 다시 눌러도 판정(rng)이 늘지 않는다', () => {
  const rng = vi.fn(() => 0.999)
  render(<TowerGame order={order} onFinish={() => {}} rng={rng} />)
  fireEvent.click(block(0, 0))
  expect(rng).toHaveBeenCalledTimes(1)
  expect(block(0, 0).disabled).toBe(true)
  fireEvent.click(block(0, 0))
  expect(rng).toHaveBeenCalledTimes(1)
  expect(screen.getByText(`👉 ${pieceLabel(order[1])} 차례예요`)).toBeTruthy()
})

test('차례가 넘어갈 때 haptic tap만 1회씩', () => {
  render(<TowerGame order={order} onFinish={() => {}} rng={SAFE} />)
  fireEvent.click(block(0, 0))
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledWith('tap')
})

test('진행 중 언마운트 → onFinish 미호출', () => {
  const onFinish = vi.fn()
  const { unmount } = render(<TowerGame order={order} onFinish={onFinish} rng={BOOM} />)
  fireEvent.click(block(0, 0))
  unmount()
  advance(10000)
  expect(onFinish).not.toHaveBeenCalled()
})
