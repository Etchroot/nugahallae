import { test, expect } from 'vitest'
import { SWEEP_MS, positionAt, distanceOf, pickRound, makeRecord, recordText, whyText } from '../logic'
import { drawPieces } from '../../../domain/pieces'
import { settleWorst } from '../../shared/settle'

const piece = drawPieces(3, () => 0.5)

test('한쪽 끝에서 끝까지 900ms', () => {
  expect(SWEEP_MS).toBe(900)
})

test('시간 → 위치: 등속 왕복, 경계에서 반사', () => {
  const r = { start: 0, dir: 1 as const }
  expect(positionAt(r, 0)).toBe(0)
  expect(positionAt(r, 450)).toBeCloseTo(0.5, 10)
  expect(positionAt(r, 900)).toBeCloseTo(1, 10)
  expect(positionAt(r, 1350)).toBeCloseTo(0.5, 10)
  expect(positionAt(r, 1800)).toBeCloseTo(0, 10)
  expect(positionAt(r, 2250)).toBeCloseTo(0.5, 10)
  const l = { start: 0.25, dir: -1 as const }
  expect(positionAt(l, 0)).toBeCloseTo(0.25, 10)
  expect(positionAt(l, 225)).toBeCloseTo(0, 10)
  expect(positionAt(l, 450)).toBeCloseTo(0.25, 10)
  expect(positionAt(l, 900)).toBeCloseTo(0.75, 10)
  const mid = { start: 0.5, dir: 1 as const }
  expect(positionAt(mid, 225)).toBeCloseTo(0.75, 10)
})

test('거리: 중앙 0, 양 끝 100, 소수 1자리 반올림', () => {
  expect(distanceOf(0.5)).toBe(0)
  expect(distanceOf(0)).toBe(100)
  expect(distanceOf(1)).toBe(100)
  expect(distanceOf(0.75)).toBe(50)
  expect(distanceOf(0.5 + 0.0012345)).toBe(0.2)
  expect(distanceOf(0.5 - 0.00049)).toBe(0.1)
})

test('시작 위치·방향은 rng', () => {
  expect(pickRound(() => 0.3)).toEqual({ start: 0.3, dir: 1 })
  expect(pickRound(() => 0.5)).toEqual({ start: 0.5, dir: -1 })
})

test('거리가 클수록 나쁨, 동점이면 tie', () => {
  const rows = [makeRecord(piece[0], 12.3), makeRecord(piece[1], 40), makeRecord(piece[2], 3)]
  const s = settleWorst(rows, (r) => r.d, 'higher', () => 0)
  expect(s.loser.piece.id).toBe(piece[1].id)
  expect(s.ranked.map((r) => r.d)).toEqual([3, 12.3, 40])
  const t = settleWorst([makeRecord(piece[0], 7), makeRecord(piece[1], 7)], (r) => r.d, 'higher', () => 0)
  expect(t.tie).toBe(true)
})

test('문구', () => {
  const r = makeRecord(piece[0], 12.34)
  expect(r.d).toBe(12.3)
  expect(recordText(r)).toBe('중앙에서 12.3')
  expect(whyText(makeRecord(piece[0], 5))).toBe('중앙에서 5.0 벗어났어요')
})
