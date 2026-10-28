import { test, expect } from 'vitest'
import { drawPieces } from '../../../domain/pieces'
import { ROWS, COLS, TOP, initTower, pullBlock, collapseRisk } from '../logic'

const order = drawPieces(3, () => 0.5)
const SAFE = () => 0.999
const BOOM = () => 0

test('14줄 x 3블록, 맨 윗줄은 마지막 줄', () => {
  const s = initTower()
  expect(ROWS).toBe(14)
  expect(COLS).toBe(3)
  expect(TOP).toBe(13)
  expect(s.rows).toHaveLength(14)
  expect(s.rows.every((r) => r.length === 3 && r.every(Boolean))).toBe(true)
})

test('위험도 공식: 기본 0.02 + 뺀 개수*0.02 + 아래쪽 가산', () => {
  // 한 줄에 2개 남음(안전), 첫 번째 블록을 뺀 직후, r=6, pulled=1
  expect(collapseRisk([false, true, true], 6, 1)).toBeCloseTo(0.02 + 0.02 + (14 - 6) * 0.004)
})

test('위험도: 가장자리 하나만 남으면 +0.35, 가운데 하나만 남으면 +0.08', () => {
  const base = 0.02 + 0.02 * 2 + (14 - 3) * 0.004
  expect(collapseRisk([false, false, true], 3, 2)).toBeCloseTo(base + 0.35)
  expect(collapseRisk([true, false, false], 3, 2)).toBeCloseTo(base + 0.35)
  expect(collapseRisk([false, true, false], 3, 2)).toBeCloseTo(base + 0.08)
})

test('맨 윗줄은 못 뺀다(top), 차례 유지', () => {
  const s = initTower()
  const r = pullBlock(s, TOP, 0, order, SAFE)
  expect(r.result).toBe('top')
  expect(r.state).toBe(s)
})

test('한 줄의 마지막 블록은 못 뺀다(last)', () => {
  let s = initTower()
  s = pullBlock(s, 0, 0, order, SAFE).state
  s = pullBlock(s, 0, 1, order, SAFE).state
  const r = pullBlock(s, 0, 2, order, SAFE)
  expect(r.result).toBe('last')
  expect(r.state).toBe(s)
  expect(s.idx).toBe(2)
})

test('이미 뺀 자리는 무시', () => {
  let s = initTower()
  s = pullBlock(s, 2, 1, order, SAFE).state
  const r = pullBlock(s, 2, 1, order, SAFE)
  expect(r.result).toBe('ignored')
  expect(r.state).toBe(s)
})

test('안전하게 빼면 뺀 개수가 늘고 차례가 순환한다', () => {
  let s = initTower()
  const r1 = pullBlock(s, 0, 0, order, SAFE)
  expect(r1.result).toBe('safe')
  expect(r1.state.rows[0]).toEqual([false, true, true])
  expect(r1.state.pulled).toBe(1)
  expect(r1.state.idx).toBe(1)
  s = r1.state
  s = pullBlock(s, 1, 0, order, SAFE).state
  s = pullBlock(s, 2, 0, order, SAFE).state
  expect(s.idx).toBe(0)
})

test('rng가 위험도보다 작으면 무너지고 그 사람이 loser, 이후 입력 무시', () => {
  const s = initTower()
  const r = pullBlock(s, 0, 0, order, BOOM)
  expect(r.result).toBe('collapse')
  expect(r.state.phase).toBe('collapsed')
  expect(r.state.loser).toBe(order[0])
  const again = pullBlock(r.state, 1, 0, order, BOOM)
  expect(again.result).toBe('ignored')
  expect(again.state).toBe(r.state)
})

test('판정 경계: rng === 위험도면 안전(rng < risk만 붕괴)', () => {
  const s = initTower()
  const risk = collapseRisk([false, true, true], 5, 1)
  expect(pullBlock(s, 5, 0, order, () => risk).result).toBe('safe')
  expect(pullBlock(s, 5, 0, order, () => risk - 1e-9).result).toBe('collapse')
})
