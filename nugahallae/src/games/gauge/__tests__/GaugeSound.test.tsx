import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { drawPieces } from '../../../domain/pieces'
import { GaugeGame } from '../GaugeGame'
import { playSfx } from '../../../platform/sound'

vi.mock('../../../platform/sdk', () => ({ haptic: vi.fn(async () => {}) }))
vi.mock('../../../platform/sound', () => ({ playSfx: vi.fn() }))

const order = drawPieces(3, () => 0.5)
// rng=0.5 → 시작 위치 0.5(중앙), 왼쪽으로. 900ms마다 끝에서 끝
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
  vi.mocked(playSfx).mockClear()
  // 움직이는 동안(중앙을 여러 번 지나도) 소리가 없다
  for (let k = 0; k < ms; k += 16) {
    clock += 16
    advance(16)
  }
  expect(playSfx).not.toHaveBeenCalled()
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

test('막대가 움직이는 동안은 무음이고, 멈출 때 소리는 기록과 무관하게 같다', () => {
  render(<GaugeGame order={order} onFinish={() => {}} rng={() => 0.5} now={now} />)
  // 1800ms 뒤 정확히 중앙 / 450ms 뒤 왼쪽 끝 / 1350ms 뒤 오른쪽 끝
  const center = play(1808)
  next()
  const edge = play(448)
  next()
  const other = play(1344)
  expect(center).toEqual([['stopClick'], ['record']])
  expect(edge).toEqual(center)
  expect(other).toEqual(center)
})
