import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import { drawPieces } from '../../../domain/pieces'
import { BombGame } from '../BombGame'
import { playSfx, startLoop } from '../../../platform/sound'

vi.mock('../../../platform/sdk', () => ({ haptic: vi.fn(async () => {}) }))
const loop = vi.hoisted(() => ({ set: vi.fn(), stop: vi.fn() }))
vi.mock('../../../platform/sound', () => ({
  playSfx: vi.fn(),
  startLoop: vi.fn(() => loop),
  notePitch: (i: number) => 1 + i / 10,
}))

const order = drawPieces(3, () => 0.5)
let clock = 0
const now = () => clock
const advance = (ms: number) => act(() => { clock += ms; vi.advanceTimersByTime(ms) })

beforeEach(() => {
  vi.useFakeTimers()
  clock = 5000
  vi.mocked(playSfx).mockClear()
  vi.mocked(startLoop).mockClear()
  loop.set.mockClear()
  loop.stop.mockClear()
})
afterEach(() => vi.useRealTimers())

const run = (rng: () => number) => {
  render(<BombGame order={order} onFinish={() => {}} rng={rng} now={now} />)
  fireEvent.click(screen.getByRole('button', { name: '불 붙이기' }))
  for (let k = 0; k < 10; k++) {
    advance(1000)
    fireEvent.pointerDown(screen.getByRole('button', { name: /^탭탭! 넘기기/ }), { button: 0 })
  }
  const r = {
    sfx: vi.mocked(playSfx).mock.calls.map((c) => [...c]),
    loops: vi.mocked(startLoop).mock.calls.map((c) => [...c]),
    sets: loop.set.mock.calls.map((c) => [...c]),
  }
  cleanup()
  vi.mocked(playSfx).mockClear()
  vi.mocked(startLoop).mockClear()
  loop.set.mockClear()
  return r
}

test('심지 소리는 심지 길이와 무관하다(12초든 30초든 첫 10초의 소리가 같다)', () => {
  const short = run(() => 0)
  const long = run(() => 0.99)
  expect(short).toEqual(long)
  expect(short.loops).toEqual([['fuse']])
  // 타는 동안 소리를 바꾸지 않는다(빨라지는 째깍 없음)
  expect(short.sets).toEqual([])
})

test('터지면 심지 소리가 멈추고 펑', () => {
  render(<BombGame order={order} onFinish={() => {}} rng={() => 0} now={now} />)
  fireEvent.click(screen.getByRole('button', { name: '불 붙이기' }))
  advance(12100)
  expect(loop.stop).toHaveBeenCalled()
  expect(vi.mocked(playSfx).mock.lastCall).toEqual(['boom'])
})
