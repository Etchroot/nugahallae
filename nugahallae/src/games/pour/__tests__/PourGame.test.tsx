import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { drawPieces, pieceLabel } from '../../../domain/pieces'
import { PourGame } from '../PourGame'
import { haptic } from '../../../platform/sdk'

vi.mock('../../../platform/sdk', () => ({ haptic: vi.fn(async () => {}) }))

const order = drawPieces(3, () => 0.5)
const passName = '다음 사람에게 넘기기'

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'],
  })
  vi.mocked(haptic).mockClear()
})
afterEach(() => vi.useRealTimers())

const cup = () => screen.getByRole('button', { name: /잔/ })
const passBtn = () => screen.getByRole('button', { name: passName }) as HTMLButtonElement
const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })
const press = (ms: number) => {
  fireEvent.pointerDown(cup())
  advance(ms)
  fireEvent.pointerUp(cup())
}

test('규칙 띠와 차례가 보인다', () => {
  render(<PourGame order={order} onFinish={() => {}} />)
  expect(screen.getByText('꾹 누르면 붓고, 떼면 멈춰요. 넘치게 하면 벌칙!')).toBeTruthy()
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  expect(screen.getByText('살짝 탭하면 한 방울, 꾹 누르면 콸콸')).toBeTruthy()
})

test('붓기 전에는 넘기기 비활성', () => {
  render(<PourGame order={order} onFinish={() => {}} />)
  expect(passBtn().disabled).toBe(true)
})

test('짧은 탭 한 번이면 넘기기가 켜진다', () => {
  render(<PourGame order={order} onFinish={() => {}} />)
  press(100)
  expect(passBtn().disabled).toBe(false)
})

const volume = () => Number(cup().getAttribute('data-volume'))

test('1초 누르면 그만큼 부어진다(약 11.8)', () => {
  render(<PourGame order={order} onFinish={() => {}} />)
  press(1000)
  expect(passBtn().disabled).toBe(false)
  expect(volume()).toBeGreaterThanOrEqual(11)
  expect(volume()).toBeLessThanOrEqual(13)
})

test('7.5초 이상 누르면 잔 위로 물이 볼록해진다', () => {
  const { container } = render(<PourGame order={order} onFinish={() => {}} rng={() => 0.999} />)
  expect(container.querySelector('.pr-dome')).toBeNull()
  fireEvent.pointerDown(cup())
  advance(7000)
  expect(container.querySelector('.pr-dome')).toBeNull()
  advance(500)
  expect(container.querySelector('.pr-dome')).not.toBeNull()
  fireEvent.pointerUp(cup())
})

test('한 프레임에 시계가 10초 점프해도 한 걸음(100ms)만큼만 붓는다', () => {
  render(<PourGame order={order} onFinish={() => {}} />)
  fireEvent.pointerDown(cup())
  advance(500)
  const before = volume()
  // 다음 프레임까지 10초가 한 번에 지난 상황
  act(() => { vi.setSystemTime(Date.now()); vi.advanceTimersByTime(16) })
  const perf = vi.spyOn(performance, 'now')
  perf.mockReturnValue(performance.now() + 10000)
  advance(16)
  perf.mockRestore()
  fireEvent.pointerUp(cup())
  expect(volume() - before).toBeLessThanOrEqual(3)
})

test('백그라운드(blur)로 가면 붓기가 멈춘다', () => {
  render(<PourGame order={order} onFinish={() => {}} />)
  fireEvent.pointerDown(cup())
  advance(500)
  act(() => { window.dispatchEvent(new Event('blur')) })
  const v = volume()
  advance(3000)
  expect(volume()).toBe(v)
})

test('160ms 직후 다음 프레임 전에 떼도 한 방울은 붓는다', () => {
  render(<PourGame order={order} onFinish={() => {}} />)
  fireEvent.pointerDown(cup())
  advance(162)
  fireEvent.pointerUp(cup())
  expect(passBtn().disabled).toBe(false)
  expect(volume()).toBeGreaterThanOrEqual(1) // 0.6 -> 반올림 1
})

test('누르는 중에 넘기기를 누르면 붓기가 끝나고 다음 사람에게 이어지지 않는다', () => {
  render(<PourGame order={order} onFinish={() => {}} />)
  press(100)
  fireEvent.pointerDown(cup())
  advance(300)
  fireEvent.click(passBtn())
  expect(screen.getByText(`👉 ${pieceLabel(order[1])} 차례예요`)).toBeTruthy()
  const v = volume()
  advance(2000)
  expect(volume()).toBe(v)
  expect(passBtn().disabled).toBe(true)
})

test('넘기기 연타해도 차례는 한 번만 넘어가고, 400ms 안에는 다시 붓거나 넘길 수 없다', () => {
  render(<PourGame order={order} onFinish={() => {}} />)
  press(100)
  fireEvent.click(passBtn())
  fireEvent.click(passBtn())
  advance(399)
  press(100) // 잠금 중이라 무시됨
  fireEvent.click(passBtn())
  expect(screen.getByText(`👉 ${pieceLabel(order[1])} 차례예요`)).toBeTruthy()
  expect(passBtn().disabled).toBe(true)
  advance(1)
  press(100)
  expect(passBtn().disabled).toBe(false)
  fireEvent.click(passBtn())
  expect(screen.getByText(`👉 ${pieceLabel(order[2])} 차례예요`)).toBeTruthy()
})

test('넘긴 직후 400ms 안의 잔 누르기는 무시된다', () => {
  render(<PourGame order={order} onFinish={() => {}} />)
  press(100)
  fireEvent.click(passBtn())
  advance(100)
  press(100)
  expect(passBtn().disabled).toBe(true)
  advance(400)
  press(100)
  expect(passBtn().disabled).toBe(false)
})

test('limit 고정 후 계속 부으면 넘치고 2000ms 뒤 onFinish가 그 차례 말로 1회', () => {
  const onFinish = vi.fn()
  // limit = 6 -> 106에서 넘침. 14/s, 160ms 뒤부터 -> 약 7.73초에 넘침
  render(<PourGame order={order} onFinish={onFinish} rng={() => 0} />)
  fireEvent.pointerDown(cup())
  advance(7800)
  fireEvent.pointerUp(cup())
  expect(haptic).toHaveBeenCalledWith('error')
  expect(vi.mocked(haptic).mock.calls.filter((c) => c[0] === 'error')).toHaveLength(1)
  expect(onFinish).not.toHaveBeenCalled()
  advance(400)
  expect(screen.queryByText(`${pieceLabel(order[0])} 넘쳤다!`)).toBeNull()
  advance(150)
  expect(screen.getByText(`${pieceLabel(order[0])} 넘쳤다!`)).toBeTruthy()
  advance(1500)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledWith(order[0])
  advance(10000)
  expect(onFinish).toHaveBeenCalledTimes(1)
})

test('넘친 뒤에는 더 부어지지 않는다', () => {
  render(<PourGame order={order} onFinish={() => {}} rng={() => 0} />)
  fireEvent.pointerDown(cup())
  advance(7800)
  fireEvent.pointerUp(cup())
  expect(passBtn().disabled).toBe(true)
  press(500)
  expect(vi.mocked(haptic).mock.calls.filter((c) => c[0] === 'error')).toHaveLength(1)
})

test('볼록 시작 haptic(tap)은 한 번 누르는 동안 1회만', () => {
  render(<PourGame order={order} onFinish={() => {}} rng={() => 0.999} />)
  fireEvent.pointerDown(cup())
  advance(7500) // 100 넘어섬(약 7.2초), limit ~14라 아직 넘치지 않음
  expect(vi.mocked(haptic).mock.calls.filter((c) => c[0] === 'tap')).toHaveLength(1)
  advance(500)
  expect(vi.mocked(haptic).mock.calls.filter((c) => c[0] === 'tap')).toHaveLength(1)
  expect(haptic).not.toHaveBeenCalledWith('error')
  fireEvent.pointerUp(cup())
})

test('넘침 연출 중 언마운트하면 onFinish가 호출되지 않는다', () => {
  const onFinish = vi.fn()
  const { unmount } = render(<PourGame order={order} onFinish={onFinish} rng={() => 0} />)
  fireEvent.pointerDown(cup())
  advance(7800)
  fireEvent.pointerUp(cup())
  advance(800)
  unmount()
  advance(20000)
  expect(onFinish).not.toHaveBeenCalled()
})

test('화면에 limit 수치나 디버그 텍스트가 없다(넘침 연출 후에도)', () => {
  const { container } = render(<PourGame order={order} onFinish={() => {}} rng={() => 0} />)
  const check = () => {
    expect(container.textContent).not.toMatch(/\d/)
    expect(container.textContent).not.toContain('넘침')
  }
  check()
  fireEvent.pointerDown(cup())
  advance(7800)
  fireEvent.pointerUp(cup())
  check()
  advance(550)
  expect(screen.getByText(/넘쳤다!$/)).toBeTruthy()
  check()
})
