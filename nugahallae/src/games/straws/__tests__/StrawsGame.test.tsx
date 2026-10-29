import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { drawPieces, pieceLabel } from '../../../domain/pieces'
import { StrawsGame } from '../StrawsGame'
import { END_EFFECT_MS } from '../../shared/timing'
import { haptic } from '../../../platform/sdk'

vi.mock('../../../platform/sdk', () => ({ haptic: vi.fn(async () => {}) }))

const order = drawPieces(3, () => 0.5)

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(haptic).mockClear()
})
afterEach(() => vi.useRealTimers())

const straw = (i: number) => screen.getByRole('button', { name: `막대 ${i + 1}` }) as HTMLButtonElement
const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })
const pick = (i: number) => {
  advance(400)
  fireEvent.click(straw(i))
}

test('규칙 띠, 차례 문구, 막대 수 = 인원수', () => {
  render(<StrawsGame order={order} onFinish={() => {}} rng={() => 0} />)
  expect(screen.getByText('짧은 막대는 딱 하나! 뽑으면 벌칙')).toBeTruthy()
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  expect(screen.getAllByRole('button', { name: /^막대 / })).toHaveLength(3)
})

test('뽑기 전에는 짧은 막대 위치가 DOM(텍스트·aria·data·속성)에 드러나지 않는다', () => {
  const a = render(<StrawsGame order={order} onFinish={() => {}} rng={() => 0} />)
  const htmlA = a.container.innerHTML
  a.unmount()
  const b = render(<StrawsGame order={order} onFinish={() => {}} rng={() => 0.99} />)
  expect(b.container.innerHTML).toBe(htmlA)
})

test('긴 막대를 뽑으면 통과가 뜨고 그 막대는 비활성, 다음 차례, tap 1회', () => {
  render(<StrawsGame order={order} onFinish={() => {}} rng={() => 0} />)
  pick(1)
  expect(straw(1).disabled).toBe(true)
  expect(screen.getByText('통과')).toBeTruthy()
  expect(screen.getByText(`👉 ${pieceLabel(order[1])} 차례예요`)).toBeTruthy()
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledWith('tap')
  advance(400)
  fireEvent.click(straw(1))
  expect(screen.getByText(`👉 ${pieceLabel(order[1])} 차례예요`)).toBeTruthy()
})

test('연타·동시 입력(400ms 안)은 한 번만 처리', () => {
  render(<StrawsGame order={order} onFinish={() => {}} rng={() => 0} />)
  pick(1)
  fireEvent.click(straw(2))
  expect(straw(2).disabled).toBe(false)
  expect(screen.getByText(`👉 ${pieceLabel(order[1])} 차례예요`)).toBeTruthy()
})

test('짧은 막대: 오버레이, error 1회, END_EFFECT_MS 뒤 onFinish 1회, 이후 입력 무시', () => {
  const onFinish = vi.fn()
  render(<StrawsGame order={order} onFinish={onFinish} rng={() => 0} />)
  pick(1)
  pick(0)
  expect(screen.getByText(`${pieceLabel(order[1])} 짧은 막대!`)).toBeTruthy()
  expect(haptic).toHaveBeenLastCalledWith('error')
  expect(haptic).toHaveBeenCalledTimes(2)
  advance(END_EFFECT_MS - 1)
  expect(onFinish).not.toHaveBeenCalled()
  advance(1)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledWith(order[1])
  advance(400)
  fireEvent.click(straw(2))
  advance(5000)
  expect(onFinish).toHaveBeenCalledTimes(1)
})

test('마지막 사람도 직접 뽑고 남은 막대는 짧은 막대', () => {
  const onFinish = vi.fn()
  render(<StrawsGame order={order} onFinish={onFinish} rng={() => 0} />)
  pick(1)
  pick(2)
  expect(onFinish).not.toHaveBeenCalled()
  expect(straw(0).disabled).toBe(false)
  pick(0)
  advance(END_EFFECT_MS)
  expect(onFinish).toHaveBeenCalledWith(order[2])
})

test('뽑힌 막대는 컵 안에 꽂힌 채(아랫단이 컵 윗선 70 아래) 올라오고, 긴 막대가 더 높다', () => {
  const { container } = render(<StrawsGame order={order} onFinish={() => {}} rng={() => 0} />)
  const rect = (i: number) => straw(i).querySelector('rect.st-straw') as SVGRectElement
  const bottom = (i: number) => Number(rect(i).getAttribute('y')) + Number(rect(i).getAttribute('height'))
  expect(bottom(1)).toBeGreaterThan(70)
  pick(1)
  pick(0)
  expect(bottom(1)).toBeGreaterThan(70)
  expect(bottom(0)).toBeGreaterThan(70)
  expect(Number(rect(1).getAttribute('y'))).toBeLessThan(Number(rect(0).getAttribute('y')))
  expect(container.querySelectorAll('.st-rise').length).toBe(2)
})

test('연출 중 언마운트하면 onFinish 미호출', () => {
  const onFinish = vi.fn()
  const { unmount } = render(<StrawsGame order={order} onFinish={onFinish} rng={() => 0} />)
  pick(0)
  advance(200)
  unmount()
  advance(5000)
  expect(onFinish).not.toHaveBeenCalled()
})

test('10명이어도 막대 10개, 2줄(열 5개) 배치와 터치 높이 44px 이상(css)', () => {
  const order10 = drawPieces(10, () => 0.5)
  const { container } = render(<StrawsGame order={order10} onFinish={() => {}} rng={() => 0} />)
  expect(screen.getAllByRole('button', { name: /^막대 / })).toHaveLength(10)
  expect((container.querySelector('.st-grid') as HTMLElement).style.getPropertyValue('--st-cols')).toBe('5')
  const css = readFileSync(join(__dirname, '..', 'straws.css'), 'utf8')
  const cell = css.match(/\.st-cell\s*\{([^}]*)\}/)?.[1] ?? ''
  expect(Number(cell.match(/min-height:\s*(\d+)px/)?.[1])).toBeGreaterThanOrEqual(44)
  expect(css).toMatch(/minmax\(0,\s*1fr\)/)
})
