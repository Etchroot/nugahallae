import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { drawPieces, pieceLabel } from '../../../domain/pieces'
import { LastTouchGame } from '../LastTouchGame'
import { COUNT_STEP_MS, WAIT_MIN_MS } from '../logic'
import { playSfx } from '../../../platform/sound'

vi.mock('../../../platform/sdk', () => ({ haptic: vi.fn(async () => {}) }))
vi.mock('../../../platform/sound', () => ({ playSfx: vi.fn() }))

const order = drawPieces(3, () => 0.5)
let t = 0
const now = () => t

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(playSfx).mockClear()
  t = 10000
})
afterEach(() => vi.useRealTimers())

const advance = (ms: number) =>
  act(() => {
    t += ms
    vi.advanceTimersByTime(ms)
  })
let pid = 0
const press = (i: number) => {
  const e = new Event('pointerdown', { bubbles: true, cancelable: true })
  Object.assign(e, { pointerId: ++pid, pointerType: 'touch' })
  fireEvent(screen.getByRole('button', { name: pieceLabel(order[i]) }), e)
}
const names = () => vi.mocked(playSfx).mock.calls.map((c) => c[0])

test('3·2·1 뒤 기다리는 동안은 무음, 신호 순간에 모두에게 같은 신호음', () => {
  render(<LastTouchGame order={order} onFinish={() => {}} rng={() => 0} now={now} />)
  fireEvent.click(screen.getByRole('button', { name: '시작' }))
  advance(COUNT_STEP_MS * 3)
  expect(names()).toEqual(['countBeep', 'countBeep', 'countBeep', 'tapSoft'])
  vi.mocked(playSfx).mockClear()
  advance(WAIT_MIN_MS - 1)
  expect(playSfx).not.toHaveBeenCalled()
  advance(1)
  expect(names()).toEqual(['lasttouch.signal'])
  vi.mocked(playSfx).mockClear()
  press(0)
  press(1)
  press(2)
  expect(names()).toEqual(['stopClick', 'stopClick', 'stopClick', 'loseSting'])
})

test('신호 전에 누르면 버저', () => {
  render(<LastTouchGame order={order} onFinish={() => {}} rng={() => 0} now={now} />)
  fireEvent.click(screen.getByRole('button', { name: '시작' }))
  advance(COUNT_STEP_MS * 3 + 100)
  vi.mocked(playSfx).mockClear()
  press(1)
  expect(names()).toEqual(['buzz', 'loseSting'])
})
