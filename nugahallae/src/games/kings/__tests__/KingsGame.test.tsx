import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { drawPieces, pieceLabel } from '../../../domain/pieces'
import { KingsGame } from '../KingsGame'
import { EFFECTS, initKings } from '../logic'
import { END_EFFECT_MS } from '../../shared/timing'
import { haptic } from '../../../platform/sdk'

vi.mock('../../../platform/sdk', () => ({ haptic: vi.fn(async () => {}) }))

const order = drawPieces(3, () => 0.5)
const layout = initKings(3, () => 0)
const kingAt = layout.cards.map((c, i) => (c < 0 ? i : -1)).filter((i) => i >= 0)
const effectAt = (kind: string) => layout.cards.findIndex((c) => c >= 0 && EFFECTS[c].kind === kind)
const textAt = (text: string) => layout.cards.findIndex((c) => c >= 0 && EFFECTS[c].text === text)

let clock = 0
const now = () => clock
const advance = (ms: number) =>
  act(() => {
    clock += ms
    vi.advanceTimersByTime(ms)
  })

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(haptic).mockClear()
  clock = 10000
})
afterEach(() => vi.useRealTimers())

const mount = (rng = () => 0, onFinish: (p: unknown) => void = () => {}) =>
  render(<KingsGame order={order} onFinish={onFinish} rng={rng} now={now} />)
const card = (i: number) => screen.getAllByRole('button', { name: new RegExp(`^카드 ${i + 1}번`) })[0]
const confirm = () => {
  advance(400)
  fireEvent.click(screen.getByRole('button', { name: '확인했어요' }))
}

test('규칙 띠, 차례 문구, 16장, 왕 카운터', () => {
  mount()
  expect(screen.getByText('왕 카드는 4장! 네 번째 왕을 뽑으면 벌칙')).toBeTruthy()
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  expect(screen.getAllByRole('button', { name: /^카드 \d+번$/ }).length).toBe(16)
  expect(screen.getByText('왕 0/4')).toBeTruthy()
})

test('뽑기 전에는 카드 내용이 DOM에 없고 배치가 달라도 DOM이 같다', () => {
  const a = mount(() => 0)
  const htmlA = a.container.innerHTML
  a.unmount()
  const b = mount(() => 0.99)
  expect(b.container.innerHTML).toBe(htmlA)
  expect(htmlA).not.toContain('👑')
  for (const e of EFFECTS) expect(htmlA).not.toContain(e.text)
  expect(htmlA).not.toContain('왕이에요')
})

test('효과 카드: 문구와 확인했어요, 햅틱은 뽑을 때 없고 차례 넘길 때 tap 1회', () => {
  mount()
  const i = textAt('좋아하는 음식 하나 말하기')
  fireEvent.click(card(i))
  expect(screen.getByText('좋아하는 음식 하나 말하기')).toBeTruthy()
  expect(haptic).not.toHaveBeenCalled()
  confirm()
  expect(screen.getByText(`👉 ${pieceLabel(order[1])} 차례예요`)).toBeTruthy()
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledWith('tap')
  expect(screen.queryByText('좋아하는 음식 하나 말하기')).toBeNull()
})

test('뽑은 카드는 다시 못 누르고 확인 전에는 다른 카드도 못 뽑는다', () => {
  mount()
  const i = textAt('모두 박수 세 번')
  fireEvent.click(card(i))
  const other = textAt('가장 좋아하는 계절 말하기')
  fireEvent.click(card(other))
  expect(screen.queryByText('가장 좋아하는 계절 말하기')).toBeNull()
  confirm()
  vi.mocked(haptic).mockClear()
  fireEvent.click(card(i))
  expect(screen.queryByText('모두 박수 세 번')).toBeNull()
  expect(screen.queryByRole('button', { name: '확인했어요' })).toBeNull()
})

test('한 번 더 뽑기: 같은 사람, tap 햅틱 없음', () => {
  mount()
  fireEvent.click(card(effectAt('again')))
  expect(screen.getByText('한 번 더 뽑기')).toBeTruthy()
  confirm()
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  expect(haptic).not.toHaveBeenCalled()
})

test('다음 사람 건너뛰기: 두 명 뒤로', () => {
  mount()
  fireEvent.click(card(effectAt('skip')))
  confirm()
  expect(screen.getByText(`👉 ${pieceLabel(order[2])} 차례예요`)).toBeTruthy()
})

test('왕 1~3번째는 왕이에요 + 카운트, 네 번째 왕은 즉결', () => {
  const onFinish = vi.fn()
  mount(() => 0, onFinish)
  for (let k = 0; k < 3; k++) {
    fireEvent.click(card(kingAt[k]))
    expect(screen.getByText('왕이에요')).toBeTruthy()
    expect(screen.getByText(`왕 ${k + 1}/4`)).toBeTruthy()
    confirm()
  }
  expect(haptic).toHaveBeenCalledTimes(3) // 차례 넘김 tap 3회
  vi.mocked(haptic).mockClear()
  // 네 번째 왕은 4번째 차례: idx 3 % 3 = 0
  fireEvent.click(card(kingAt[3]))
  expect(screen.getByText(`${pieceLabel(order[0])} 마지막 왕을 뽑았어요`)).toBeTruthy()
  expect(screen.getByText('왕 4/4')).toBeTruthy()
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledWith('error')
  advance(END_EFFECT_MS - 1)
  expect(onFinish).not.toHaveBeenCalled()
  advance(1)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledWith(order[0])
  fireEvent.click(card(textAt('모두 박수 세 번'))) // 끝난 뒤 입력 무시
  advance(5000)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledTimes(1)
})

test('확인했어요 더블탭(400ms 안)은 다음 단계를 건너뛰지 않는다', () => {
  mount()
  fireEvent.click(card(textAt('모두 박수 세 번')))
  fireEvent.click(screen.getByRole('button', { name: '확인했어요' })) // 뽑은 직후 탭
  expect(screen.getByRole('button', { name: '확인했어요' })).toBeTruthy()
  advance(400)
  fireEvent.click(screen.getByRole('button', { name: '확인했어요' }))
  fireEvent.click(card(textAt('가장 좋아하는 계절 말하기')))
  fireEvent.click(screen.queryByRole('button', { name: '확인했어요' }) ?? document.body)
  expect(screen.getByRole('button', { name: '확인했어요' })).toBeTruthy() // 직후 탭은 막힘
})

test('왕을 뽑은 카드는 접근성 이름에 뽑은 결과만 알린다', () => {
  mount()
  fireEvent.click(card(kingAt[0]))
  expect(screen.getByRole('button', { name: `카드 ${kingAt[0] + 1}번 왕` })).toBeTruthy()
})

test('결정 전 언마운트 / 결정 후 언마운트 → onFinish 없음', () => {
  const onFinish = vi.fn()
  const { unmount } = mount(() => 0, onFinish)
  fireEvent.click(card(textAt('모두 박수 세 번')))
  unmount()
  advance(5000)
  const o2 = vi.fn()
  const m2 = mount(() => 0, o2)
  for (let k = 0; k < 3; k++) {
    fireEvent.click(card(kingAt[k]))
    confirm()
  }
  fireEvent.click(card(kingAt[3]))
  m2.unmount()
  advance(5000)
  expect(onFinish).not.toHaveBeenCalled()
  expect(o2).not.toHaveBeenCalled()
})

test('2명일 때 건너뛰기: 같은 사람 차례가 이어지고 tap 햅틱은 없다', () => {
  const two = drawPieces(2, () => 0.5)
  const lay = initKings(2, () => 0)
  const skip = lay.cards.findIndex((c) => c >= 0 && EFFECTS[c].kind === 'skip')
  render(<KingsGame order={two} onFinish={() => {}} rng={() => 0} now={now} />)
  fireEvent.click(card(skip))
  confirm()
  expect(screen.getByText(`👉 ${pieceLabel(two[0])} 차례예요`)).toBeTruthy()
  expect(haptic).not.toHaveBeenCalled()
})
