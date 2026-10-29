import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { drawPieces, pieceLabel } from '../../../domain/pieces'
import { TwisterGame } from '../TwisterGame'
import { SENTENCES } from '../logic'
import { RECORD_END_MS } from '../../shared/timing'
import { haptic } from '../../../platform/sdk'

vi.mock('../../../platform/sdk', () => ({ haptic: vi.fn(async () => {}) }))

const order = drawPieces(3, () => 0.5)
const SENTENCE = SENTENCES[5] // rng 0.5
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

const advance = (ms: number) => {
  clock += ms
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}
const mount = (onFinish = vi.fn(), people = order) => {
  const r = render(<TwisterGame order={people} onFinish={onFinish} rng={() => 0.5} now={now} />)
  return { onFinish, ...r }
}
const click = (name: string | RegExp) => {
  clock += 500
  fireEvent.click(screen.getByRole('button', { name }))
}
/** 시작 → ms 후 다 읽었어요 → 판정 */
const play = (ms: number, verdict: '성공' | '틀렸어요') => {
  click('시작')
  clock += ms
  fireEvent.click(screen.getByRole('button', { name: '다 읽었어요' }))
  click(verdict)
}
const next = () => click(/^(다음 사람|결과 보기)$/)

test('규칙 띠·차례·문장이 처음부터 보인다', () => {
  mount()
  expect(screen.getByText('틀리면 가장 나쁨! 모두 맞히면 가장 느린 사람이 벌칙')).toBeTruthy()
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  expect(screen.getByText(SENTENCE)).toBeTruthy()
  expect(screen.getByRole('button', { name: '시작' })).toBeTruthy()
})

test('모두 같은 문장(다음 사람도 그대로)', () => {
  mount()
  play(3000, '성공')
  next()
  expect(screen.getByText(SENTENCE)).toBeTruthy()
})

test('시간은 시작 탭부터 다 읽었어요 탭까지(주입 now)', () => {
  mount()
  click('시작')
  clock += 4230
  fireEvent.click(screen.getByRole('button', { name: '다 읽었어요' }))
  expect(screen.getByText('맞았는지는 함께 있는 사람들이 판정해요')).toBeTruthy()
  click('성공')
  expect(screen.getByText('4.23초')).toBeTruthy()
})

test('틀렸어요를 누르면 기록은 틀림', () => {
  mount()
  play(2000, '틀렸어요')
  expect(screen.getByText('틀림')).toBeTruthy()
})

test('판정 연타: 다 읽었어요 직후의 더블탭은 판정으로 새지 않는다', () => {
  mount()
  click('시작')
  clock += 3000
  fireEvent.click(screen.getByRole('button', { name: '다 읽었어요' }))
  clock += 100
  fireEvent.click(screen.getByRole('button', { name: '틀렸어요' }))
  expect(screen.getByRole('button', { name: '성공' })).toBeTruthy() // 아직 판정 화면
  click('성공')
  expect(screen.getByText('3.00초')).toBeTruthy()
})

test('판정 후 다음 버튼 연타는 한 번만 처리', () => {
  mount()
  click('시작')
  clock += 2000
  fireEvent.click(screen.getByRole('button', { name: '다 읽었어요' }))
  click('성공')
  const btn = screen.getByRole('button', { name: '다음 사람' })
  clock += 500
  fireEvent.click(btn)
  clock += 50
  const again = screen.queryByRole('button', { name: /^(다음 사람|결과 보기)$/ })
  if (again) fireEvent.click(again)
  expect(screen.getByText(`👉 ${pieceLabel(order[1])} 차례예요`)).toBeTruthy()
  expect(screen.getByRole('button', { name: '시작' })).toBeTruthy()
})

test('백그라운드로 가면 그 시도는 무효 + 다시 해 주세요(같은 사람)', () => {
  mount()
  click('시작')
  clock += 1000
  setVisibility('hidden')
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
  setVisibility('visible')
  expect(screen.getByText('다시 해 주세요')).toBeTruthy()
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  expect(screen.getByRole('button', { name: '시작' })).toBeTruthy()
  // 다시 시작하면 새 시간으로 잰다
  click('시작')
  clock += 2500
  fireEvent.click(screen.getByRole('button', { name: '다 읽었어요' }))
  click('성공')
  expect(screen.getByText('2.50초')).toBeTruthy()
})

test('틀린 사람이 가장 나쁨: onFinish 1회, 연출 문구, 햅틱 error 1회', () => {
  const { onFinish } = mount()
  play(9000, '성공')
  next()
  play(2000, '틀렸어요')
  next()
  play(3000, '성공')
  next()
  expect(screen.getByText(`${pieceLabel(order[1])} 틀렸어요`)).toBeTruthy()
  expect(vi.mocked(haptic).mock.calls.filter((c) => c[0] === 'error')).toHaveLength(1)
  expect(onFinish).not.toHaveBeenCalled()
  advance(RECORD_END_MS)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledWith(order[1])
  advance(5000)
  expect(onFinish).toHaveBeenCalledTimes(1)
})

test('모두 맞히면 가장 느린 사람', () => {
  const { onFinish } = mount()
  play(4000, '성공')
  next()
  play(7500, '성공')
  next()
  play(3000, '성공')
  next()
  expect(screen.getByText(`${pieceLabel(order[1])} 7.50초로 가장 느렸어요`)).toBeTruthy()
  advance(RECORD_END_MS)
  expect(onFinish).toHaveBeenCalledWith(order[1])
})

test('틀린 사람이 둘이면 동점자 중 랜덤', () => {
  const { onFinish } = mount()
  play(4000, '틀렸어요')
  next()
  play(2000, '틀렸어요')
  next()
  play(3000, '성공')
  next()
  expect(screen.getByText(/\(동점자 중 랜덤\)/)).toBeTruthy()
  advance(RECORD_END_MS)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledWith(order[1]) // rng 0.5 → 동점자 둘 중 두 번째
})

test('언마운트하면 onFinish를 부르지 않고 타이머가 남지 않는다', () => {
  const { onFinish, unmount } = mount()
  play(4000, '성공')
  next()
  play(7500, '성공')
  next()
  play(3000, '성공')
  next()
  unmount()
  advance(10000)
  expect(onFinish).not.toHaveBeenCalled()
  expect(vi.getTimerCount()).toBe(0)
})
