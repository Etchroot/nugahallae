import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { drawPieces, pieceLabel } from '../../../domain/pieces'
import { UpdownGame } from '../UpdownGame'
import { haptic } from '../../../platform/sdk'

vi.mock('../../../platform/sdk', () => ({ haptic: vi.fn(async () => {}) }))

const order = drawPieces(3, () => 0.5)
// rng 0.59 → 비밀 숫자 60
const RNG = () => 0.59

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(haptic).mockClear()
})
afterEach(() => vi.useRealTimers())

const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })
const input = () => screen.getByRole('textbox') as HTMLInputElement
const submit = (v: string) => {
  fireEvent.change(input(), { target: { value: v } })
  fireEvent.click(screen.getByRole('button', { name: '확인' }))
}

test('규칙 띠, 차례, 범위, 입력 속성이 보인다', () => {
  render(<UpdownGame order={order} onFinish={() => {}} rng={RNG} />)
  expect(screen.getByText('폭탄 숫자를 부르면 벌칙! 범위 안에서 골라요')).toBeTruthy()
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  expect(screen.getByText('1 ~ 100')).toBeTruthy()
  expect(input().getAttribute('inputmode')).toBe('numeric')
  expect(input().getAttribute('pattern')).toBe('[0-9]*')
  expect(input().getAttribute('type')).toBe('text')
})

test('범위 밖·빈 값은 인라인 안내, 차례 안 넘어감', () => {
  render(<UpdownGame order={order} onFinish={() => {}} rng={RNG} />)
  submit('101')
  expect(screen.getByText('1~100 사이 숫자를 입력해요')).toBeTruthy()
  submit('')
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
})

test('UP/DOWN으로 범위가 좁혀지고 기록 칩이 남고 입력이 비워지고 포커스 유지', () => {
  render(<UpdownGame order={order} onFinish={() => {}} rng={RNG} />)
  input().focus()
  submit('30')
  expect(screen.getByText('UP')).toBeTruthy()
  expect(screen.getByText('31 ~ 100')).toBeTruthy()
  expect(screen.getByText(`${order[0].emoji} 30`)).toBeTruthy()
  expect(input().value).toBe('')
  expect(document.activeElement).toBe(input())
  expect(screen.getByText(`👉 ${pieceLabel(order[1])} 차례예요`)).toBeTruthy()
  submit('80')
  expect(screen.getByText('DOWN')).toBeTruthy()
  expect(screen.getByText('31 ~ 79')).toBeTruthy()
})

test('폭탄 숫자를 부르면 연출 후 onFinish 1회(그 말), haptic error 1회', () => {
  const onFinish = vi.fn()
  render(<UpdownGame order={order} onFinish={onFinish} rng={RNG} />)
  submit('30')
  submit('60')
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledWith('error')
  fireEvent.click(screen.getByRole('button', { name: '확인' })) // 끝난 뒤 무시
  advance(5000)
  expect(screen.getByText(`${pieceLabel(order[1])} 펑!`)).toBeTruthy()
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledWith(order[1])
})

test('확인 연타해도 한 번만 처리', () => {
  const onFinish = vi.fn()
  render(<UpdownGame order={order} onFinish={onFinish} rng={RNG} />)
  fireEvent.change(input(), { target: { value: '60' } })
  const b = screen.getByRole('button', { name: '확인' })
  fireEvent.click(b)
  fireEvent.click(b)
  advance(5000)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledTimes(1)
})

test('연출 중 언마운트 → onFinish 미호출', () => {
  const onFinish = vi.fn()
  const { unmount } = render(<UpdownGame order={order} onFinish={onFinish} rng={RNG} />)
  submit('60')
  unmount()
  advance(5000)
  expect(onFinish).not.toHaveBeenCalled()
})
