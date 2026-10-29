import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { drawPieces, pieceLabel } from '../../../domain/pieces'
import { LiarGame } from '../LiarGame'

vi.mock('../../../platform/sdk', () => ({ haptic: vi.fn(async () => {}) }))

const order = drawPieces(4, () => 0.5)
let t = 0
const now = () => t
// 주제 음식, 단어 김밥, 라이어 order[liarIdx]
const mkRng = (liarIdx: number) => {
  const seq = [0, 0, liarIdx / order.length + 0.01]
  let i = 0
  return () => (i < seq.length ? seq[i++] : 0)
}

beforeEach(() => {
  vi.useFakeTimers()
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
const ev = (type: string, pointerId: number): Event => {
  const e = new Event(type, { bubbles: true, cancelable: true })
  Object.assign(e, { pointerId, pointerType: 'touch' })
  return e
}
const fire = (el: Element, type: string, id = 1) => act(() => { el.dispatchEvent(ev(type, id)) })
const winFire = (type: string, id = 1) => act(() => { window.dispatchEvent(ev(type, id)) })
const holdBtn = () => screen.getByRole('button', { name: '꾹 눌러서 확인' })
const html = () => document.body.innerHTML

function setup(liarIdx = 0) {
  const onFinish = vi.fn()
  const r = render(<LiarGame order={order} onFinish={onFinish} rng={mkRng(liarIdx)} now={now} />)
  click('제시어 확인 시작')
  return { onFinish, ...r }
}
function peekAll() {
  for (let i = 0; i < order.length; i++) {
    fire(holdBtn(), 'pointerdown')
    fire(holdBtn(), 'pointerup')
    click('다음 사람')
  }
}

test('버튼이 pointerup을 못 받아도 window pointerup으로 가려지고 다시 누를 수 있다', () => {
  setup(0)
  fire(holdBtn(), 'pointerdown', 1)
  expect(screen.getByText('당신이 라이어예요')).toBeTruthy()
  winFire('pointerup', 2) // 다른 포인터는 무시
  expect(screen.getByText('당신이 라이어예요')).toBeTruthy()
  winFire('pointerup', 1)
  expect(html()).not.toContain('라이어예요')
  fire(holdBtn(), 'pointerdown', 3)
  expect(screen.getByText('당신이 라이어예요')).toBeTruthy()
  winFire('pointercancel', 3)
  expect(html()).not.toContain('라이어예요')
})

test('setPointerCapture가 실패해도 pointerleave로 가려진다', () => {
  setup(0)
  const b = holdBtn()
  ;(b as unknown as { setPointerCapture: () => void }).setPointerCapture = () => {
    throw new Error('no capture')
  }
  fire(b, 'pointerdown', 1)
  expect(screen.getByText('당신이 라이어예요')).toBeTruthy()
  fire(b, 'pointerout', 1) // React의 onPointerLeave는 pointerout에서 파생된다
  expect(html()).not.toContain('라이어예요')
})

test('lostpointercapture로도 가려진다', () => {
  setup(0)
  fire(holdBtn(), 'pointerdown', 1)
  fire(holdBtn(), 'lostpointercapture', 1)
  expect(html()).not.toContain('라이어예요')
})

test('마우스 보조 버튼(우클릭 등)은 무시한다', () => {
  setup(0)
  const e = ev('pointerdown', 1)
  Object.assign(e, { button: 2 })
  act(() => { holdBtn().dispatchEvent(e) })
  expect(html()).not.toContain('라이어예요')
})

test('다른 손가락이 누르고 있을 때 다음 사람을 눌러도 카드가 가려지고 다음 차례로 넘어간다', () => {
  setup(0)
  fire(holdBtn(), 'pointerdown', 1)
  click('다음 사람')
  expect(screen.getByText(`👉 ${pieceLabel(order[1])} 차례예요`)).toBeTruthy()
  expect(html()).not.toContain('라이어예요')
  expect(html()).not.toContain('김밥')
  fire(holdBtn(), 'pointerup', 1)
  expect(html()).not.toContain('김밥')
  fire(holdBtn(), 'pointerdown', 4)
  expect(screen.getByText('제시어: 김밥')).toBeTruthy()
})

test('토론·투표 단계에서도 제시어와 라이어 문구가 DOM에 없다', () => {
  setup(2)
  peekAll()
  expect(html()).not.toContain('김밥')
  expect(html()).not.toContain('라이어예요')
  click('투표하러 가기')
  expect(html()).not.toContain('김밥')
  expect(html()).not.toContain('라이어예요')
  expect(html()).not.toContain('라이어는 ')
})

test('투표는 pointerdown만으로는 선택되지 않는다(스크롤 오선택 방지)', () => {
  setup()
  peekAll()
  click('투표하러 가기')
  fireEvent.pointerDown(screen.getByRole('button', { name: pieceLabel(order[1]) }))
  expect((screen.getByRole('button', { name: '확인했어요' }) as HTMLButtonElement).disabled).toBe(true)
})
