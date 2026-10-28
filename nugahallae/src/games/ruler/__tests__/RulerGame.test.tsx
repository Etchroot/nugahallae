import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { drawPieces, pieceLabel } from '../../../domain/pieces'
import { RulerGame } from '../RulerGame'
import { CM_PX } from '../logic'
import { RECORD_END_MS } from '../../shared/timing'
import { haptic } from '../../../platform/sdk'

vi.mock('../../../platform/sdk', () => ({ haptic: vi.fn(async () => {}) }))

const order = drawPieces(3, () => 0.5)
// rng=0.5 → 목표 6cm (13개 후보 중 7번째)
const TARGET = 6
let clock = 0
const now = () => clock

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(haptic).mockClear()
  clock = 0
})
afterEach(() => {
  vi.useRealTimers()
  setVisibility('visible')
})

function setVisibility(v: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => v })
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => v === 'hidden' })
}

const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })
const mount = (onFinish = vi.fn(), people = order) => {
  const r = render(<RulerGame order={people} onFinish={onFinish} rng={() => 0.5} now={now} />)
  return { onFinish, ...r }
}
const area = () => screen.getByTestId('ruler-area')
/** (x0,y0)에서 눌러 (x1,y1)까지 끌고 떼기 */
const drag = (x0: number, y0: number, x1: number, y1: number, up = true) => {
  fireEvent.pointerDown(area(), { clientX: x0, clientY: y0, pointerId: 1 })
  fireEvent.pointerMove(area(), { clientX: (x0 + x1) / 2, clientY: (y0 + y1) / 2, pointerId: 1 })
  fireEvent.pointerMove(area(), { clientX: x1, clientY: y1, pointerId: 1 })
  if (up) fireEvent.pointerUp(area(), { clientX: x1, clientY: y1, pointerId: 1 })
}
const drawCm = (cm: number) => drag(20, 100, 20 + cm * CM_PX, 100)
const next = () => {
  clock += 500
  fireEvent.click(screen.getByRole('button', { name: /^(다음 사람|결과 보기)$/ }))
}
const playAll = (cms: number[]) => {
  cms.forEach((cm) => {
    drawCm(cm)
    next()
  })
}

test('규칙 띠·차례·목표 안내가 보인다', () => {
  mount()
  expect(screen.getByText('자 없이 감으로! 가장 많이 틀리면 벌칙')).toBeTruthy()
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  expect(screen.getByText(`${TARGET}cm를 그어 보세요`)).toBeTruthy()
})

test('그리는 동안 길이 숫자는 보이지 않고, 그은 뒤에는 기록했어요만 보인다', () => {
  mount()
  drag(20, 100, 20 + 4.2 * CM_PX, 100, false)
  expect(document.body.textContent).not.toMatch(/4\.2/)
  expect(document.body.textContent).not.toMatch(/±/)
  fireEvent.pointerUp(area(), { clientX: 20 + 4.2 * CM_PX, clientY: 100, pointerId: 1 })
  expect(screen.getByText('기록했어요')).toBeTruthy()
  expect(document.body.textContent).not.toMatch(/4\.2/)
  expect(document.body.textContent).not.toMatch(/±/)
})

test('세로 이동은 무시하고 가로 거리만 길이가 된다', () => {
  const { onFinish } = mount(vi.fn(), order.slice(0, 2))
  drag(20, 50, 20 + TARGET * CM_PX, 400) // 세로로 크게 움직여도 가로 6cm
  next()
  drawCm(TARGET + 1) // 오차 1.0
  next()
  expect(screen.getByText('6.0cm (±0.0cm)')).toBeTruthy()
  expect(screen.getByText('7.0cm (±1.0cm)')).toBeTruthy()
  advance(RECORD_END_MS)
  expect(onFinish).toHaveBeenCalledWith(order[1])
})

test('0.5cm 미만은 무시하고 다시 그리게 안내, 같은 사람이 다시', () => {
  mount()
  drag(20, 100, 20 + 0.3 * CM_PX, 100)
  expect(screen.getByText('조금 더 길게 그어 주세요')).toBeTruthy()
  expect(screen.queryByText('기록했어요')).toBeNull()
  expect(screen.queryByRole('button', { name: /다음 사람|결과 보기/ })).toBeNull()
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  drawCm(5)
  expect(screen.getByText('기록했어요')).toBeTruthy()
})

test('진행 중 기록 목록에는 기록 완료만, 오차·정답은 마지막까지 비공개', () => {
  mount()
  drawCm(5)
  next()
  expect(screen.getByText(`${pieceLabel(order[0])} 기록 완료`)).toBeTruthy()
  expect(document.body.textContent).not.toMatch(/±/)
  expect(document.body.textContent).not.toMatch(/5\.0/)
})

test('끝까지: 순위 공개(오차·막대), 가장 틀린 말이 벌칙, onFinish 1회, haptic error 1회', () => {
  const { onFinish } = mount()
  playAll([5.5, 8, 6.2]) // 오차 0.5, 2.0, 0.2
  expect(screen.getByText('5.5cm (±0.5cm)')).toBeTruthy()
  expect(screen.getByText('8.0cm (±2.0cm)')).toBeTruthy()
  expect(screen.getByText('6.2cm (±0.2cm)')).toBeTruthy()
  expect(screen.getByRole('status').textContent).toBe(`${pieceLabel(order[1])} 2.0cm 차이 났어요`)
  expect(screen.getByTestId('ruler-result')).toBeTruthy()
  expect(screen.getAllByTestId('ruler-bar')).toHaveLength(3)
  expect(screen.getByTestId('ruler-target-bar')).toBeTruthy()
  expect(vi.mocked(haptic).mock.calls.filter((c) => c[0] === 'error')).toHaveLength(1)
  expect(onFinish).not.toHaveBeenCalled()
  advance(RECORD_END_MS - 1)
  expect(onFinish).not.toHaveBeenCalled()
  advance(1)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledWith(order[1])
  advance(5000)
  expect(onFinish).toHaveBeenCalledTimes(1)
})

test('다음 사람 연타는 한 번만 넘어간다', () => {
  mount()
  drawCm(5)
  clock += 500
  const btn = screen.getByRole('button', { name: /다음 사람/ })
  fireEvent.click(btn)
  clock += 10
  fireEvent.click(btn)
  expect(screen.getByText(`👉 ${pieceLabel(order[1])} 차례예요`)).toBeTruthy()
})

test('백그라운드로 가면 그리던 시도는 무효, 다시 해 주세요', () => {
  mount()
  drag(20, 100, 20 + 5 * CM_PX, 100, false)
  act(() => {
    setVisibility('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
  })
  setVisibility('visible')
  fireEvent.pointerUp(area(), { clientX: 20 + 5 * CM_PX, clientY: 100, pointerId: 1 })
  expect(screen.getByText('다시 해 주세요')).toBeTruthy()
  expect(screen.queryByText('기록했어요')).toBeNull()
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  drawCm(5)
  expect(screen.getByText('기록했어요')).toBeTruthy()
})

test('결과 연출 중 언마운트하면 onFinish가 호출되지 않는다', () => {
  const { onFinish, unmount } = mount()
  playAll([5, 6, 7])
  unmount()
  advance(RECORD_END_MS * 2)
  expect(onFinish).not.toHaveBeenCalled()
})

test('동점이면 rng로 고르고 문구에 (동점자 중 랜덤)', () => {
  mount()
  playAll([5, 7, 6]) // 오차 1, 1, 0
  expect(screen.getByRole('status').textContent).toMatch(/ 1\.0cm 차이 났어요 \(동점자 중 랜덤\)$/)
})
