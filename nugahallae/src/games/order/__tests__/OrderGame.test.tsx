import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { drawPieces, pieceLabel } from '../../../domain/pieces'
import { OrderGame } from '../OrderGame'
import { RECORD_END_MS } from '../../shared/timing'
import { haptic } from '../../../platform/sdk'

vi.mock('../../../platform/sdk', () => ({ haptic: vi.fn(async () => {}) }))

const order = drawPieces(3, () => 0.5)
let clock = 0
const now = () => clock
const RULE = '1부터 16까지 순서대로! 가장 느리면 벌칙'

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(haptic).mockClear()
  clock = 0
})
afterEach(() => {
  vi.useRealTimers()
  setVisibility('visible')
})

function setVisibility(v: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => v })
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => v === 'hidden' })
}
const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })
const mount = (onFinish = vi.fn(), people = order) => {
  render(<OrderGame order={people} onFinish={onFinish} rng={() => 0.5} now={now} />)
  return onFinish
}
const cell = (n: number) => screen.getByRole('button', { name: String(n) })
const startRound = () => {
  clock += 500
  fireEvent.click(screen.getByRole('button', { name: '시작' }))
  advance(2100) // 3·2·1
}
/** 격자가 나타난 뒤 totalMs 동안 1~16을 누르되, 마지막(16)을 totalMs에 누른다 */
const run = (totalMs: number, wrongs = 0) => {
  startRound()
  for (let i = 0; i < wrongs; i++) fireEvent.pointerDown(cell(16))
  for (let n = 1; n <= 16; n++) {
    if (n === 16) clock += totalMs
    fireEvent.pointerDown(cell(n))
  }
}
const next = () => {
  clock += 500
  fireEvent.click(screen.getByRole('button', { name: /^(다음 사람|결과 보기)$/ }))
}

test('규칙 띠·차례·시작 버튼', () => {
  mount()
  expect(screen.getByText(RULE)).toBeTruthy()
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  expect(screen.getByRole('button', { name: '시작' })).toBeTruthy()
})

test('3·2·1(700ms 간격) 뒤 격자가 나타난다', () => {
  mount()
  clock += 500
  fireEvent.click(screen.getByRole('button', { name: '시작' }))
  expect(screen.getByText('3')).toBeTruthy()
  advance(700)
  expect(screen.getByText('2')).toBeTruthy()
  advance(700)
  expect(screen.getByText('1')).toBeTruthy()
  expect(screen.queryByTestId('order-cell')).toBeNull()
  advance(700)
  expect(screen.getAllByTestId('order-cell')).toHaveLength(16)
  expect(screen.getByTestId('order-next').textContent).toBe('1')
})

test('순서대로 누르면 진행, 맞은 칸은 비활성', () => {
  mount()
  startRound()
  fireEvent.pointerDown(cell(1))
  expect((cell(1) as HTMLButtonElement).disabled).toBe(true)
  expect(screen.getByTestId('order-next').textContent).toBe('2')
})

test('틀린 칸은 진행 안 되고 +1초, 200ms 동안 빨갛게', () => {
  mount()
  startRound()
  fireEvent.pointerDown(cell(5))
  expect(screen.getByTestId('order-next').textContent).toBe('1')
  expect(cell(5).className).toContain('og-wrong')
  advance(199)
  expect(cell(5).className).toContain('og-wrong')
  advance(1)
  expect(cell(5).className).not.toContain('og-wrong')
})

test('시간은 격자 등장~16 누른 순간 + 실수당 1초 (주입 now)', () => {
  mount()
  run(10000, 2)
  expect(screen.getByText('12.00초 (실수 2)')).toBeTruthy()
})

test('실수 없으면 `{t}초`만', () => {
  mount()
  run(8125)
  expect(screen.getByText('8.13초')).toBeTruthy()
})

test('이미 누른 칸 중복 탭은 무시(벌점 없음)', () => {
  mount()
  startRound()
  fireEvent.pointerDown(cell(1))
  fireEvent.pointerDown(cell(1))
  fireEvent.pointerDown(cell(1))
  expect(screen.getByTestId('order-next').textContent).toBe('2')
  clock += 3000
  for (let n = 2; n <= 16; n++) fireEvent.pointerDown(cell(n))
  expect(screen.getByText('3.00초')).toBeTruthy()
})

test('끝난 뒤에는 격자가 사라져 기록이 바뀌지 않는다', () => {
  mount()
  run(5000)
  expect(screen.queryByTestId('order-cell')).toBeNull()
  expect(screen.getByText('5.00초')).toBeTruthy()
})

test('사람마다 새로 섞는다(rng 사용)', () => {
  let seed = 11
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
  render(<OrderGame order={order} onFinish={vi.fn()} rng={rng} now={now} />)
  startRound()
  const first = screen.getAllByTestId('order-cell').map((c) => c.textContent)
  for (let n = 1; n <= 16; n++) fireEvent.pointerDown(cell(n))
  next()
  startRound()
  const second = screen.getAllByTestId('order-cell').map((c) => c.textContent)
  expect(second).not.toEqual(first)
})

test('모두 끝나면 가장 느린 사람이 onFinish로 1회, 햅틱 error 1회, 연출 문구', () => {
  const onFinish = mount()
  run(9000)
  next()
  run(12000)
  next()
  run(10000)
  expect(screen.queryByRole('button', { name: '다음 사람' })).toBeNull()
  next()
  const items = screen.getAllByRole('listitem')
  expect(items[2].textContent).toContain(pieceLabel(order[1]))
  expect(items[2].className).toContain('rg-lose')
  expect(screen.getByText(`${pieceLabel(order[1])} 12.00초로 가장 느렸어요`)).toBeTruthy()
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledWith('error')
  advance(RECORD_END_MS - 1)
  expect(onFinish).not.toHaveBeenCalled()
  advance(1)
  advance(5000)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledWith(order[1])
})

test('다음 사람 연타 가드', () => {
  mount()
  run(9000)
  clock += 100
  fireEvent.click(screen.getByRole('button', { name: '다음 사람' }))
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  clock += 400
  fireEvent.click(screen.getByRole('button', { name: '다음 사람' }))
  expect(screen.getByText(`👉 ${pieceLabel(order[1])} 차례예요`)).toBeTruthy()
})

test('카운트다운 중 백그라운드 → 무효, 같은 사람이 다시', () => {
  mount()
  clock += 500
  fireEvent.click(screen.getByRole('button', { name: '시작' }))
  advance(700)
  setVisibility('hidden')
  act(() => { document.dispatchEvent(new Event('visibilitychange')) })
  setVisibility('visible')
  advance(5000)
  expect(screen.queryByTestId('order-cell')).toBeNull()
  expect(screen.getByText('다시 해 주세요')).toBeTruthy()
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  run(7000)
  expect(screen.getByText('7.00초')).toBeTruthy()
  expect(screen.queryByText('다시 해 주세요')).toBeNull()
})

test('플레이 중 백그라운드 → 무효, 기록 없음, 같은 사람이 다시', () => {
  mount()
  startRound()
  fireEvent.pointerDown(cell(1))
  setVisibility('hidden')
  act(() => { document.dispatchEvent(new Event('visibilitychange')) })
  setVisibility('visible')
  expect(screen.queryByTestId('order-cell')).toBeNull()
  expect(screen.getByText('다시 해 주세요')).toBeTruthy()
  run(6000)
  expect(screen.getByText('6.00초')).toBeTruthy()
})

test('진행 중 언마운트 → onFinish·햅틱 없음, 타이머 정리', () => {
  const onFinish = vi.fn()
  const { unmount } = render(<OrderGame order={order} onFinish={onFinish} rng={() => 0.5} now={now} />)
  fireEvent.click(screen.getByRole('button', { name: '시작' }))
  advance(2100)
  fireEvent.pointerDown(cell(9))
  unmount()
  expect(vi.getTimerCount()).toBe(0)
  advance(20000)
  expect(onFinish).not.toHaveBeenCalled()
  expect(haptic).not.toHaveBeenCalled()
})

test('결과 연출 도중 언마운트 → onFinish 미호출', () => {
  const onFinish = vi.fn()
  const { unmount } = render(<OrderGame order={drawPieces(2, () => 0.5)} onFinish={onFinish} rng={() => 0.5} now={now} />)
  run(5000)
  next()
  run(6000)
  next()
  advance(600)
  unmount()
  advance(5000)
  expect(onFinish).not.toHaveBeenCalled()
})
