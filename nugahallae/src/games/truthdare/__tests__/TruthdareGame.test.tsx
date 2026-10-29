import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { drawPieces, pieceLabel } from '../../../domain/pieces'
import { TruthdareGame } from '../TruthdareGame'
import { TRUTHS, DARES } from '../logic'
import { END_EFFECT_MS } from '../../shared/timing'
import { haptic } from '../../../platform/sdk'

vi.mock('../../../platform/sdk', () => ({ haptic: vi.fn(async () => {}) }))

const order = drawPieces(4, () => 0.5)
let t = 0
const now = () => t
const seq = (...v: number[]) => {
  let i = 0
  return () => v[Math.min(i++, v.length - 1)]
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(haptic).mockClear()
  t = 10_000
})
afterEach(() => vi.useRealTimers())

const adv = (ms: number) =>
  act(() => {
    t += ms
    vi.advanceTimersByTime(ms)
  })
const click = (name: string) => {
  adv(500)
  fireEvent.click(screen.getByRole('button', { name }))
}
const mount = (rng: () => number, onFinish = vi.fn()) => {
  const r = render(<TruthdareGame order={order} onFinish={onFinish} rng={rng} now={now} />)
  return { onFinish, ...r }
}
// 선택=order[2](0.5), 진실 카드 0번(0), 바꾸기 카드 1번(0)
const R = () => seq(0.5, 0, 0, 0.5, 0.5)

test('규칙 띠와 시작 화면', () => {
  mount(R())
  expect(screen.getByText('걸린 사람은 진실 질문이나 미션 수행')).toBeTruthy()
  expect(screen.getByRole('button', { name: '시작하기' })).toBeTruthy()
})

test('하이라이트는 0.8초 돌다 멈추고 결정된 사람의 차례가 된다, haptic tap 1회', () => {
  mount(R())
  click('시작하기')
  expect(document.querySelectorAll('.td-hl')).toHaveLength(1)
  adv(799)
  expect(screen.queryByText(/차례예요/)).toBeNull()
  adv(1)
  expect(screen.getByText(`👉 ${pieceLabel(order[2])} 차례예요`)).toBeTruthy()
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledWith('tap')
  expect(screen.getByRole('button', { name: '진실' })).toBeTruthy()
  expect(screen.getByRole('button', { name: '미션' })).toBeTruthy()
})

test('선택 범위: rng 0이면 첫 번째, 1에 가까우면 마지막 사람', () => {
  const a = mount(seq(0, 0))
  click('시작하기')
  adv(800)
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  a.unmount()
  mount(seq(0.9999, 0))
  click('시작하기')
  adv(800)
  expect(screen.getByText(`👉 ${pieceLabel(order[3])} 차례예요`)).toBeTruthy()
})

test('진실을 고르면 진실 목록의 카드만, 미션이면 미션 목록의 카드만', () => {
  mount(seq(0.5, 0.9999))
  click('시작하기')
  adv(800)
  click('진실')
  expect(screen.getByText(TRUTHS[14])).toBeTruthy()
  expect(screen.queryByText(DARES[14])).toBeNull()
})

test('미션 카드', () => {
  mount(seq(0.5, 0.9999))
  click('시작하기')
  adv(800)
  click('미션')
  expect(screen.getByText(DARES[14])).toBeTruthy()
})

test('카드 바꾸기는 한 번만, 다른 카드가 나오고 이전 카드는 다시 안 나온다', () => {
  mount(seq(0.5, 0, 0, 0))
  click('시작하기')
  adv(800)
  click('진실')
  expect(screen.getByText(TRUTHS[0])).toBeTruthy()
  click('카드 바꾸기')
  expect(screen.queryByText(TRUTHS[0])).toBeNull()
  expect(screen.getByText(TRUTHS[1])).toBeTruthy()
  const b = screen.getByRole('button', { name: '카드 바꾸기' }) as HTMLButtonElement
  expect(b.disabled).toBe(true)
  adv(500)
  fireEvent.click(b)
  expect(screen.getByText(TRUTHS[1])).toBeTruthy()
})

test('완료했어요 → 오버레이 → 500ms 뒤 선택된 말로 onFinish 1회', () => {
  const { onFinish } = mount(R())
  click('시작하기')
  adv(800)
  click('진실')
  click('완료했어요')
  expect(screen.getByText(`${pieceLabel(order[2])} 걸렸다!`)).toBeTruthy()
  adv(END_EFFECT_MS - 1)
  expect(onFinish).not.toHaveBeenCalled()
  adv(1)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledWith(order[2])
  adv(5000)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledTimes(1)
})

test('연타 가드: 진실 버튼 더블탭이 카드 바꾸기까지 이어지지 않는다', () => {
  mount(seq(0.5, 0, 0, 0))
  click('시작하기')
  adv(800)
  adv(500)
  fireEvent.click(screen.getByRole('button', { name: '진실' }))
  expect(screen.getByText(TRUTHS[0])).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '카드 바꾸기' }))
  expect(screen.getByText(TRUTHS[0])).toBeTruthy()
})

test('시작하기 연타는 한 번만 처리', () => {
  mount(seq(0.5, 0, 0))
  adv(500)
  const b = screen.getByRole('button', { name: '시작하기' })
  fireEvent.click(b)
  fireEvent.click(b)
  adv(800)
  expect(screen.getAllByText(/차례예요/)).toHaveLength(1)
  expect(haptic).toHaveBeenCalledTimes(1)
})

test('언마운트하면 하이라이트·오버레이 타이머가 정리되고 onFinish 미호출', () => {
  const { onFinish, unmount } = mount(R())
  click('시작하기')
  unmount()
  adv(5000)
  expect(onFinish).not.toHaveBeenCalled()
  expect(vi.getTimerCount()).toBe(0)
  const m2 = mount(R(), onFinish)
  click('시작하기')
  adv(800)
  click('진실')
  click('완료했어요')
  m2.unmount()
  adv(5000)
  expect(onFinish).not.toHaveBeenCalled()
})
