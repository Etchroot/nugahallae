import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { drawPieces, pieceLabel } from '../../../domain/pieces'
import { LiarGame } from '../LiarGame'
import { playAnimal, playSfx } from '../../../platform/sound'

vi.mock('../../../platform/sdk', () => ({ haptic: vi.fn(async () => {}) }))
vi.mock('../../../platform/sound', () => ({ playSfx: vi.fn(), playAnimal: vi.fn() }))

const order = drawPieces(4, () => 0.5)
let t = 0
const now = () => t
// 주제·단어는 0번, 라이어는 order[liarIdx]
const mkRng = (liarIdx: number) => {
  const seq = [0, 0, liarIdx / order.length + 0.01]
  let i = 0
  return () => (i < seq.length ? seq[i++] : 0)
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(playSfx).mockClear()
  vi.mocked(playAnimal).mockClear()
  t = 10_000
})
afterEach(() => vi.useRealTimers())

const adv = (ms: number) =>
  act(() => {
    t += ms
    vi.advanceTimersByTime(ms)
  })
const click = (name: string | RegExp) => {
  adv(500)
  fireEvent.click(screen.getByRole('button', { name }))
}
const ev = (type: string, pointerId: number): Event => {
  const e = new Event(type, { bubbles: true, cancelable: true })
  Object.assign(e, { pointerId, pointerType: 'touch' })
  return e
}
const fire = (el: Element, type: string) => act(() => { el.dispatchEvent(ev(type, 1)) })
const holdBtn = () => screen.getByRole('button', { name: '꾹 눌러서 확인' })

test('제시어 확인 소리는 라이어든 아니든 똑같다', () => {
  render(<LiarGame order={order} onFinish={() => {}} rng={mkRng(1)} now={now} />)
  click('제시어 확인 시작')
  const perPerson: unknown[][] = []
  for (let i = 0; i < order.length; i++) {
    vi.mocked(playSfx).mockClear()
    fire(holdBtn(), 'pointerdown')
    adv(300)
    fire(holdBtn(), 'pointerup')
    perPerson.push(vi.mocked(playSfx).mock.calls.map((c) => [...c]))
    click('다음 사람')
  }
  // 1번이 라이어지만 네 사람의 소리가 모두 같다
  expect(perPerson[0]).toEqual([['cardFlip']])
  for (const calls of perPerson) expect(calls).toEqual(perPerson[0])
})

test('투표할 때 누구를 골라도 같은 소리이고, 동물 울음은 내지 않는다', () => {
  render(<LiarGame order={order} onFinish={() => {}} rng={mkRng(0)} now={now} />)
  click('제시어 확인 시작')
  for (let i = 0; i < order.length; i++) {
    fire(holdBtn(), 'pointerdown')
    fire(holdBtn(), 'pointerup')
    click('다음 사람')
  }
  click('투표하러 가기')
  const picks: unknown[][] = []
  for (const p of order.slice(1)) {
    vi.mocked(playSfx).mockClear()
    fireEvent.click(screen.getByRole('button', { name: pieceLabel(p) }))
    picks.push(vi.mocked(playSfx).mock.calls.map((c) => [...c]))
  }
  for (const calls of picks) expect(calls).toEqual(picks[0])
  // 끝까지 투표해도 울음소리는 한 번도 없다
  for (let v = 0; v < order.length; v++) {
    const other = order[(v + 1) % order.length]
    fireEvent.click(screen.getByRole('button', { name: pieceLabel(other) }))
    click('확인했어요')
  }
  expect(playAnimal).not.toHaveBeenCalled()
})
