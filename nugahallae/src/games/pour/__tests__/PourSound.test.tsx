import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import { drawPieces } from '../../../domain/pieces'
import { PourGame } from '../PourGame'
import { playSfx, startLoop } from '../../../platform/sound'

vi.mock('../../../platform/sdk', () => ({ haptic: vi.fn(async () => {}) }))
const loop = vi.hoisted(() => ({ set: vi.fn(), stop: vi.fn() }))
vi.mock('../../../platform/sound', () => ({ playSfx: vi.fn(), startLoop: vi.fn(() => loop) }))

const order = drawPieces(3, () => 0.5)
const cup = () => screen.getByRole('button', { name: /잔/ })
const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'],
  })
  vi.mocked(playSfx).mockClear()
  vi.mocked(startLoop).mockClear()
  loop.set.mockClear()
  loop.stop.mockClear()
})
afterEach(() => vi.useRealTimers())

const pourFor = (rng: () => number, ms: number) => {
  render(<PourGame order={order} onFinish={() => {}} rng={rng} />)
  fireEvent.pointerDown(cup())
  advance(ms)
  fireEvent.pointerUp(cup())
  const r = { sets: loop.set.mock.calls.map((c) => [...c]), sfx: vi.mocked(playSfx).mock.calls.map((c) => [...c]) }
  cleanup()
  loop.set.mockClear()
  vi.mocked(playSfx).mockClear()
  return r
}

test('붓는 소리는 숨은 한계와 무관하다(한계가 작든 크든 같은 소리)', () => {
  // rng=0 → 한계 6(106에서 넘침), rng=0.99 → 한계 약 14. 7.6초(약 104)는 둘 다 넘치기 전
  const small = pourFor(() => 0, 7600)
  const big = pourFor(() => 0.99, 7600)
  expect(small.sets.length).toBeGreaterThan(10)
  expect(small).toEqual(big)
})

test('잔 높이(CAP) 위로는 소리 높이가 더 오르지 않는다', () => {
  const r = pourFor(() => 0.99, 8500)
  const pitches = r.sets.filter((c) => c[0] === 'pitch').map((c) => c[1] as number)
  const top = Math.max(...pitches)
  // CAP(100)까지 약 7.3초. 그 뒤의 높이는 모두 최고값 그대로
  expect(pitches.slice(-5).every((p) => p === top)).toBe(true)
})

test('떼면 물소리가 멈추고, 짧은 탭은 한 방울 소리', () => {
  render(<PourGame order={order} onFinish={() => {}} />)
  fireEvent.pointerDown(cup())
  advance(1000)
  fireEvent.pointerUp(cup())
  expect(startLoop).toHaveBeenCalledWith('water')
  expect(loop.stop).toHaveBeenCalled()
  fireEvent.pointerDown(cup())
  advance(50)
  fireEvent.pointerUp(cup())
  expect(vi.mocked(playSfx).mock.calls).toContainEqual(['pour.drip'])
})
