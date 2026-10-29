import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { drawPieces, pieceLabel } from '../../../domain/pieces'
import { LiarGame } from '../LiarGame'
import { RECORD_END_MS } from '../../shared/timing'
import { haptic } from '../../../platform/sdk'

vi.mock('../../../platform/sdk', () => ({ haptic: vi.fn(async () => {}) }))

const order = drawPieces(4, () => 0.5)
let t = 0
const now = () => t
// 주제 음식(0), 단어 김밥(0), 라이어 order[liarIdx], 이후 동점 rng는 0
const mkRng = (liarIdx: number) => {
  const seq = [0, 0, liarIdx / order.length + 0.01]
  let i = 0
  return () => (i < seq.length ? seq[i++] : 0)
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
const click = (name: string | RegExp) => {
  adv(500) // 연타 가드(400ms) 통과
  fireEvent.click(screen.getByRole('button', { name }))
}
// jsdom에는 PointerEvent가 없어 pointerId를 직접 실은 이벤트를 쓴다.
const ev = (type: string, pointerId: number): Event => {
  const e = new Event(type, { bubbles: true, cancelable: true })
  Object.assign(e, { pointerId, pointerType: 'touch' })
  return e
}
const fire = (el: Element, type: string, id = 1) => act(() => { el.dispatchEvent(ev(type, id)) })
const holdBtn = () => screen.getByRole('button', { name: '꾹 눌러서 확인' })
const html = () => document.body.innerHTML

function setup(liarIdx = 0, onFinish = vi.fn()) {
  const r = render(<LiarGame order={order} onFinish={onFinish} rng={mkRng(liarIdx)} now={now} />)
  return { onFinish, ...r }
}
function toReveal() {
  click('제시어 확인 시작')
}
// 모든 사람이 한 번씩 확인
function peekAll() {
  for (let i = 0; i < order.length; i++) {
    fire(holdBtn(), 'pointerdown')
    fire(holdBtn(), 'pointerup')
    click('다음 사람')
  }
}
function toVote() {
  toReveal()
  peekAll()
  click('투표하러 가기')
}
function voteAll(targets: number[]) {
  targets.forEach((tg) => {
    fireEvent.click(screen.getByRole('button', { name: pieceLabel(order[tg]) }))
    click('확인했어요')
  })
}

test('규칙 띠와 주제 공개 화면', () => {
  setup()
  expect(screen.getByText('한 명은 라이어! 투표로 찾아요')).toBeTruthy()
  expect(screen.getByText('주제: 음식')).toBeTruthy()
  expect(html()).not.toContain('김밥')
})

test('확인 단계: 누르기 전·뗀 뒤에는 제시어/라이어 문구가 DOM 어디에도 없다', () => {
  setup(0)
  toReveal()
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  expect(html()).not.toContain('김밥')
  expect(html()).not.toContain('라이어예요')
  fire(holdBtn(), 'pointerdown')
  expect(screen.getByText('당신이 라이어예요')).toBeTruthy()
  expect(html()).not.toContain('김밥')
  fire(holdBtn(), 'pointerup')
  expect(html()).not.toContain('라이어예요')
  expect(html()).not.toContain('김밥')
})

test('일반 사람 화면은 제시어를 보여 준다', () => {
  setup(0)
  toReveal()
  fire(holdBtn(), 'pointerdown')
  fire(holdBtn(), 'pointerup')
  click('다음 사람')
  fire(holdBtn(), 'pointerdown')
  expect(screen.getByText('제시어: 김밥')).toBeTruthy()
  expect(html()).not.toContain('라이어예요')
  fire(holdBtn(), 'pointerup')
  expect(html()).not.toContain('김밥')
})

test('pointercancel·blur·백그라운드로 즉시 가려지고, 두 번째 포인터는 무시', () => {
  setup(0)
  toReveal()
  fire(holdBtn(), 'pointerdown', 1)
  fire(holdBtn(), 'pointerdown', 2)
  fire(holdBtn(), 'pointerup', 2) // 다른 포인터의 up은 무시
  expect(screen.getByText('당신이 라이어예요')).toBeTruthy()
  fire(holdBtn(), 'pointercancel', 1)
  expect(html()).not.toContain('라이어예요')
  fire(holdBtn(), 'pointerdown', 1)
  act(() => { fireEvent.blur(holdBtn()) })
  expect(html()).not.toContain('라이어예요')
  fire(holdBtn(), 'pointerdown', 1)
  act(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  expect(html()).not.toContain('라이어예요')
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
})

test('한 번 확인해야 다음 사람 버튼이 활성', () => {
  setup()
  toReveal()
  expect((screen.getByRole('button', { name: '다음 사람' }) as HTMLButtonElement).disabled).toBe(true)
  fire(holdBtn(), 'pointerdown')
  fire(holdBtn(), 'pointerup')
  expect((screen.getByRole('button', { name: '다음 사람' }) as HTMLButtonElement).disabled).toBe(false)
})

test('다음 사람 연타는 한 번만 처리(400ms 가드)', () => {
  setup()
  toReveal()
  fire(holdBtn(), 'pointerdown')
  fire(holdBtn(), 'pointerup')
  adv(500)
  const b = screen.getByRole('button', { name: '다음 사람' })
  fireEvent.click(b)
  fireEvent.click(b)
  expect(screen.getByText(`👉 ${pieceLabel(order[1])} 차례예요`)).toBeTruthy()
})

test('토론: 타이머 표시, 투표하러 가기, 0초 자동 이동', () => {
  setup()
  toReveal()
  peekAll()
  expect(screen.getByText('주제: 음식')).toBeTruthy()
  expect(screen.getByText('2:00')).toBeTruthy()
  adv(60_000)
  expect(screen.getByText('1:00')).toBeTruthy()
  adv(60_000)
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  expect(screen.getByText('라이어로 의심되는 사람을 골라요')).toBeTruthy()
})

test('투표: 자기 자신은 후보에 없고, 선택 전에는 확인 비활성', () => {
  setup()
  toVote()
  expect(screen.queryByRole('button', { name: pieceLabel(order[0]) })).toBeNull()
  expect((screen.getByRole('button', { name: '확인했어요' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: pieceLabel(order[1]) }))
  expect((screen.getByRole('button', { name: '확인했어요' }) as HTMLButtonElement).disabled).toBe(false)
  click('확인했어요')
  // 다음 사람 화면에는 이전 선택이 남아 있지 않다
  expect(screen.getByText(`👉 ${pieceLabel(order[1])} 차례예요`)).toBeTruthy()
  expect((screen.getByRole('button', { name: '확인했어요' }) as HTMLButtonElement).disabled).toBe(true)
  expect(screen.getByText('투표 완료 1/4')).toBeTruthy()
})

test('라이어 적중: 라이어가 loser, 공개 문구 후 1.2초 뒤 onFinish 1회, error 햅틱 1회', () => {
  const { onFinish } = setup(2)
  toVote()
  vi.mocked(haptic).mockClear()
  voteAll([2, 2, 0, 2]) // order[2]가 3표
  expect(screen.getByText(`${pieceLabel(order[2])} 라이어였어요`)).toBeTruthy()
  expect(screen.getByText(`라이어는 ${pieceLabel(order[2])}, 제시어는 김밥`)).toBeTruthy()
  expect(haptic).toHaveBeenCalledWith('error')
  expect(vi.mocked(haptic).mock.calls.filter((c) => c[0] === 'error')).toHaveLength(1)
  adv(RECORD_END_MS - 1)
  expect(onFinish).not.toHaveBeenCalled()
  adv(1)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledWith(order[2])
  adv(5000)
  expect(onFinish).toHaveBeenCalledTimes(1)
})

test('오지목: 지목된 사람이 loser', () => {
  const { onFinish } = setup(0)
  toVote()
  voteAll([2, 3, 3, 2]) // 2표 동점 {2,3} → rng 0 → order[2]
  expect(screen.getByText(`${pieceLabel(order[2])} 잘못 지목됐어요`)).toBeTruthy()
  adv(RECORD_END_MS)
  expect(onFinish).toHaveBeenCalledWith(order[2])
})

test('결과 단계 전에는 라이어·제시어 공개 문구가 없다', () => {
  setup(2)
  toVote()
  voteAll([2, 2, 0])
  expect(html()).not.toContain('라이어는 ')
  expect(html()).not.toContain('김밥')
})

test('언마운트하면 onFinish 미호출', () => {
  const { onFinish, unmount } = setup(2)
  toVote()
  voteAll([2, 2, 0, 2])
  unmount()
  adv(10_000)
  expect(onFinish).not.toHaveBeenCalled()
})
