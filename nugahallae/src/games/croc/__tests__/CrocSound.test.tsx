import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { drawPieces } from '../../../domain/pieces'
import { CrocGame } from '../CrocGame'
import { playSfx } from '../../../platform/sound'

vi.mock('../../../platform/sdk', () => ({ haptic: vi.fn(async () => {}) }))
vi.mock('../../../platform/sound', () => ({ playSfx: vi.fn() }))

const order = drawPieces(3, () => 0.5)
const tooth = (i: number) => screen.getByRole('button', { name: `이빨 ${i + 1}` })

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(playSfx).mockClear()
})
afterEach(() => vi.useRealTimers())

test('안전한 이빨은 어느 것이든, 함정이 어디든 똑같은 소리 하나', () => {
  // 함정 0번: 1~11번은 안전
  render(<CrocGame order={order} onFinish={() => {}} rng={() => 0} />)
  for (const i of [1, 5, 10, 11]) fireEvent.click(tooth(i))
  const nearTrap = vi.mocked(playSfx).mock.calls.map((c) => [...c])
  expect(nearTrap).toEqual([['croc.tooth'], ['croc.tooth'], ['croc.tooth'], ['croc.tooth']])
  cleanup()
  vi.mocked(playSfx).mockClear()
  // 함정 11번: 다른 이빨을 눌러도 같은 소리
  render(<CrocGame order={order} onFinish={() => {}} rng={() => 0.99} />)
  for (const i of [1, 5, 10, 0]) fireEvent.click(tooth(i))
  expect(vi.mocked(playSfx).mock.calls).toEqual(nearTrap)
})

test('함정을 누르면 콱 소리만 난다', () => {
  render(<CrocGame order={order} onFinish={() => {}} rng={() => 0} />)
  fireEvent.click(tooth(0))
  expect(vi.mocked(playSfx).mock.calls).toEqual([['croc.chomp']])
})
