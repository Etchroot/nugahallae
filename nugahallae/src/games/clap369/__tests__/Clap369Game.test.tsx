import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { drawPieces, pieceLabel } from '../../../domain/pieces'
import { Clap369Game } from '../Clap369Game'
import { clapCount, limitMs } from '../logic'
import { END_EFFECT_MS } from '../../shared/timing'
import { haptic } from '../../../platform/sdk'

vi.mock('../../../platform/sdk', () => ({ haptic: vi.fn(async () => {}) }))

const order = drawPieces(3, () => 0.5)

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(haptic).mockClear()
})
afterEach(() => vi.useRealTimers())

const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })
const ready = () => screen.getByRole('button', { name: '준비됐어요' })
const skip = () => screen.getByRole('button', { name: '숫자 넘기기' })
const clap = () => screen.getByRole('button', { name: '짝!' })
const num = () => Number(document.querySelector('.c3-num')!.textContent)
const startTurn = () => {
  advance(150)
  fireEvent.pointerDown(ready())
}
/** 현재 준비 화면의 숫자까지 올바르게 통과시킨다 */
const passTurn = (n: number) => {
  startTurn()
  expect(num()).toBe(n)
  const k = clapCount(n)
  if (k === 0) fireEvent.pointerDown(skip())
  else for (let i = 0; i < k; i++) fireEvent.pointerDown(clap())
}

test('규칙 띠와 준비 화면: 차례 문구와 준비됐어요 버튼', () => {
  render(<Clap369Game order={order} onFinish={() => {}} />)
  expect(screen.getByText('3·6·9가 들어가면 짝! 놓치면 벌칙')).toBeTruthy()
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  expect(ready()).toBeTruthy()
})

test('준비를 누르면 숫자 1과 두 버튼이 함께 보인다', () => {
  render(<Clap369Game order={order} onFinish={() => {}} />)
  startTurn()
  expect(num()).toBe(1)
  expect(skip()).toBeTruthy()
  expect(clap()).toBeTruthy()
})

test('짝 필요 여부를 DOM으로 힌트하지 않는다(1과 3에서 버튼 마크업 동일)', () => {
  render(<Clap369Game order={order} onFinish={() => {}} />)
  startTurn()
  const a = skip().outerHTML + clap().outerHTML
  fireEvent.pointerDown(skip())
  passTurn(2)
  startTurn()
  expect(num()).toBe(3)
  expect(skip().outerHTML + clap().outerHTML).toBe(a)
})

test('통과하면 다음 사람 준비 화면, haptic tap 1회, 150ms 동안은 준비 입력 무시', () => {
  render(<Clap369Game order={order} onFinish={() => {}} />)
  startTurn()
  fireEvent.pointerDown(skip())
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledWith('tap')
  expect(screen.getByText(`👉 ${pieceLabel(order[1])} 차례예요`)).toBeTruthy()
  fireEvent.pointerDown(ready())
  expect(screen.queryByRole('button', { name: '짝!' })).toBeNull()
  advance(150)
  fireEvent.pointerDown(ready())
  expect(num()).toBe(2)
})

test('같은 순간 skip을 연타해도 한 번만 통과(다음 숫자는 준비 화면 뒤)', () => {
  render(<Clap369Game order={order} onFinish={() => {}} />)
  startTurn()
  fireEvent.pointerDown(skip())
  expect(screen.queryByRole('button', { name: '숫자 넘기기' })).toBeNull()
  expect(haptic).toHaveBeenCalledTimes(1)
})

test('짝이 필요 없는데 짝을 누르면 패배: error 1회, onFinish 1회(그 차례 말)', () => {
  const onFinish = vi.fn()
  render(<Clap369Game order={order} onFinish={onFinish} />)
  startTurn()
  fireEvent.pointerDown(clap())
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledWith('error')
  expect(screen.getByText(`${pieceLabel(order[0])} 짝을 놓쳤어요`)).toBeTruthy()
  advance(END_EFFECT_MS - 1)
  expect(onFinish).not.toHaveBeenCalled()
  advance(1)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledWith(order[0])
  fireEvent.pointerDown(clap())
  fireEvent.pointerDown(skip())
  advance(10000)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledTimes(1)
})

test('제한 시간 초과 시 패배', () => {
  const onFinish = vi.fn()
  render(<Clap369Game order={order} onFinish={onFinish} />)
  startTurn()
  advance(limitMs(1) - 1)
  expect(onFinish).not.toHaveBeenCalled()
  advance(1)
  expect(haptic).toHaveBeenCalledWith('error')
  advance(END_EFFECT_MS)
  expect(onFinish).toHaveBeenCalledWith(order[0])
  expect(onFinish).toHaveBeenCalledTimes(1)
})

test('숫자 3: 짝 한 번이면 통과, 넘기기는 패배', () => {
  const onFinish = vi.fn()
  const { unmount } = render(<Clap369Game order={order} onFinish={onFinish} />)
  passTurn(1)
  passTurn(2)
  startTurn()
  expect(num()).toBe(3)
  fireEvent.pointerDown(clap())
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  unmount()

  const f2 = vi.fn()
  render(<Clap369Game order={order} onFinish={f2} />)
  passTurn(1)
  passTurn(2)
  startTurn()
  fireEvent.pointerDown(skip())
  advance(END_EFFECT_MS)
  expect(f2).toHaveBeenCalledWith(order[2])
})

test('숫자 33: 짝 두 번 통과(탭마다 햅틱 없음), 세 번째는 이미 다음 화면', () => {
  render(<Clap369Game order={order} onFinish={() => {}} />)
  for (let n = 1; n < 33; n++) passTurn(n)
  vi.mocked(haptic).mockClear()
  startTurn()
  expect(num()).toBe(33)
  fireEvent.pointerDown(clap())
  expect(haptic).not.toHaveBeenCalled()
  expect(num()).toBe(33)
  fireEvent.pointerDown(clap())
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('button', { name: '준비됐어요' })).toBeTruthy()
})

test('숫자 33에서 짝이 한 번 모자라면 시간 초과로 패배', () => {
  const onFinish = vi.fn()
  render(<Clap369Game order={order} onFinish={onFinish} />)
  for (let n = 1; n < 33; n++) passTurn(n)
  startTurn()
  fireEvent.pointerDown(clap())
  advance(limitMs(33))
  advance(END_EFFECT_MS)
  expect(onFinish).toHaveBeenCalledTimes(1)
})

test('99를 통과하면 1로 돌아간다', () => {
  render(<Clap369Game order={order} onFinish={() => {}} />)
  for (let n = 1; n <= 99; n++) passTurn(n)
  startTurn()
  expect(num()).toBe(1)
})

test('백그라운드로 가면 그 시도는 무효: 같은 사람 준비 화면 + 다시 해 주세요', () => {
  const onFinish = vi.fn()
  render(<Clap369Game order={order} onFinish={onFinish} />)
  startTurn()
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
  act(() => { document.dispatchEvent(new Event('visibilitychange')) })
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  expect(screen.getByText('다시 해 주세요')).toBeTruthy()
  advance(20000)
  expect(onFinish).not.toHaveBeenCalled()
  startTurn()
  expect(num()).toBe(1)
})

// 33까지 통과시키고 33의 시도를 시작한다(짝 2번 필요)
const to33 = () => {
  for (let n = 1; n < 33; n++) passTurn(n)
  startTurn()
}

test('키보드 Enter: 한 번 누르면 짝 1회만 센다(keydown은 막지 않는다)', () => {
  render(<Clap369Game order={order} onFinish={() => {}} />)
  to33()
  const b = clap()
  expect(fireEvent.keyDown(b, { key: 'Enter' })).toBe(true)
  fireEvent.click(b, { detail: 0 })
  expect(num()).toBe(33)
  expect(screen.queryByRole('button', { name: '준비됐어요' })).toBeNull()
  fireEvent.keyDown(b, { key: 'Enter' })
  fireEvent.click(b, { detail: 0 })
  expect(screen.getByRole('button', { name: '준비됐어요' })).toBeTruthy()
})

test('키보드 Space: keydown/keyup/click 한 번이 짝 1회로 센다', () => {
  render(<Clap369Game order={order} onFinish={() => {}} />)
  to33()
  const b = clap()
  const press = () => {
    expect(fireEvent.keyDown(b, { key: ' ' })).toBe(true)
    fireEvent.keyUp(b, { key: ' ' })
    fireEvent.click(b, { detail: 0 })
  }
  press()
  expect(screen.queryByRole('button', { name: '준비됐어요' })).toBeNull()
  press()
  expect(screen.getByRole('button', { name: '준비됐어요' })).toBeTruthy()
})

test('포인터 탭의 click(detail>=1)은 중복으로 세지 않는다', () => {
  render(<Clap369Game order={order} onFinish={() => {}} />)
  to33()
  fireEvent.pointerDown(clap())
  fireEvent.click(clap(), { detail: 1 })
  expect(screen.queryByRole('button', { name: '준비됐어요' })).toBeNull()
  fireEvent.pointerDown(clap())
  expect(screen.getByRole('button', { name: '준비됐어요' })).toBeTruthy()
})

test('now 주입: 마감 1ms 전 탭은 통과, 마감 시각 탭은 패배', () => {
  let t = 1000
  const mk = (onFinish: () => void) =>
    render(<Clap369Game order={order} onFinish={onFinish} now={() => t} />)
  const first = mk(() => {})
  fireEvent.pointerDown(ready())
  t = 1000 + limitMs(1) - 1
  fireEvent.pointerDown(skip())
  expect(screen.getByText(`👉 ${pieceLabel(order[1])} 차례예요`)).toBeTruthy()
  first.unmount()

  t = 5000
  const onFinish = vi.fn()
  mk(onFinish)
  fireEvent.pointerDown(ready())
  t = 5000 + limitMs(1)
  fireEvent.pointerDown(skip())
  expect(screen.getByText(`${pieceLabel(order[0])} 짝을 놓쳤어요`)).toBeTruthy()
  expect(haptic).toHaveBeenLastCalledWith('error')
  advance(END_EFFECT_MS)
  expect(onFinish).toHaveBeenCalledTimes(1)
})

test('움직임 줄이기에서도 시간 막대가 계단식으로 줄어든다(css)', () => {
  const css = readFileSync(join(__dirname, '..', 'clap369.css'), 'utf8')
  const rm = css.slice(css.indexOf('prefers-reduced-motion'))
  expect(rm).toMatch(/steps\(/)
  expect(rm).not.toMatch(/animation:\s*none/)
})

test('패배 연출 중 언마운트하면 onFinish 미호출', () => {
  const onFinish = vi.fn()
  const { unmount } = render(<Clap369Game order={order} onFinish={onFinish} />)
  startTurn()
  fireEvent.pointerDown(clap())
  unmount()
  advance(10000)
  expect(onFinish).not.toHaveBeenCalled()
})

test('진행 중 언마운트하면 제한 시간 타이머가 정리된다', () => {
  const onFinish = vi.fn()
  const { unmount } = render(<Clap369Game order={order} onFinish={onFinish} />)
  startTurn()
  unmount()
  advance(10000)
  expect(onFinish).not.toHaveBeenCalled()
  expect(haptic).not.toHaveBeenCalled()
})
