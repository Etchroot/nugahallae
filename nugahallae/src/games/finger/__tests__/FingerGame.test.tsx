import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { drawPieces, pieceLabel } from '../../../domain/pieces'
import { FingerGame } from '../FingerGame'
import { ARM_MS, SPIN_MS } from '../logic'
import { END_EFFECT_MS } from '../../shared/timing'
import { haptic } from '../../../platform/sdk'

vi.mock('../../../platform/sdk', () => ({ haptic: vi.fn(async () => {}) }))

const order = drawPieces(3, () => 0.5)

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(haptic).mockClear()
})
afterEach(() => vi.useRealTimers())

const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })
const area = () => screen.getByTestId('finger-area')

// jsdom에는 PointerEvent가 없어 pointerId를 직접 실은 이벤트를 쓴다.
function ev(type: string, pointerId: number, x = 100, y = 200): Event {
  const e = new Event(type, { bubbles: true, cancelable: true })
  Object.assign(e, { pointerId, clientX: x, clientY: y, pointerType: 'touch' })
  return e
}
const down = (id: number) => fireEvent(area(), ev('pointerdown', id, 100 + id * 10, 200))
const up = (id: number) => fireEvent(area(), ev('pointerup', id))
const cancel = (id: number) => fireEvent(area(), ev('pointercancel', id))

test('규칙 띠와 대기 안내', () => {
  render(<FingerGame order={order} onFinish={() => {}} rng={() => 0} />)
  expect(screen.getByText('모두 손가락을 올려요! 찍힌 사람이 벌칙')).toBeTruthy()
  expect(screen.getByText('3명 모두 화면에 손가락을 올려요')).toBeTruthy()
})

test('손가락이 올라갈 때마다 터치 순서대로 말 고리가 생기고 진행 안내가 바뀐다', () => {
  render(<FingerGame order={order} onFinish={() => {}} rng={() => 0} />)
  down(1)
  expect(screen.getByText('1/3명')).toBeTruthy()
  down(2)
  expect(screen.getByText('2/3명')).toBeTruthy()
  const rings = screen.getAllByTestId('finger-ring')
  expect(rings).toHaveLength(2)
  expect(rings[0].textContent).toContain(order[0].emoji)
  expect(rings[1].textContent).toContain(order[1].emoji)
  expect(haptic).not.toHaveBeenCalled()
})

test('3명 올림 → 1초+2초 뒤 찍혔다! + haptic error 1회 → END_EFFECT_MS 뒤 onFinish 1회', () => {
  const onFinish = vi.fn()
  render(<FingerGame order={order} onFinish={onFinish} rng={() => 0.5} />)
  down(1); down(2); down(3)
  expect(screen.getByText('손가락을 떼면 다시 시작해요')).toBeTruthy()
  advance(ARM_MS + SPIN_MS - 1)
  expect(screen.queryByText(/찍혔다!/)).toBeNull()
  expect(haptic).not.toHaveBeenCalled()
  advance(1)
  expect(screen.getByText(`${pieceLabel(order[1])} 찍혔다!`)).toBeTruthy()
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledWith('error')
  advance(END_EFFECT_MS - 1)
  expect(onFinish).not.toHaveBeenCalled()
  advance(1)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledWith(order[1])
  up(1); down(7)
  advance(10000)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledTimes(1)
})

test('하이라이트 중 손가락을 떼면 리셋되고, 다시 올리면 처음부터', () => {
  const onFinish = vi.fn()
  render(<FingerGame order={order} onFinish={onFinish} rng={() => 0} />)
  down(1); down(2); down(3)
  advance(ARM_MS + 500)
  up(2)
  expect(screen.getByText('2/3명')).toBeTruthy()
  expect(screen.getAllByTestId('finger-ring')).toHaveLength(2)
  advance(10000)
  expect(screen.queryByText(/찍혔다!/)).toBeNull()
  expect(onFinish).not.toHaveBeenCalled()
  down(4)
  advance(ARM_MS + SPIN_MS - 1)
  expect(screen.queryByText(/찍혔다!/)).toBeNull()
  advance(1)
  expect(screen.getByText(`${pieceLabel(order[0])} 찍혔다!`)).toBeTruthy()
  expect(haptic).toHaveBeenCalledTimes(1)
})

test('손가락 하나를 떼도 남은 손가락의 말은 바뀌지 않고, 새 손가락은 빈 번호를 받는다', () => {
  render(<FingerGame order={order} onFinish={() => {}} rng={() => 0} />)
  down(1); down(2); down(3)
  up(2)
  let rings = screen.getAllByTestId('finger-ring')
  expect(rings.map((r) => r.textContent)).toEqual([order[0].emoji, order[2].emoji])
  down(4)
  rings = screen.getAllByTestId('finger-ring')
  expect(rings.map((r) => r.textContent)).toEqual([order[0].emoji, order[2].emoji, order[1].emoji])
})

test('armed 중 인원 초과 손가락이 닿아도 타이머는 하나만(찍힘 1회)', () => {
  const onFinish = vi.fn()
  render(<FingerGame order={order} onFinish={onFinish} rng={() => 0} />)
  down(1); down(2); down(3)
  advance(500)
  down(4)
  advance(ARM_MS + SPIN_MS)
  expect(haptic).toHaveBeenCalledTimes(1)
  advance(END_EFFECT_MS + 10000)
  expect(onFinish).toHaveBeenCalledTimes(1)
})

test('lostpointercapture도 뗀 것으로 처리', () => {
  render(<FingerGame order={order} onFinish={() => {}} rng={() => 0} />)
  down(1); down(2); down(3)
  fireEvent(area(), ev('lostpointercapture', 3))
  expect(screen.getByText('2/3명')).toBeTruthy()
})

test('css: 규칙 띠는 포인터를 받지 않고 힌트는 고정 높이', () => {
  const css = readFileSync(join(__dirname, '..', 'finger.css'), 'utf8')
  expect(css.match(/\.fg-bar\s*\{([^}]*)\}/)?.[1]).toMatch(/pointer-events:\s*none/)
  expect(css.match(/\.fg-hint\s*\{([^}]*)\}/)?.[1]).toMatch(/min-height:\s*\d+px/)
})

test('pointercancel도 뗀 것으로 처리', () => {
  render(<FingerGame order={order} onFinish={() => {}} rng={() => 0} />)
  down(1); down(2); down(3)
  cancel(3)
  expect(screen.getByText('2/3명')).toBeTruthy()
})

test('인원보다 많이 올리면 추가 손가락은 고리 없이 안내만', () => {
  render(<FingerGame order={order} onFinish={() => {}} rng={() => 0} />)
  down(1); down(2); down(3); down(4)
  expect(screen.getAllByTestId('finger-ring')).toHaveLength(3)
  expect(screen.getByText('3명만 올려 주세요')).toBeTruthy()
  up(4)
  expect(screen.queryByText('3명만 올려 주세요')).toBeNull()
  advance(ARM_MS + SPIN_MS)
  expect(screen.getByText(/찍혔다!/)).toBeTruthy()
})

test('진행 중 언마운트하면 onFinish·haptic 없음', () => {
  const onFinish = vi.fn()
  const { unmount } = render(<FingerGame order={order} onFinish={onFinish} rng={() => 0} />)
  down(1); down(2); down(3)
  advance(ARM_MS + 500)
  unmount()
  advance(10000)
  expect(onFinish).not.toHaveBeenCalled()
  expect(haptic).not.toHaveBeenCalled()
})

test('연출 중 언마운트해도 onFinish 없음', () => {
  const onFinish = vi.fn()
  const { unmount } = render(<FingerGame order={order} onFinish={onFinish} rng={() => 0} />)
  down(1); down(2); down(3)
  advance(ARM_MS + SPIN_MS)
  unmount()
  advance(10000)
  expect(onFinish).not.toHaveBeenCalled()
})

test('css: touch-action none, 고리 지름 88px 이상, keep-all', () => {
  const css = readFileSync(join(__dirname, '..', 'finger.css'), 'utf8')
  expect(css).toMatch(/touch-action:\s*none/)
  expect(css).toMatch(/-webkit-touch-callout:\s*none/)
  expect(css).toMatch(/word-break:\s*keep-all/)
  const ring = css.match(/\.fg-ring\s*\{([^}]*)\}/)?.[1] ?? ''
  expect(Number(ring.match(/width:\s*(\d+)px/)?.[1])).toBeGreaterThanOrEqual(88)
  expect(Number(ring.match(/height:\s*(\d+)px/)?.[1])).toBeGreaterThanOrEqual(88)
})
