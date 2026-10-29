import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { drawPieces, pieceLabel } from '../../../domain/pieces'
import { TopicBombGame } from '../TopicBombGame'
import { FUSE_MIN, TOPICS } from '../logic'
import { END_EFFECT_MS } from '../../shared/timing'
import { haptic } from '../../../platform/sdk'

vi.mock('../../../platform/sdk', () => ({ haptic: vi.fn(async () => {}) }))

const order = drawPieces(3, () => 0.5)
const FUSE = FUSE_MIN // rng 0 → 9초

let clock = 0
const now = () => clock
const advance = (ms: number) =>
  act(() => {
    clock += ms
    vi.advanceTimersByTime(ms)
  })

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(haptic).mockClear()
  clock = 10000
})
afterEach(() => vi.useRealTimers())

const mount = (rng = () => 0, onFinish: (p: unknown) => void = () => {}) =>
  render(<TopicBombGame order={order} onFinish={onFinish} rng={rng} now={now} />)
const start = () => fireEvent.click(screen.getByRole('button', { name: '시작하기' }))
const pass = () => fireEvent.click(screen.getByRole('button', { name: '넘기기' }))

test('규칙 띠, 주제, 시작 버튼, 주제 바꾸기', () => {
  mount()
  expect(screen.getByText('주제에 맞는 말을 하고 넘기기! 터지면 벌칙')).toBeTruthy()
  expect(screen.getByText(TOPICS[0])).toBeTruthy()
  expect(screen.getByRole('button', { name: '시작하기' })).toBeTruthy()
  expect(screen.getByRole('button', { name: /^주제 바꾸기/ })).toBeTruthy()
})

test('주제 바꾸기는 시작 전에 최대 3번, 바꿀 때마다 다른 주제', () => {
  mount()
  const seen = [screen.getByTestId('tb-topic').textContent]
  for (let n = 0; n < 3; n++) {
    fireEvent.click(screen.getByRole('button', { name: /^주제 바꾸기/ }))
    seen.push(screen.getByTestId('tb-topic').textContent)
  }
  for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1])
  expect(screen.queryByRole('button', { name: /^주제 바꾸기/ })).toBeNull()
})

test('시작하면 주제는 계속 보이고 바꾸기는 사라진다', () => {
  mount()
  start()
  expect(screen.getByTestId('tb-topic').textContent).toBe(TOPICS[0])
  expect(screen.queryByRole('button', { name: /^주제 바꾸기/ })).toBeNull()
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  expect(screen.getByRole('button', { name: '넘기기' })).toBeTruthy()
})

test('시작 직후 400ms 안의 넘기기 탭은 무시, 이후 넘기기는 tap 1회 + 차례 순환', () => {
  mount()
  start()
  pass() // 더블탭
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  advance(400)
  pass()
  expect(screen.getByText(`👉 ${pieceLabel(order[1])} 차례예요`)).toBeTruthy()
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledWith('tap')
  pass() // 연타
  expect(screen.getByText(`👉 ${pieceLabel(order[1])} 차례예요`)).toBeTruthy()
  advance(400)
  pass()
  advance(400)
  pass()
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
})

test('터지면 들고 있는 사람 패배: 오버레이, error 1회, 500ms 뒤 onFinish 1회', () => {
  const onFinish = vi.fn()
  mount(() => 0, onFinish)
  start()
  advance(400)
  pass()
  vi.mocked(haptic).mockClear()
  advance(FUSE - 401)
  expect(haptic).not.toHaveBeenCalled()
  advance(1)
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledWith('error')
  expect(screen.getByText(`${pieceLabel(order[1])} 폭탄이 터졌어요`)).toBeTruthy()
  advance(400)
  fireEvent.click(screen.getByRole('button', { name: '넘기기' })) // 터진 뒤 입력 무시
  advance(END_EFFECT_MS - 400 - 1)
  expect(onFinish).not.toHaveBeenCalled()
  advance(1)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledWith(order[1])
  advance(10000)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledTimes(1)
})

test('큰 시간 점프(타이머 지연)에도 실제 경과 시간으로 정확히 터진다', () => {
  const onFinish = vi.fn()
  mount(() => 0, onFinish)
  start()
  act(() => {
    clock += FUSE + 5000
    vi.advanceTimersByTime(100)
  })
  expect(screen.getByText(`${pieceLabel(order[0])} 폭탄이 터졌어요`)).toBeTruthy()
  advance(END_EFFECT_MS)
  expect(onFinish).toHaveBeenCalledTimes(1)
})

test('타이머 틱이 많아도 시계가 덜 갔으면 터지지 않는다', () => {
  const onFinish = vi.fn()
  mount(() => 0, onFinish)
  start()
  act(() => {
    clock += 3000
    vi.advanceTimersByTime(30000)
  })
  expect(haptic).not.toHaveBeenCalled()
  expect(onFinish).not.toHaveBeenCalled()
})

test('심지 시간은 DOM에 드러나지 않는다(숫자·aria·data·title)', () => {
  const a = mount(() => 0)
  start()
  advance(1000)
  const html = a.container.innerHTML
  expect(html).not.toMatch(/9000|9초|\b9s\b/)
  expect(html).not.toMatch(/aria-valuenow|aria-valuemax|data-fuse|data-time|data-left/)
  a.unmount()
  // 심지가 달라도 시작 직후 화면은 같다
  const x = mount(() => 0)
  start()
  const hx = x.container.innerHTML
  x.unmount()
  const y = mount(() => 0.999)
  const topicsDiffer = TOPICS[0] !== TOPICS[29]
  expect(topicsDiffer).toBe(true)
  start()
  const hy = y.container.innerHTML.replace(TOPICS[29], TOPICS[0])
  expect(hy).toBe(hx)
})

test('불 붙이기 연타는 심지를 한 번만 시작', () => {
  const onFinish = vi.fn()
  mount(() => 0, onFinish)
  const b = screen.getByRole('button', { name: '시작하기' })
  fireEvent.click(b)
  fireEvent.click(b)
  advance(FUSE + 5000)
  expect(onFinish).toHaveBeenCalledTimes(1)
})

test('진행 중·터진 뒤 언마운트 → onFinish·햅틱 없음', () => {
  const onFinish = vi.fn()
  const m = mount(() => 0, onFinish)
  start()
  advance(1000)
  m.unmount()
  advance(FUSE * 3)
  expect(onFinish).not.toHaveBeenCalled()
  expect(haptic).not.toHaveBeenCalled()
  vi.mocked(haptic).mockClear()
  const m2 = mount(() => 0, onFinish)
  start()
  advance(FUSE - 1)
  advance(1) // 이 틱에서 터진다
  expect(haptic).toHaveBeenCalledTimes(1)
  m2.unmount()
  advance(5000)
  expect(onFinish).not.toHaveBeenCalled()
})

test('넘기기 버튼은 높이 96px 이상(css), 본문은 라이트 토큰만 쓴다', () => {
  const css = readFileSync(join(__dirname, '..', 'topicbomb.css'), 'utf8')
  expect(css).toMatch(/\.tb-pass\s*\{[^}]*min-height:\s*(9[6-9]|1\d\d)px/)
  expect(css).not.toMatch(/#191f28|#000\b/i)
})

test('심지가 이미 다 탔는데 틱이 아직 안 돈 상태에서 넘기기 → 넘어가지 않고 터진다', () => {
  const onFinish = vi.fn()
  mount(() => 0, onFinish)
  start()
  act(() => {
    clock += FUSE + 1000 // 타이머는 돌리지 않고 시계만 감
  })
  pass()
  expect(screen.getByText(`${pieceLabel(order[0])} 폭탄이 터졌어요`)).toBeTruthy()
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledWith('error')
  advance(END_EFFECT_MS)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledWith(order[0])
})
