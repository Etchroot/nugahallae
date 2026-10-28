import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { drawPieces, pieceLabel } from '../../../domain/pieces'
import { LadderGame } from '../LadderGame'
import { TRACE_MS, createLadder, traceLadder } from '../logic'
import { END_EFFECT_MS } from '../../shared/timing'
import { haptic } from '../../../platform/sdk'

vi.mock('../../../platform/sdk', () => ({ haptic: vi.fn(async () => {}) }))

const order = drawPieces(4, () => 0.5)
const rule = '벌칙 칸은 딱 하나! 차례대로 내 말을 눌러 내려가요'

function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}
const rngA = () => seeded(11)

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'],
  })
  vi.mocked(haptic).mockClear()
})
afterEach(() => vi.useRealTimers())

const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })
const pieceBtn = (i: number) => screen.getByRole('button', { name: pieceLabel(order[i]) }) as HTMLButtonElement

test('규칙 띠와 차례가 보이고 차례 아닌 말은 disabled', () => {
  render(<LadderGame order={order} onFinish={() => {}} rng={rngA()} />)
  expect(screen.getByText(rule)).toBeTruthy()
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  expect(pieceBtn(0).disabled).toBe(false)
  for (let i = 1; i < order.length; i++) expect(pieceBtn(i).disabled).toBe(true)
  expect(screen.getAllByText('?').length).toBe(order.length)
})

test('탭하면 TRACE_MS 후에 칸이 열린다, 그 전에는 가려져 있다', () => {
  render(<LadderGame order={order} onFinish={() => {}} rng={rngA()} />)
  fireEvent.click(pieceBtn(0))
  advance(TRACE_MS - 1)
  expect(screen.getAllByText('?').length).toBe(order.length)
  expect(screen.queryByText('통과') ?? screen.queryByText('벌칙')).toBeNull()
  advance(1)
  expect(screen.getAllByText('?').length).toBe(order.length - 1)
})

test('내려가는 중에는 어떤 말도 누를 수 없고 연타도 무시', () => {
  render(<LadderGame order={order} onFinish={() => {}} rng={rngA()} />)
  fireEvent.click(pieceBtn(0))
  for (let i = 0; i < order.length; i++) expect(pieceBtn(i).disabled).toBe(true)
  fireEvent.click(pieceBtn(0))
  fireEvent.click(pieceBtn(1))
  advance(TRACE_MS)
  expect(vi.mocked(haptic).mock.calls.length).toBe(1)
  expect(screen.getAllByText('?').length).toBe(order.length - 1)
})

test('끝까지 진행하면 벌칙 도착 말로 onFinish 1회, 햅틱 정확히', () => {
  const l = createLadder(order.length, rngA())
  const loserIdx = order.findIndex((_, i) => traceLadder(l, i).end === l.bad)
  expect(loserIdx).toBeGreaterThan(0) // 통과 햅틱 검증이 의미 있으려면 앞사람이 있어야 한다
  const onFinish = vi.fn()
  render(<LadderGame order={order} onFinish={onFinish} rng={rngA()} />)
  for (let i = 0; i <= loserIdx; i++) {
    fireEvent.click(pieceBtn(i))
    advance(TRACE_MS)
    if (i < loserIdx) advance(500) // 탭 가드(400ms) 지나기
  }
  expect(screen.getByText(`${pieceLabel(order[loserIdx])} 벌칙!`)).toBeTruthy()
  expect(onFinish).not.toHaveBeenCalled()
  advance(END_EFFECT_MS - 1)
  expect(onFinish).not.toHaveBeenCalled()
  advance(1)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledWith(order[loserIdx])
  advance(5000)
  expect(onFinish).toHaveBeenCalledTimes(1)
  const calls = vi.mocked(haptic).mock.calls.map((c) => c[0])
  expect(calls.filter((c) => c === 'error').length).toBe(1)
  expect(calls.filter((c) => c === 'tap').length).toBe(loserIdx)
  expect(screen.getAllByText('벌칙').length).toBe(1)
})

test('진행 중 언마운트하면 onFinish가 호출되지 않는다', () => {
  const l = createLadder(order.length, rngA())
  const loserIdx = order.findIndex((_, i) => traceLadder(l, i).end === l.bad)
  const onFinish = vi.fn()
  const { unmount } = render(<LadderGame order={order} onFinish={onFinish} rng={rngA()} />)
  for (let i = 0; i < loserIdx; i++) {
    fireEvent.click(pieceBtn(i))
    advance(TRACE_MS + 500)
  }
  fireEvent.click(pieceBtn(loserIdx))
  advance(TRACE_MS)
  unmount()
  advance(10000)
  expect(onFinish).not.toHaveBeenCalled()
})

test('내려가는 도중(TRACE_MS/2)에 언마운트하면 onFinish도 칸 공개도 없다', () => {
  const onFinish = vi.fn()
  const { unmount } = render(<LadderGame order={order} onFinish={onFinish} rng={rngA()} />)
  fireEvent.click(pieceBtn(0))
  advance(TRACE_MS / 2)
  unmount()
  advance(10000)
  expect(onFinish).not.toHaveBeenCalled()
  expect(vi.mocked(haptic)).not.toHaveBeenCalled()
})

test('2명, 10명 모두 렌더된다', () => {
  for (const n of [2, 10]) {
    const o = drawPieces(n, () => 0.5)
    const { unmount } = render(<LadderGame order={o} onFinish={() => {}} rng={rngA()} />)
    expect(screen.getAllByText('?').length).toBe(n)
    unmount()
  }
})
