import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { drawPieces, pieceLabel } from '../../../domain/pieces'
import { GaugeGame } from '../GaugeGame'
import { RECORD_END_MS } from '../../shared/timing'
import { haptic } from '../../../platform/sdk'

vi.mock('../../../platform/sdk', () => ({ haptic: vi.fn(async () => {}) }))

const order = drawPieces(3, () => 0.5)
// rng=0.5 → 시작 위치 0.5, 방향 왼쪽(-1). ms 후 위치 = 0.5 - ms/900
let clock = 0
const now = () => clock

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
  render(<GaugeGame order={people} onFinish={onFinish} rng={() => 0.5} now={now} />)
  return onFinish
}
const play = (ms: number) => {
  clock += 500
  fireEvent.click(screen.getByRole('button', { name: '시작' }))
  clock += ms
  advance(ms)
  fireEvent.pointerDown(screen.getByRole('button', { name: '멈춰!' }))
}
const next = () => {
  clock += 500
  fireEvent.click(screen.getByRole('button', { name: /^(다음 사람|결과 보기)$/ }))
}

test('규칙 띠·차례·시작 버튼, 목표 구역이 보인다', () => {
  mount()
  expect(screen.getByText('정중앙에서 멈추기! 가장 멀면 벌칙')).toBeTruthy()
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  expect(screen.getByRole('button', { name: '시작' })).toBeTruthy()
  expect(screen.getByTestId('gauge-zone')).toBeTruthy()
})

test('멈춘 위치가 주입 시간으로 정확히 계산된다(화면 갱신과 무관)', () => {
  mount()
  clock += 500
  fireEvent.click(screen.getByRole('button', { name: '시작' }))
  clock += 225 // 위치 0.25 → 중앙에서 50
  // 갱신 타이머를 전혀 돌리지 않고 바로 멈춤
  fireEvent.pointerDown(screen.getByRole('button', { name: '멈춰!' }))
  expect(screen.getByText('중앙에서 50.0')).toBeTruthy()
})

test('반올림: 소수 1자리', () => {
  mount()
  play(100) // 위치 0.5-0.1111 → 22.2
  expect(screen.getByText('중앙에서 22.2')).toBeTruthy()
})

test('마지막 사람은 결과 보기, 가장 먼 사람이 onFinish로 1회, 햅틱 error 1회', () => {
  const onFinish = mount()
  play(100) // 22.2
  next()
  expect(screen.getByText(`👉 ${pieceLabel(order[1])} 차례예요`)).toBeTruthy()
  play(225) // 50
  next()
  play(150) // 33.3
  expect(screen.queryByRole('button', { name: '다음 사람' })).toBeNull()
  next()
  const items = screen.getAllByRole('listitem')
  expect(items[2].textContent).toContain(pieceLabel(order[1]))
  expect(items[2].className).toContain('rg-lose')
  expect(screen.getByText(`${pieceLabel(order[1])} 중앙에서 50.0 벗어났어요`)).toBeTruthy()
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledWith('error')
  advance(RECORD_END_MS - 1)
  expect(onFinish).not.toHaveBeenCalled()
  advance(1)
  advance(5000)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledWith(order[1])
})

test('동점이면 (동점자 중 랜덤)', () => {
  mount()
  play(225)
  next()
  play(225)
  next()
  play(100)
  next()
  expect(screen.getByText(/중앙에서 50\.0 벗어났어요 \(동점자 중 랜덤\)$/)).toBeTruthy()
})

test('멈춰 직후(100ms 안) 다음 사람 연타는 무시된다', () => {
  mount()
  play(100)
  clock += 100
  fireEvent.click(screen.getByRole('button', { name: '다음 사람' }))
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  clock += 400
  fireEvent.click(screen.getByRole('button', { name: '다음 사람' }))
  expect(screen.getByText(`👉 ${pieceLabel(order[1])} 차례예요`)).toBeTruthy()
})

test('다음 사람 직후(100ms 안) 시작 연타로 바로 시작되지 않는다', () => {
  mount()
  play(100)
  next()
  clock += 100
  fireEvent.click(screen.getByRole('button', { name: '시작' }))
  expect(screen.getByRole('button', { name: '시작' })).toBeTruthy()
})

test('시작 직후 100ms 안의 멈춤 입력은 무시된다', () => {
  mount()
  clock += 500
  fireEvent.click(screen.getByRole('button', { name: '시작' }))
  clock += 99
  fireEvent.pointerDown(screen.getByRole('button', { name: '멈춰!' }))
  expect(screen.getByRole('button', { name: '멈춰!' })).toBeTruthy()
  clock += 1
  fireEvent.pointerDown(screen.getByRole('button', { name: '멈춰!' }))
  expect(screen.getByText('중앙에서 22.2')).toBeTruthy()
})

test('멈춘 뒤 중복 멈춤 입력은 기록되지 않는다', () => {
  const onFinish = mount()
  play(100)
  expect(screen.queryByRole('button', { name: '멈춰!' })).toBeNull()
  next()
  play(100)
  next()
  play(100)
  next()
  advance(RECORD_END_MS)
  expect(onFinish).toHaveBeenCalledTimes(1)
})

test('백그라운드로 가면 진행 중인 시도는 무효, 같은 사람이 다시', () => {
  mount()
  clock += 500
  fireEvent.click(screen.getByRole('button', { name: '시작' }))
  advance(300)
  clock += 300
  setVisibility('hidden')
  act(() => { document.dispatchEvent(new Event('visibilitychange')) })
  setVisibility('visible')
  expect(screen.queryByRole('button', { name: '멈춰!' })).toBeNull()
  expect(screen.getByText('다시 해 주세요')).toBeTruthy()
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  expect(screen.queryByText(/^중앙에서/)).toBeNull()
  play(225)
  expect(screen.getByText('중앙에서 50.0')).toBeTruthy()
  expect(screen.queryByText('다시 해 주세요')).toBeNull()
})

test('진행 중 언마운트 → onFinish·햅틱 없음, 타이머 정리', () => {
  const onFinish = vi.fn()
  const { unmount } = render(<GaugeGame order={order} onFinish={onFinish} rng={() => 0.5} now={now} />)
  fireEvent.click(screen.getByRole('button', { name: '시작' }))
  advance(300)
  unmount()
  expect(vi.getTimerCount()).toBe(0)
  advance(20000)
  expect(onFinish).not.toHaveBeenCalled()
  expect(haptic).not.toHaveBeenCalled()
})

test('결과 연출 도중 언마운트 → onFinish 미호출', () => {
  const onFinish = vi.fn()
  const { unmount } = render(<GaugeGame order={drawPieces(2, () => 0.5)} onFinish={onFinish} rng={() => 0.5} now={now} />)
  play(100)
  next()
  play(200)
  next()
  advance(600)
  unmount()
  advance(5000)
  expect(onFinish).not.toHaveBeenCalled()
})
