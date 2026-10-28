import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { drawPieces, pieceLabel } from '../../../domain/pieces'
import { BombGame } from '../BombGame'
import { END_EFFECT_MS } from '../../shared/timing'
import { haptic } from '../../../platform/sdk'

vi.mock('../../../platform/sdk', () => ({ haptic: vi.fn(async () => {}) }))

const order = drawPieces(3, () => 0.5)
// rng=0 → 심지 12초
const FUSE = 12000

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(haptic).mockClear()
  clock = 5000
})
afterEach(() => vi.useRealTimers())

let clock = 0
const now = () => clock
const advance = (ms: number) => act(() => { clock += ms; vi.advanceTimersByTime(ms) })
const ignite = () => fireEvent.click(screen.getByRole('button', { name: '불 붙이기' }))
const tapBtn = () => screen.getByRole('button', { name: /^탭탭! 넘기기/ })
const tapN = (n: number) => { for (let i = 0; i < n; i++) fireEvent.pointerDown(tapBtn()) }

test('규칙 띠, 차례, 시작 버튼이 보인다', () => {
  render(<BombGame order={order} onFinish={() => {}} rng={() => 0} now={now} />)
  expect(screen.getByText('7번 탭해서 넘기기! 손에서 터지면 벌칙')).toBeTruthy()
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  expect(screen.getByRole('button', { name: '불 붙이기' })).toBeTruthy()
})

test('불을 붙이면 탭 버튼이 나오고 탭마다 카운트, 햅틱은 안 울린다', () => {
  render(<BombGame order={order} onFinish={() => {}} rng={() => 0} now={now} />)
  ignite()
  expect(tapBtn().textContent).toBe('탭탭! 넘기기 (0/7)')
  tapN(3)
  expect(tapBtn().textContent).toBe('탭탭! 넘기기 (3/7)')
  expect(haptic).not.toHaveBeenCalled()
})

test('7번 탭하면 다음 사람 + haptic tap 1회', () => {
  render(<BombGame order={order} onFinish={() => {}} rng={() => 0} now={now} />)
  ignite()
  tapN(7)
  expect(screen.getByText(`👉 ${pieceLabel(order[1])} 차례예요`)).toBeTruthy()
  expect(tapBtn().textContent).toBe('탭탭! 넘기기 (0/7)')
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledWith('tap')
})

test('터지면 연출 후 onFinish가 들고 있던 말로 1회, haptic error 1회', () => {
  const onFinish = vi.fn()
  render(<BombGame order={order} onFinish={onFinish} rng={() => 0} now={now} />)
  ignite()
  tapN(7)
  vi.mocked(haptic).mockClear()
  advance(FUSE - 100)
  expect(haptic).not.toHaveBeenCalled()
  advance(100) // 이 틱에서 터진다
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledWith('error')
  fireEvent.pointerDown(screen.getByRole('button', { name: /^탭탭! 넘기기/ })) // 끝난 뒤 무시
  advance(END_EFFECT_MS - 1)
  expect(onFinish).not.toHaveBeenCalled()
  advance(1)
  expect(onFinish).toHaveBeenCalledTimes(1)
  advance(5000)
  expect(screen.getByText(`${pieceLabel(order[1])} 펑!`)).toBeTruthy()
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledWith(order[1])
})

test('불 붙이기 연타해도 심지는 한 번만 시작', () => {
  const onFinish = vi.fn()
  render(<BombGame order={order} onFinish={onFinish} rng={() => 0} now={now} />)
  const b = screen.getByRole('button', { name: '불 붙이기' })
  fireEvent.click(b)
  fireEvent.click(b)
  advance(FUSE + 5000)
  expect(onFinish).toHaveBeenCalledTimes(1)
})

test('진행 중 언마운트 → onFinish 미호출', () => {
  const onFinish = vi.fn()
  const { unmount } = render(<BombGame order={order} onFinish={onFinish} rng={() => 0} now={now} />)
  ignite()
  advance(1000)
  unmount()
  advance(FUSE * 3)
  expect(onFinish).not.toHaveBeenCalled()
  expect(haptic).not.toHaveBeenCalled()
})

test('백그라운드에서 타이머가 늦게 돌아도 심지는 실제 경과 시간으로 줄어든다', () => {
  const onFinish = vi.fn()
  render(<BombGame order={order} onFinish={onFinish} rng={() => 0} now={now} />)
  ignite()
  // 타이머는 1초치(10틱)만 돌았지만 실제로는 12초가 지난 상황
  act(() => { clock += FUSE; vi.advanceTimersByTime(1000) })
  expect(haptic).toHaveBeenCalledWith('error')
  advance(5000)
  expect(onFinish).toHaveBeenCalledTimes(1)
})

test('틱이 밀려도 실제 시간이 심지보다 짧으면 터지지 않는다', () => {
  const onFinish = vi.fn()
  render(<BombGame order={order} onFinish={onFinish} rng={() => 0} now={now} />)
  ignite()
  // 타이머는 20초치가 돌았지만 시계는 5초만 갔다(= 틱 개수로 세면 터졌을 상황)
  act(() => { clock += 5000; vi.advanceTimersByTime(20000) })
  expect(haptic).not.toHaveBeenCalled()
  expect(onFinish).not.toHaveBeenCalled()
})

test('마우스 보조 버튼(오른쪽 등)은 탭으로 세지 않는다', () => {
  render(<BombGame order={order} onFinish={() => {}} rng={() => 0} now={now} />)
  ignite()
  fireEvent.pointerDown(tapBtn(), { button: 2 })
  fireEvent.pointerDown(tapBtn(), { button: 1 })
  expect(tapBtn().textContent).toBe('탭탭! 넘기기 (0/7)')
  fireEvent.pointerDown(tapBtn(), { button: 0 })
  expect(tapBtn().textContent).toBe('탭탭! 넘기기 (1/7)')
})

test('키보드 Enter/Space는 탭으로 세고, 키 반복(repeat)은 무시', () => {
  render(<BombGame order={order} onFinish={() => {}} rng={() => 0} now={now} />)
  ignite()
  fireEvent.keyDown(tapBtn(), { key: 'Enter' })
  fireEvent.keyDown(tapBtn(), { key: ' ' })
  fireEvent.keyDown(tapBtn(), { key: 'Enter', repeat: true })
  expect(tapBtn().textContent).toBe('탭탭! 넘기기 (2/7)')
})

test('탭 버튼 스타일은 최소 높이 120px를 지정한다(css)', () => {
  const css = readFileSync(join(__dirname, '..', 'bomb.css'), 'utf8')
  expect(css).toMatch(/\.bm-tap\s*\{[^}]*min-height:\s*120px/)
})
