import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { drawPieces, pieceLabel } from '../../../domain/pieces'
import { NeverGame } from '../NeverGame'
import { SENTENCES, ZERO_SETTLE_MS } from '../logic'
import { END_EFFECT_MS } from '../../shared/timing'
import { TAP_GUARD_MS } from '../../../app/useTapGuard'
import { haptic } from '../../../platform/sdk'

vi.mock('../../../platform/sdk', () => ({ haptic: vi.fn(async () => {}) }))

const order = drawPieces(3, () => 0.5)
let t = 0
const now = () => t

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(haptic).mockClear()
  t = 10000
})
afterEach(() => vi.useRealTimers())

const advance = (ms: number) =>
  act(() => {
    t += ms
    vi.advanceTimersByTime(ms)
  })
const tile = (i: number) => screen.getByRole('button', { name: pieceLabel(order[i]) })
let pid = 0
const press = (i: number) => {
  const e = new Event('pointerdown', { bubbles: true, cancelable: true })
  Object.assign(e, { pointerId: ++pid, pointerType: 'touch' })
  fireEvent(tile(i), e)
}
const nextBtn = () => screen.getByRole('button', { name: '다음 문장' })
const nextRound = () => {
  advance(TAP_GUARD_MS)
  fireEvent.click(nextBtn())
}
const sentence = () => screen.getByTestId('never-sentence').textContent ?? ''
const setup = (onFinish = vi.fn(), rng = () => 0) => {
  render(<NeverGame order={order} onFinish={onFinish} rng={rng} now={now} />)
  return onFinish
}

test('규칙 띠, 라운드 표시, 처음엔 모두 손가락 5개', () => {
  setup()
  expect(screen.getByText('해 본 사람만 누르기! 손가락 5개를 먼저 접으면 벌칙')).toBeTruthy()
  expect(screen.getByText('라운드 1')).toBeTruthy()
  expect(screen.getAllByText('남은 손가락 5')).toHaveLength(3)
  expect(SENTENCES).toContain(sentence())
})

test('칸을 누르면 손가락이 하나 줄고, 같은 라운드에 두 번 눌러도 한 번만', () => {
  setup()
  press(1)
  press(1)
  expect(screen.getByText('남은 손가락 4')).toBeTruthy()
  expect(screen.getAllByText('남은 손가락 5')).toHaveLength(2)
  expect(screen.getByText('접었어요')).toBeTruthy()
  expect(tile(1).getAttribute('aria-disabled')).toBe('true')
  expect(haptic).not.toHaveBeenCalled()
})

test('여러 사람이 동시에 각자 칸을 눌러도 모두 처리된다', () => {
  setup()
  press(0)
  press(2)
  expect(screen.getAllByText('남은 손가락 4')).toHaveLength(2)
})

test('다음 문장: 라운드가 오르고 칸이 다시 활성, 문장은 목록 안에서 바뀐다, 400ms 가드', () => {
  setup()
  const s1 = sentence()
  press(0)
  advance(TAP_GUARD_MS)
  fireEvent.click(nextBtn())
  expect(screen.getByText('라운드 2')).toBeTruthy()
  expect(sentence()).not.toBe(s1)
  expect(SENTENCES).toContain(sentence())
  expect(tile(0).getAttribute('aria-disabled')).toBe('false')
  press(0)
  expect(screen.getByText('남은 손가락 3')).toBeTruthy()
  // 가드: 직후 더블탭은 무시
  fireEvent.click(nextBtn())
  expect(screen.getByText('라운드 2')).toBeTruthy()
  advance(TAP_GUARD_MS)
  fireEvent.click(nextBtn())
  expect(screen.getByText('라운드 3')).toBeTruthy()
})

test('손가락이 0이 되면 즉결: haptic error 1회, 오버레이, onFinish 1회, 이후 입력 무시', () => {
  const onFinish = setup()
  for (let r = 0; r < 4; r++) {
    press(1)
    nextRound()
  }
  expect(screen.getByText('남은 손가락 1')).toBeTruthy()
  expect(haptic).not.toHaveBeenCalled()
  press(1)
  advance(ZERO_SETTLE_MS)
  expect(screen.getByText(`${pieceLabel(order[1])} 손가락을 다 접었어요`)).toBeTruthy()
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledWith('error')
  advance(END_EFFECT_MS - 1)
  expect(onFinish).not.toHaveBeenCalled()
  advance(1)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledWith(order[1])
  press(0)
  nextRound()
  advance(10000)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(screen.getByText('라운드 5')).toBeTruthy()
})

test('같은 라운드에 여러 명이 0이 되면 rng로 한 명(오버레이에 동점 표시 없음)', () => {
  const onFinish = setup(vi.fn(), () => 0.99)
  for (let r = 0; r < 4; r++) {
    press(0)
    press(2)
    nextRound()
  }
  press(0)
  press(2)
  advance(ZERO_SETTLE_MS)
  expect(screen.getByText(`${pieceLabel(order[2])} 손가락을 다 접었어요`)).toBeTruthy()
  expect(screen.queryByText(/동점자/)).toBeNull()
  advance(END_EFFECT_MS)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledWith(order[2])
  expect(haptic).toHaveBeenCalledTimes(1)
})

test('문장 30개를 지나면 다시 섞어도 목록 밖 문구가 나오지 않는다', () => {
  setup()
  const seen = [sentence()]
  for (let i = 0; i < 31; i++) {
    nextRound()
    seen.push(sentence())
  }
  expect(new Set(seen.slice(0, 30)).size).toBe(30)
  expect(seen.every((s) => SENTENCES.includes(s))).toBe(true)
  expect(seen[30]).not.toBe(seen[29])
})

test('언마운트하면 타이머가 정리되어 onFinish가 불리지 않는다', () => {
  const onFinish = vi.fn()
  const { unmount } = render(<NeverGame order={order} onFinish={onFinish} rng={() => 0} now={now} />)
  for (let r = 0; r < 4; r++) {
    press(0)
    nextRound()
  }
  press(0)
  unmount()
  advance(10000)
  expect(onFinish).not.toHaveBeenCalled()
  expect(haptic).not.toHaveBeenCalled()
})
