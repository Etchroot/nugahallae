import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { drawPieces } from '../../../domain/pieces'
import { TimerGame } from '../TimerGame'
import { playSfx } from '../../../platform/sound'

vi.mock('../../../platform/sdk', () => ({ haptic: vi.fn(async () => {}) }))
vi.mock('../../../platform/sound', () => ({ playSfx: vi.fn() }))

const order = drawPieces(3, () => 0.5)
let clock = 0
const now = () => clock

beforeEach(() => {
  vi.useFakeTimers()
  clock = 0
  vi.mocked(playSfx).mockClear()
})
afterEach(() => vi.useRealTimers())

const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })
const play = (ms: number) => {
  clock += 500
  fireEvent.click(screen.getByRole('button', { name: '시작' }))
  expect(vi.mocked(playSfx).mock.calls).toEqual([['goBeep']])
  // 달리는 동안(1초씩 끊어 진행)은 소리가 하나도 없다
  for (let k = 0; k < ms; k += 1000) {
    const step = Math.min(1000, ms - k)
    clock += step
    advance(step)
  }
  expect(vi.mocked(playSfx).mock.calls).toEqual([['goBeep']])
  vi.mocked(playSfx).mockClear()
  fireEvent.pointerDown(screen.getByRole('button', { name: '멈춰!' }))
  const atStop = vi.mocked(playSfx).mock.calls.map((c) => [...c])
  vi.mocked(playSfx).mockClear()
  return atStop
}
const next = () => {
  clock += 500
  fireEvent.click(screen.getByRole('button', { name: /^(다음 사람|결과 보기)$/ }))
  vi.mocked(playSfx).mockClear()
}

test('달리는 동안은 무음이고, 멈출 때 소리는 기록과 무관하게 같다', () => {
  // 목표 7.5초: 정확히 / 많이 빠르게 / 많이 늦게
  render(<TimerGame order={order} onFinish={() => {}} rng={() => 0.5} now={now} />)
  const exact = play(7500)
  next()
  const early = play(3000)
  next()
  const late = play(12000)
  expect(exact).toEqual([['stopClick'], ['record']])
  expect(early).toEqual(exact)
  expect(late).toEqual(exact)
})
