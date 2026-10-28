import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { drawPieces, pieceLabel } from '../../../domain/pieces'
import { TapGame } from '../TapGame'
import { haptic } from '../../../platform/sdk'

vi.mock('../../../platform/sdk', () => ({ haptic: vi.fn(async () => {}) }))

const order = drawPieces(3, () => 0.5)
let clock = 0
const now = () => clock

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(haptic).mockClear()
  clock = 10000
})
afterEach(() => {
  vi.useRealTimers()
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
})

const advance = (ms: number) => act(() => { clock += ms; vi.advanceTimersByTime(ms) })
const pad = () => screen.getByTestId('pad')
const tapPad = (n = 1) => { for (let i = 0; i < n; i++) fireEvent.pointerDown(pad()) }
const next = () => {
  clock += 500
  fireEvent.click(screen.getByRole('button', { name: /^(다음 사람|결과 보기)$/ }))
}
const mount = (onFinish = vi.fn(), o = order, rng = () => 0) => {
  render(<TapGame order={o} onFinish={onFinish} rng={rng} now={now} />)
  return onFinish
}
/** 시작 탭 → 카운트다운 → n번 연타 → 5초 */
const round = (n: number) => {
  clock += 500 // 탭 가드(400ms) 이후
  tapPad()
  advance(2100)
  tapPad(n)
  advance(5000)
}

const setHidden = (hidden: boolean) => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
  document.dispatchEvent(new Event('visibilitychange'))
}

test('규칙 띠, 차례, 시작 패드가 보인다', () => {
  mount()
  expect(screen.getByText('5초 동안 연타! 가장 적으면 벌칙')).toBeTruthy()
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  expect(pad().textContent).toBe('탭해서 시작')
})

test('3·2·1 카운트다운 동안 탭은 세지 않고, 이후 탭이 세어진다. 탭마다 햅틱은 없다', () => {
  mount()
  tapPad()
  expect(pad().textContent).toBe('3')
  advance(700)
  expect(pad().textContent).toBe('2')
  tapPad(5) // 카운트 중
  advance(700)
  expect(pad().textContent).toBe('1')
  advance(700)
  expect(pad().textContent).toBe('0')
  tapPad(4)
  expect(pad().textContent).toBe('4')
  expect(haptic).not.toHaveBeenCalled()
})

test('5초가 지나면 {n}회 확정, 이후 탭은 무시', () => {
  mount()
  round(12)
  expect(pad().textContent).toContain('12회')
  tapPad(3)
  expect(pad().textContent).toContain('12회')
  expect(screen.getByRole('button', { name: '다음 사람' })).toBeTruthy()
})

test('시작 패드를 연타해도 카운트다운은 한 번만', () => {
  mount()
  tapPad(3)
  advance(2100)
  tapPad(2)
  expect(pad().textContent).toBe('2')
})

test('가장 적게 누른 사람이 onFinish로 1회, haptic error 1회, 마지막 버튼은 결과 보기', () => {
  const onFinish = mount()
  round(20)
  next()
  round(5)
  next()
  round(12)
  expect(screen.queryByRole('button', { name: '다음 사람' })).toBeNull()
  next()
  const items = screen.getAllByRole('listitem')
  expect(items.map((l) => l.querySelector('b')?.textContent)).toEqual(['20회', '12회', '5회'])
  expect(items[2].className).toContain('rg-lose')
  advance(900)
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledWith('error')
  expect(screen.getByText(`${pieceLabel(order[1])} 5초 동안 5번밖에 못 눌렀어요 🐌`)).toBeTruthy()
  advance(1200)
  advance(5000)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledWith(order[1])
})

test('최소 동점이면 동점자 중 랜덤 문구', () => {
  const onFinish = mount()
  round(5)
  next()
  round(9)
  next()
  round(5)
  next()
  advance(900)
  expect(screen.getByText(`${pieceLabel(order[0])} 5초 동안 5번밖에 못 눌렀어요 🐌 (동점자 중 랜덤)`)).toBeTruthy()
  advance(1200)
  expect(onFinish).toHaveBeenCalledWith(order[0])
})

test('카운트다운 중 언마운트 → onFinish 미호출', () => {
  const onFinish = vi.fn()
  const { unmount } = render(<TapGame order={order} onFinish={onFinish} rng={() => 0} now={now} />)
  tapPad()
  advance(1000)
  unmount()
  advance(20000)
  expect(onFinish).not.toHaveBeenCalled()
  expect(haptic).not.toHaveBeenCalled()
})

test('결과 연출 도중 언마운트 → onFinish 미호출', () => {
  const onFinish = vi.fn()
  const two = drawPieces(2, () => 0.5)
  const { unmount } = render(<TapGame order={two} onFinish={onFinish} rng={() => 0} now={now} />)
  round(10)
  next()
  round(3)
  next()
  advance(900)
  unmount()
  advance(5000)
  expect(onFinish).not.toHaveBeenCalled()
})

test('종료 타이머가 일찍 와도 5초가 안 지났으면 남은 시간만큼 다시 건다', () => {
  mount()
  tapPad()
  advance(2100)
  tapPad(3)
  // 타이머만 5초 진행(시계는 3초): 백그라운드에서 타이머가 몰려 발화한 상황
  act(() => { clock += 3000; vi.advanceTimersByTime(5000) })
  expect(pad().textContent).toBe('3') // 아직 진행 중
  tapPad(2)
  advance(2000)
  expect(pad().textContent).toContain('5회')
})

test('5초 동안 화면이 숨겨졌으면 그 시도는 무효, 같은 사람이 다시 한다', () => {
  const onFinish = mount(vi.fn(), drawPieces(2, () => 0.5))
  tapPad()
  advance(2100)
  tapPad(4)
  setHidden(true)
  advance(1000)
  setHidden(false)
  advance(5000)
  expect(screen.getByText('다시 해 주세요')).toBeTruthy()
  expect(pad().textContent).toBe('탭해서 시작')
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  expect(screen.queryByRole('button', { name: '다음 사람' })).toBeNull()
  // 다시 시작하면 안내가 사라지고 정상 진행
  clock += 500
  tapPad()
  expect(screen.queryByText('다시 해 주세요')).toBeNull()
  advance(2100)
  tapPad(6)
  advance(5000)
  expect(pad().textContent).toContain('6회')
  expect(onFinish).not.toHaveBeenCalled()
})

test('연타 막판 탭 직후(100ms 안) 나타난 다음 사람 버튼은 눌려도 건너뛰지 않는다', () => {
  mount()
  clock += 500
  tapPad()
  advance(2100)
  tapPad(10)
  advance(4900)
  tapPad() // 종료 100ms 전의 마지막 탭
  advance(100)
  expect(pad().textContent).toContain('11회')
  fireEvent.click(screen.getByRole('button', { name: '다음 사람' }))
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  clock += 400
  fireEvent.click(screen.getByRole('button', { name: '다음 사람' }))
  expect(screen.getByText(`👉 ${pieceLabel(order[1])} 차례예요`)).toBeTruthy()
})

test('다음 사람 직후(100ms 안) 패드를 눌러도 다음 사람이 시작되지 않는다', () => {
  mount()
  round(10)
  next()
  clock += 100
  tapPad()
  expect(pad().textContent).toBe('탭해서 시작')
  clock += 400
  tapPad()
  expect(pad().textContent).toBe('3')
})
