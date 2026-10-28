import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { drawPieces, pieceLabel } from '../../../domain/pieces'
import { TimerGame } from '../TimerGame'
import { haptic } from '../../../platform/sdk'

vi.mock('../../../platform/sdk', () => ({ haptic: vi.fn(async () => {}) }))

const order = drawPieces(3, () => 0.5)
// rng=0.5 → 목표 7.5초
let clock = 0
const now = () => clock

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(haptic).mockClear()
  clock = 0
})
afterEach(() => vi.useRealTimers())

const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })
const mount = (onFinish = vi.fn(), rng = () => 0.5) => {
  render(<TimerGame order={order} onFinish={onFinish} rng={rng} now={now} />)
  return onFinish
}
/** 시작 → ms 후 멈춤 */
const play = (ms: number) => {
  fireEvent.click(screen.getByRole('button', { name: '시작' }))
  clock += ms
  advance(ms)
  fireEvent.pointerDown(screen.getByRole('button', { name: '멈춰!' }))
}
const next = () => {
  clock += 500 // 탭 가드(400ms) 이후
  fireEvent.click(screen.getByRole('button', { name: /^(다음 사람|결과 보기)$/ }))
}

test('규칙 띠, 목표, 차례, 시작 버튼이 보인다', () => {
  mount()
  expect(screen.getByText('목표 시간에 가장 먼 사람이 벌칙')).toBeTruthy()
  expect(screen.getByText('7.5초')).toBeTruthy()
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  expect(screen.getByRole('button', { name: '시작' })).toBeTruthy()
})

test('1.5초 후 숫자가 가려지고, 멈추면 실제 시간과 기록이 공개된다', () => {
  mount()
  fireEvent.click(screen.getByRole('button', { name: '시작' }))
  clock += 1000
  advance(1000)
  expect(screen.getByLabelText('경과 시간').textContent).toBe('1.00')
  clock += 1000
  advance(1000)
  expect(screen.getByLabelText('경과 시간').textContent).toBe('?.??')
  clock += 5310
  advance(5310)
  fireEvent.pointerDown(screen.getByRole('button', { name: '멈춰!' }))
  expect(screen.getByLabelText('경과 시간').textContent).toBe('7.31')
  expect(screen.getByText('7.31초 (±0.19)')).toBeTruthy()
})

test('마지막 사람 버튼은 결과 보기, 가장 먼 사람이 onFinish로 1회', () => {
  const onFinish = mount()
  play(7500) // d 0
  next()
  expect(screen.getByText(`👉 ${pieceLabel(order[1])} 차례예요`)).toBeTruthy()
  play(9000) // d 1.5
  next()
  play(7000) // d 0.5
  expect(screen.queryByRole('button', { name: '다음 사람' })).toBeNull()
  next() // 결과 보기
  const items = screen.getAllByRole('listitem')
  expect(items[2].textContent).toContain(pieceLabel(order[1]))
  expect(items[2].className).toContain('rg-lose')
  expect(onFinish).not.toHaveBeenCalled()
  advance(900)
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledWith('error')
  expect(screen.getByText(`${pieceLabel(order[1])} 목표에서 1.50초 벗어났어요`)).toBeTruthy()
  advance(1200)
  advance(5000)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledWith(order[1])
})

test('가장 나쁜 기록이 동점이면 (동점자 중 랜덤) 문구', () => {
  const onFinish = mount(vi.fn(), () => 0.5)
  play(7500)
  next()
  play(9000)
  next()
  play(6000) // d 1.5 (동점)
  next()
  advance(900)
  expect(screen.getByText(/목표에서 1\.50초 벗어났어요 \(동점자 중 랜덤\)$/)).toBeTruthy()
  advance(1200)
  expect(onFinish).toHaveBeenCalledTimes(1)
})

test('멈춘 뒤 멈춤 입력은 중복 기록되지 않는다', () => {
  const onFinish = mount()
  play(7500)
  expect(screen.queryByRole('button', { name: '멈춰!' })).toBeNull()
  next()
  play(7500)
  next()
  play(7500)
  next()
  advance(900 + 1200)
  expect(onFinish).toHaveBeenCalledTimes(1)
})

test('진행 중 언마운트 → onFinish 미호출', () => {
  const onFinish = vi.fn()
  const { unmount } = render(<TimerGame order={order} onFinish={onFinish} rng={() => 0.5} now={now} />)
  fireEvent.click(screen.getByRole('button', { name: '시작' }))
  advance(500)
  unmount()
  advance(20000)
  expect(onFinish).not.toHaveBeenCalled()
  expect(haptic).not.toHaveBeenCalled()
})

test('결과 연출 도중 언마운트 → onFinish 미호출', () => {
  const onFinish = vi.fn()
  const { unmount } = render(<TimerGame order={drawPieces(2, () => 0.5)} onFinish={onFinish} rng={() => 0.5} now={now} />)
  play(7500)
  next()
  play(9000)
  next()
  advance(900)
  unmount()
  advance(5000)
  expect(onFinish).not.toHaveBeenCalled()
})
