import { test, expect } from 'vitest'
import { drawPieces } from '../../../domain/pieces'
import {
  CAP,
  addWater,
  canPass,
  currentPourer,
  domeLevel,
  initPour,
  isTrembling,
  passTurn,
} from '../logic'
import type { PourState } from '../logic'

const order = drawPieces(3, () => 0.5)
const base = (over: Partial<PourState> = {}): PourState => ({
  volume: 0,
  limit: 10,
  turn: 0,
  pouredThisTurn: 0,
  phase: 'playing',
  loser: null,
  ...over,
})

test('initPour: limit은 6~14 범위', () => {
  expect(initPour(() => 0).limit).toBe(6)
  const hi = initPour(() => 0.999999)
  expect(hi.limit).toBeLessThan(14)
  expect(hi.limit).toBeGreaterThan(13.9)
  const s = initPour(() => 0.5)
  expect(s).toMatchObject({ volume: 0, turn: 0, pouredThisTurn: 0, phase: 'playing', loser: null })
})

test('addWater 누적, CAP을 넘어도 limit 전에는 playing', () => {
  let s = addWater(base(), 30, order)
  s = addWater(s, 75, order)
  expect(s.volume).toBe(105)
  expect(s.pouredThisTurn).toBe(105)
  expect(s.phase).toBe('playing')
})

test('volume-CAP >= limit 순간 spilled, loser는 그 차례 말', () => {
  let s = base({ volume: 109.9, turn: 4 })
  s = addWater(s, 0.1, order)
  expect(s.phase).toBe('spilled')
  expect(s.loser).toBe(order[4 % 3])
})

test('amount<=0은 그대로', () => {
  const s = base()
  expect(addWater(s, 0, order)).toBe(s)
  expect(addWater(s, -1, order)).toBe(s)
})

test('spilled 후 addWater/passTurn 무시', () => {
  const s = base({ volume: 120, phase: 'spilled', loser: order[0], pouredThisTurn: 5 })
  expect(addWater(s, 5, order)).toBe(s)
  expect(passTurn(s)).toBe(s)
  expect(canPass(s)).toBe(false)
})

test('canPass/passTurn/currentPourer', () => {
  let s = base()
  expect(canPass(s)).toBe(false)
  expect(passTurn(s)).toBe(s)
  s = addWater(s, 0.6, order)
  expect(canPass(s)).toBe(true)
  s = passTurn(s)
  expect(s.pouredThisTurn).toBe(0)
  expect(s.turn).toBe(1)
  expect(currentPourer(s, order)).toBe(order[1])
  s = passTurn(addWater(s, 1, order))
  s = passTurn(addWater(s, 1, order))
  expect(currentPourer(s, order)).toBe(order[0])
})

test('domeLevel', () => {
  expect(domeLevel(99)).toBe(0)
  expect(domeLevel(CAP + 7)).toBeCloseTo(0.5)
  expect(domeLevel(200)).toBe(1)
})

test('isTrembling 경계 (limit 10 -> 8)', () => {
  expect(isTrembling(base({ volume: 107.9 }))).toBe(false)
  expect(isTrembling(base({ volume: 108 }))).toBe(true)
  expect(isTrembling(base({ volume: 108, phase: 'spilled' }))).toBe(false)
})
