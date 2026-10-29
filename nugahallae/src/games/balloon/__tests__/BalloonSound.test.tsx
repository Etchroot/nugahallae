import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { drawPieces } from '../../../domain/pieces'
import { BalloonGame } from '../BalloonGame'
import { playSfx } from '../../../platform/sound'

vi.mock('../../../platform/sdk', () => ({ haptic: vi.fn(async () => {}) }))
vi.mock('../../../platform/sound', () => ({ playSfx: vi.fn() }))

const order = drawPieces(3, () => 0.5)
const pumpBtn = () => screen.getByRole('button', { name: /펌프!/ })
const passBtn = () => screen.getByRole('button', { name: '다음 사람에게 넘기기' })

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(playSfx).mockClear()
})
afterEach(() => vi.useRealTimers())

const play = (rng: () => number) => {
  render(<BalloonGame order={order} onFinish={() => {}} rng={rng} />)
  fireEvent.click(pumpBtn())
  fireEvent.click(pumpBtn())
  fireEvent.click(passBtn())
  fireEvent.click(pumpBtn())
  const calls = vi.mocked(playSfx).mock.calls.map((c) => [...c])
  cleanup()
  vi.mocked(playSfx).mockClear()
  return calls
}

test('펌프 소리는 보이는 크기만 따르고, 터질 때까지 남은 횟수와 무관하다', () => {
  // rng=0 → 4번째에 터짐, rng=0.99 → 한참 남음. 3번까지는 소리가 같아야 한다
  const soon = play(() => 0)
  const late = play(() => 0.99)
  expect(soon).toEqual(late)
  const pumps = soon.filter((c) => c[0] === 'balloon.pump')
  expect(pumps).toHaveLength(3)
  // 펌프할수록(풍선이 커질수록) 높아진다
  const pitch = pumps.map((c) => (c[1] as { pitch: number }).pitch)
  expect(pitch[1]).toBeGreaterThan(pitch[0])
  expect(pitch[2]).toBeGreaterThan(pitch[1])
})

test('터지면 펑 소리', () => {
  render(<BalloonGame order={order} onFinish={() => {}} rng={() => 0} />)
  fireEvent.click(pumpBtn())
  fireEvent.click(pumpBtn())
  fireEvent.click(passBtn())
  fireEvent.click(pumpBtn())
  fireEvent.click(pumpBtn())
  expect(vi.mocked(playSfx).mock.lastCall).toEqual(['balloon.pop'])
})
