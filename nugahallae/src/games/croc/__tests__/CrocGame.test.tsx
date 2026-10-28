import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { drawPieces, pieceLabel } from '../../../domain/pieces'
import { CrocGame } from '../CrocGame'
import { END_EFFECT_MS } from '../../shared/timing'
import { haptic } from '../../../platform/sdk'

vi.mock('../../../platform/sdk', () => ({ haptic: vi.fn(async () => {}) }))

const order = drawPieces(3, () => 0.5)

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(haptic).mockClear()
})
afterEach(() => vi.useRealTimers())

const tooth = (i: number) => screen.getByRole('button', { name: `이빨 ${i + 1}` }) as HTMLButtonElement
const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })

test('규칙 띠, 차례, 이빨 12개가 보인다', () => {
  render(<CrocGame order={order} onFinish={() => {}} rng={() => 0} />)
  expect(screen.getByText('아픈 이빨은 딱 하나! 물리면 벌칙')).toBeTruthy()
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  expect(screen.getAllByRole('button', { name: /^이빨 / })).toHaveLength(12)
})

test('안전한 이빨은 눌리면 비활성 + 차례가 넘어간다', () => {
  render(<CrocGame order={order} onFinish={() => {}} rng={() => 0} />)
  fireEvent.click(tooth(5))
  expect(tooth(5).disabled).toBe(true)
  expect(screen.getByText(`👉 ${pieceLabel(order[1])} 차례예요`)).toBeTruthy()
  fireEvent.click(tooth(5))
  expect(screen.getByText(`👉 ${pieceLabel(order[1])} 차례예요`)).toBeTruthy()
})

test('함정을 누르면 연출 후 onFinish가 올바른 말로 1회, haptic error 1회', () => {
  const onFinish = vi.fn()
  render(<CrocGame order={order} onFinish={onFinish} rng={() => 0} />)
  fireEvent.click(tooth(3))
  fireEvent.click(tooth(0))
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledWith('error')
  expect(screen.getByText(`${pieceLabel(order[1])} 콱!`)).toBeTruthy()
  advance(END_EFFECT_MS - 1)
  expect(onFinish).not.toHaveBeenCalled()
  advance(1)
  expect(onFinish).toHaveBeenCalledTimes(1)
  fireEvent.click(tooth(1)) // 끝난 뒤 입력 무시
  advance(5000)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledWith(order[1])
})

test('함정을 연타해도 한 번만 처리', () => {
  const onFinish = vi.fn()
  render(<CrocGame order={order} onFinish={onFinish} rng={() => 0} />)
  fireEvent.click(tooth(0))
  fireEvent.click(tooth(0))
  advance(5000)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledTimes(1)
})

test('연출 중 언마운트하면 onFinish 미호출', () => {
  const onFinish = vi.fn()
  const { unmount } = render(<CrocGame order={order} onFinish={onFinish} rng={() => 0} />)
  fireEvent.click(tooth(0))
  advance(300)
  unmount()
  advance(5000)
  expect(onFinish).not.toHaveBeenCalled()
})

test('이빨 격자는 minmax(0,1fr) 열이라 320px 폭에서도 넘치지 않고 높이는 44px 이상(css)', () => {
  const css = readFileSync(join(__dirname, '..', 'croc.css'), 'utf8')
  expect(css).toMatch(/grid-template-columns:\s*repeat\(6,\s*minmax\(0,\s*1fr\)\)/)
  const tooth = css.match(/\.cr-tooth\s*\{([^}]*)\}/)?.[1] ?? ''
  expect(tooth).not.toMatch(/min-width:\s*44px/)
  expect(Number(tooth.match(/min-height:\s*(\d+)px/)?.[1])).toBeGreaterThanOrEqual(44)
})
