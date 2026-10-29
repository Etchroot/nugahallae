import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { drawPieces } from '../../../domain/pieces'
import { RulerGame } from '../RulerGame'
import { CM_PX } from '../logic'
import { playSfx, startLoop } from '../../../platform/sound'

vi.mock('../../../platform/sdk', () => ({ haptic: vi.fn(async () => {}) }))
const loop = vi.hoisted(() => ({ set: vi.fn(), stop: vi.fn() }))
vi.mock('../../../platform/sound', () => ({ playSfx: vi.fn(), startLoop: vi.fn(() => loop) }))

const order = drawPieces(3, () => 0.5)
let clock = 0
const now = () => clock

beforeEach(() => {
  vi.useFakeTimers()
  clock = 0
  vi.mocked(playSfx).mockClear()
  vi.mocked(startLoop).mockClear()
  loop.set.mockClear()
  loop.stop.mockClear()
})
afterEach(() => vi.useRealTimers())

const area = () => screen.getByTestId('ruler-area')
/** cm만큼 여러 번에 걸쳐 끌고 떼면서 난 소리를 모은다 */
const drawCm = (cm: number) => {
  vi.mocked(playSfx).mockClear()
  loop.set.mockClear()
  const x1 = 20 + cm * CM_PX
  fireEvent.pointerDown(area(), { clientX: 20, clientY: 100, pointerId: 1 })
  for (let k = 1; k <= 8; k++) fireEvent.pointerMove(area(), { clientX: 20 + ((x1 - 20) * k) / 8, clientY: 100, pointerId: 1 })
  fireEvent.pointerUp(area(), { clientX: x1, clientY: 100, pointerId: 1 })
  return { sfx: vi.mocked(playSfx).mock.calls.map((c) => [...c]), sets: loop.set.mock.calls.map((c) => [...c]) }
}
const next = () => {
  clock += 500
  fireEvent.click(screen.getByRole('button', { name: /^(다음 사람|결과 보기)$/ }))
}

test('긋는 소리와 떼는 소리는 길이·오차와 무관하게 모두 같다(기록은 끝까지 숨겨진다)', () => {
  // 목표 6cm: 정확히 그은 사람, 많이 틀린 사람, 조금 틀린 사람
  render(<RulerGame order={order} onFinish={() => {}} rng={() => 0.5} now={now} />)
  const exact = drawCm(6)
  next()
  const far = drawCm(2)
  next()
  const near = drawCm(6.4)
  expect(exact.sfx).toEqual([['tapSoft'], ['stopClick']])
  expect(far).toEqual(exact)
  expect(near).toEqual(exact)
  // 긁는 소리는 길이에 따라 바꾸지 않는다
  expect(exact.sets).toEqual([])
  expect(startLoop).toHaveBeenCalledWith('chalk')
  expect(loop.stop).toHaveBeenCalledTimes(3)
})
