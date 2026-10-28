import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { drawPieces, pieceLabel } from '../../../domain/pieces'
import { ReactionGame } from '../ReactionGame'
import { haptic } from '../../../platform/sdk'

vi.mock('../../../platform/sdk', () => ({ haptic: vi.fn(async () => {}) }))

const order = drawPieces(3, () => 0.5)
let clock = 0
const now = () => clock
// rng=0 → 대기 1500ms
const WAIT = 1500

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(haptic).mockClear()
  clock = 10000
})
afterEach(() => vi.useRealTimers())

const advance = (ms: number) => act(() => { clock += ms; vi.advanceTimersByTime(ms) })
const pad = () => screen.getByTestId('pad')
const tapPad = () => fireEvent.pointerDown(pad())
const next = () => {
  clock += 500
  fireEvent.click(screen.getByRole('button', { name: /^(다음 사람|결과 보기)$/ }))
}
const mount = (onFinish = vi.fn(), o = order, rng = () => 0) => {
  render(<ReactionGame order={o} onFinish={onFinish} rng={rng} now={now} />)
  return onFinish
}
/** 준비 → 대기 → 초록 → ms 후 탭 */
const reactAfter = (ms: number) => {
  tapPad()
  advance(WAIT)
  advance(ms)
  tapPad()
}
const foul = () => {
  tapPad()
  advance(500) // 탭 가드(400ms) 이후
  tapPad()
}

test('규칙 띠, 차례, 준비 패드가 보인다', () => {
  mount()
  expect(screen.getByText('초록색이 되면 탭! 가장 느리면 벌칙')).toBeTruthy()
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  expect(pad().textContent).toBe('탭해서 준비')
})

test('탭 → 대기(빨강) → 지금!! → 반응 시간 ms 표시', () => {
  mount()
  tapPad()
  expect(pad().textContent).toBe('초록색이 되면 탭!')
  expect(pad().getAttribute('data-state')).toBe('wait')
  advance(WAIT)
  expect(pad().textContent).toBe('지금!!')
  expect(pad().getAttribute('data-state')).toBe('go')
  advance(312)
  tapPad()
  expect(pad().textContent).toBe('312 ms')
  expect(screen.getByRole('button', { name: '다음 사람' })).toBeTruthy()
})

test('빨간색일 때 누르면 부정출발, 시작 직후 더블탭은 무시', () => {
  mount()
  tapPad()
  advance(100)
  tapPad() // 더블탭 → 무시
  expect(pad().getAttribute('data-state')).toBe('wait')
  advance(400)
  tapPad() // 진짜 부정출발
  expect(pad().textContent).toBe('부정출발! 🚫')
  advance(WAIT * 3) // 취소된 타이머가 초록으로 바꾸지 않는다
  expect(pad().textContent).toBe('부정출발! 🚫')
})

test('끝난 뒤 패드 입력은 무시', () => {
  mount()
  reactAfter(300)
  tapPad()
  tapPad()
  expect(pad().textContent).toBe('300 ms')
})

test('가장 느린 사람이 onFinish로 1회, haptic error 1회, 마지막 버튼은 결과 보기', () => {
  const onFinish = mount()
  reactAfter(300)
  next()
  reactAfter(520)
  next()
  reactAfter(250)
  expect(screen.queryByRole('button', { name: '다음 사람' })).toBeNull()
  next()
  const items = screen.getAllByRole('listitem')
  expect(items.map((l) => l.querySelector('b')?.textContent)).toEqual(['250 ms', '300 ms', '520 ms'])
  expect(items[2].className).toContain('rg-lose')
  advance(900)
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledWith('error')
  expect(screen.getByText(`${pieceLabel(order[1])} 520ms로 제일 느렸어요 🐢`)).toBeTruthy()
  advance(1200)
  advance(5000)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledWith(order[1])
})

test('부정출발은 최악 기록, 동점이면 동점자 중 랜덤 문구', () => {
  const onFinish = mount()
  foul()
  next()
  reactAfter(300)
  next()
  foul()
  next()
  const items = screen.getAllByRole('listitem')
  expect(items.map((l) => l.querySelector('b')?.textContent)).toEqual(['300 ms', '부정출발 🚫', '부정출발 🚫'])
  advance(900)
  // rng=0 → 동점 후보 중 첫 번째(order[0])
  expect(screen.getByText(`${pieceLabel(order[0])} 부정출발로 탈락했어요 🚫 (동점자 중 랜덤)`)).toBeTruthy()
  advance(1200)
  expect(onFinish).toHaveBeenCalledWith(order[0])
  expect(onFinish).toHaveBeenCalledTimes(1)
})

test('대기 중 언마운트 → 타이머 정리, onFinish 미호출', () => {
  const onFinish = vi.fn()
  const { unmount } = render(<ReactionGame order={order} onFinish={onFinish} rng={() => 0} now={now} />)
  tapPad()
  unmount()
  advance(20000)
  expect(onFinish).not.toHaveBeenCalled()
  expect(haptic).not.toHaveBeenCalled()
})

test('결과 연출 도중 언마운트 → onFinish 미호출', () => {
  const onFinish = vi.fn()
  const two = drawPieces(2, () => 0.5)
  const { unmount } = render(<ReactionGame order={two} onFinish={onFinish} rng={() => 0} now={now} />)
  reactAfter(300)
  next()
  reactAfter(400)
  next()
  advance(900)
  unmount()
  advance(5000)
  expect(onFinish).not.toHaveBeenCalled()
})
