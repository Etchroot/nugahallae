import { test, expect } from 'vitest'
import { FINGERS, SENTENCES, draw, foldFinger, initFingers, newDeck, zeroed } from '../logic'

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

test('문장 목록은 30개, 중복 없음', () => {
  expect(SENTENCES).toHaveLength(30)
  expect(new Set(SENTENCES).size).toBe(30)
  expect(SENTENCES[0]).toBe('나는 지하철에서 내릴 역을 지나쳐 본 적 없다')
  expect(SENTENCES[29]).toBe('나는 웃음을 참느라 눈물이 난 적 없다')
})

test('손가락 5개로 시작, 접을 때마다 줄고 0 아래로 내려가지 않는다', () => {
  expect(FINGERS).toBe(5)
  const f = initFingers(3)
  expect(f).toEqual([5, 5, 5])
  const g = foldFinger(f, 1)
  expect(g).toEqual([5, 4, 5])
  expect(f).toEqual([5, 5, 5])
  let h = g
  for (let i = 0; i < 10; i++) h = foldFinger(h, 1)
  expect(h[1]).toBe(0)
})

test('zeroed는 손가락이 0인 사람 목록', () => {
  expect(zeroed([5, 0, 2, 0])).toEqual([1, 3])
  expect(zeroed([1, 2])).toEqual([])
})

test('30개를 모두 쓸 때까지 중복 없이 나오고, 다 쓰면 다시 섞는다', () => {
  const rng = seeded(7)
  let deck = newDeck(rng)
  const seen: string[] = []
  for (let i = 0; i < 30; i++) {
    const r = draw(deck, rng)
    seen.push(r.sentence)
    deck = r.deck
  }
  expect(new Set(seen).size).toBe(30)
  expect(seen.every((s) => SENTENCES.includes(s))).toBe(true)
  const second: string[] = []
  for (let i = 0; i < 30; i++) {
    const r = draw(deck, rng)
    second.push(r.sentence)
    deck = r.deck
  }
  expect(new Set(second).size).toBe(30)
  expect(second.every((s) => SENTENCES.includes(s))).toBe(true)
})

test('다시 섞은 직후 첫 문장이 직전 문장과 같지 않다', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const rng = seeded(seed)
    let deck = newDeck(rng)
    let prev = ''
    for (let i = 0; i < 61; i++) {
      const r = draw(deck, rng)
      if (i > 0) expect(r.sentence).not.toBe(prev)
      prev = r.sentence
      deck = r.deck
    }
  }
})

test('같은 rng 시퀀스면 같은 순서', () => {
  const a = newDeck(seeded(3))
  const b = newDeck(seeded(3))
  expect(a.queue).toEqual(b.queue)
})
