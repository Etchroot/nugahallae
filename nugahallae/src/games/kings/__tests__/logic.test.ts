import { test, expect } from 'vitest'
import { CARD_COUNT, EFFECTS, KING_COUNT, confirmCard, drawCard, faceOf, initKings } from '../logic'
import type { KingsState } from '../logic'

const seq = (vals: number[]) => {
  let i = 0
  return () => vals[i++ % vals.length]
}

/** 카드 배치를 직접 정한다: kingsAt 위치만 왕, 나머지는 효과 0..11 */
const layout = (players: number, kingsAt: number[], effectAt: Record<number, number> = {}): KingsState => {
  const s = initKings(players, () => 0)
  let e = 0
  const cards = Array.from({ length: CARD_COUNT }, (_, i) => {
    if (kingsAt.includes(i)) return -1
    if (i in effectAt) return effectAt[i]
    return e++
  })
  return { ...s, cards }
}

test('효과 카드는 12종이고 문구가 지시서와 같다', () => {
  expect(EFFECTS.length).toBe(12)
  expect(EFFECTS[0]).toMatchObject({ kind: 'again', text: '한 번 더 뽑기' })
  expect(EFFECTS[1]).toMatchObject({ kind: 'skip', text: '다음 사람 건너뛰기' })
  expect(EFFECTS.filter((e) => e.text === '쉬어 가요 (아무 일 없음)').length).toBe(2)
  expect(EFFECTS.filter((e) => e.kind === 'say').length).toBe(10)
})

test('배치: 16장, 왕 4장, 효과 12종이 하나씩', () => {
  const s = initKings(4, () => 0.3)
  expect(s.cards.length).toBe(16)
  expect(s.cards.filter((c) => c === -1).length).toBe(KING_COUNT)
  expect(s.cards.filter((c) => c >= 0).sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
})

test('같은 rng면 같은 배치, 다른 rng면 달라질 수 있다', () => {
  const a = initKings(3, seq([0.1, 0.9, 0.4, 0.7]))
  const b = initKings(3, seq([0.1, 0.9, 0.4, 0.7]))
  expect(a.cards).toEqual(b.cards)
  expect(initKings(3, () => 0).cards).not.toEqual(initKings(3, () => 0.99).cards)
})

test('효과 카드를 뽑으면 확인 단계, 이미 뽑은 카드는 못 뽑는다', () => {
  const s = layout(3, [0, 1, 2, 3])
  const r = drawCard(s, 5)
  expect(r.event).toBe('effect')
  expect(r.state.phase).toBe('show')
  expect(r.state.drawn[5]).toBe(true)
  expect(drawCard(r.state, 6).event).toBe('ignored') // 확인 전 다른 카드
  const c = confirmCard(r.state).state
  expect(drawCard(c, 5).event).toBe('ignored')
})

test('왕 1~3번째는 개수만 올라가고 다음 사람, 네 번째에서 끝난다', () => {
  let s = layout(3, [0, 1, 2, 3])
  for (let k = 1; k <= 3; k++) {
    const r = drawCard(s, k - 1)
    expect(r.event).toBe('king')
    expect(r.state.kings).toBe(k)
    const c = confirmCard(r.state)
    expect(c.passed).toBe(true)
    s = c.state
    expect(s.idx).toBe(k)
  }
  const last = drawCard(s, 3)
  expect(last.event).toBe('last-king')
  expect(last.state.phase).toBe('over')
  expect(last.state.loserIdx).toBe(0) // idx 3 % 3
  expect(drawCard(last.state, 8).event).toBe('ignored')
  expect(confirmCard(last.state).state).toBe(last.state)
})

test('한 번 더 뽑기: 같은 사람이 다시 뽑는다(차례 넘김 없음)', () => {
  const s = layout(3, [0, 1, 2, 3], { 5: 0 })
  const r = drawCard(s, 5)
  const c = confirmCard(r.state)
  expect(c.passed).toBe(false)
  expect(c.state.idx).toBe(0)
  expect(c.state.phase).toBe('pick')
})

test('다음 사람 건너뛰기: 차례가 두 칸 간다', () => {
  const s = layout(3, [0, 1, 2, 3], { 5: 1 })
  const c = confirmCard(drawCard(s, 5).state)
  expect(c.passed).toBe(true)
  expect(c.state.idx).toBe(2)
})

test('말·행동 안내 카드는 한 칸만 간다', () => {
  const s = layout(3, [0, 1, 2, 3], { 5: 4 })
  const c = confirmCard(drawCard(s, 5).state)
  expect(c.state.idx).toBe(1)
})

test('남은 카드가 마지막 왕 하나뿐이어도 한 번 더 뽑기·건너뛰기는 안전하다', () => {
  // 왕 3장 + 효과 11장을 모두 뽑은 뒤 마지막 효과(한 번 더 뽑기)를 뽑는 상황: 남은 건 왕 1장
  let s = layout(2, [0, 1, 2, 3], { 15: 0 })
  const order = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 0, 1, 2]
  for (const i of order) s = confirmCard(drawCard(s, i).state).state
  s = drawCard(s, 15).state
  s = confirmCard(s).state // 한 번 더
  expect(s.phase).toBe('pick')
  expect(s.drawn.filter((d) => !d).length).toBe(1)
  expect(drawCard(s, 3).event).toBe('last-king')
})

test('faceOf: 왕과 효과를 구분', () => {
  const s = layout(3, [0, 1, 2, 3])
  expect(faceOf(s, 0)).toEqual({ kind: 'king' })
  expect(faceOf(s, 4)).toMatchObject({ kind: 'effect', text: '한 번 더 뽑기' })
})
