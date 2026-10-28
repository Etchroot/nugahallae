import { test, expect } from 'vitest'
import {
  ROAD_W, START_R, makePath, totalLength, distToSegment, distToPath, isInsideRoad,
  progressDist, nextMaxProgress, reachedFinish, inStartCircle, traceScore, makeRecord,
  recordText, whyText,
} from '../logic'
import { drawPieces } from '../../../domain/pieces'
import { settleWorst } from '../../shared/settle'

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}
const piece = drawPieces(3, () => 0.5)

test('상수: 길 폭 56, 시작 원 지름 64', () => {
  expect(ROAD_W).toBe(56)
  expect(START_R * 2).toBe(64)
})

test('길 생성은 rng가 같으면 같고, 8~10개 꺾임점 + 시작/끝, 위→아래', () => {
  const a = makePath(seeded(7))
  const b = makePath(seeded(7))
  expect(a).toEqual(b)
  expect(makePath(seeded(8))).not.toEqual(a)
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const p = makePath(seeded(seed))
    expect(p.length - 2).toBeGreaterThanOrEqual(8)
    expect(p.length - 2).toBeLessThanOrEqual(10)
    for (let i = 1; i < p.length; i++) expect(p[i].y).toBeGreaterThan(p[i - 1].y)
    for (const q of p) {
      expect(q.x).toBeGreaterThanOrEqual(START_R)
      expect(q.x).toBeLessThanOrEqual(320 - START_R)
    }
  }
})

test('점-선분 거리', () => {
  const a = { x: 0, y: 0 }
  const b = { x: 10, y: 0 }
  expect(distToSegment({ x: 5, y: 3 }, a, b)).toBe(3)
  expect(distToSegment({ x: -4, y: 3 }, a, b)).toBe(5)
  expect(distToSegment({ x: 13, y: 4 }, a, b)).toBe(5)
  expect(distToSegment({ x: 2, y: 0 }, a, a)).toBe(2)
})

test('길 안/밖: 중심선까지 거리 28 이하면 안', () => {
  const path = [{ x: 100, y: 0 }, { x: 100, y: 100 }]
  expect(distToPath({ x: 120, y: 50 }, path)).toBe(20)
  expect(isInsideRoad({ x: 128, y: 50 }, path)).toBe(true)
  expect(isInsideRoad({ x: 128.5, y: 50 }, path)).toBe(false)
  expect(isInsideRoad({ x: 70, y: 50 }, path)).toBe(false)
})

test('진행 거리 투영과 단조 증가(뒤로 가도 최대값 유지)', () => {
  const path = [{ x: 100, y: 0 }, { x: 100, y: 100 }, { x: 200, y: 100 }]
  expect(totalLength(path)).toBe(200)
  expect(progressDist({ x: 100, y: 40 }, path)).toBe(40)
  expect(progressDist({ x: 150, y: 100 }, path)).toBe(150)
  let m = 0
  m = nextMaxProgress(m, progressDist({ x: 100, y: 60 }, path))
  expect(m).toBe(60)
  m = nextMaxProgress(m, progressDist({ x: 100, y: 20 }, path))
  expect(m).toBe(60)
  m = nextMaxProgress(m, progressDist({ x: 100, y: 90 }, path))
  expect(m).toBe(90)
})

test('시작 원 판정과 완주 판정', () => {
  const path = [{ x: 100, y: 40 }, { x: 100, y: 300 }]
  expect(inStartCircle({ x: 100, y: 72 }, path)).toBe(true)
  expect(inStartCircle({ x: 100, y: 73 }, path)).toBe(false)
  expect(reachedFinish({ x: 100, y: 299 }, path)).toBe(false)
  expect(reachedFinish({ x: 110, y: 300 }, path)).toBe(true)
  expect(reachedFinish({ x: 190, y: 300 }, path)).toBe(false)
})

test('점수 공식: 미완주 < 완주, 완주끼리 느릴수록 나쁨', () => {
  expect(traceScore(0.4, null)).toBe(400)
  expect(traceScore(1, 5)).toBe(1095)
  const rows = [
    makeRecord(piece[0], { progress: 1, timeSec: 8 }),
    makeRecord(piece[1], { progress: 0.9, timeSec: null }),
    makeRecord(piece[2], { progress: 1, timeSec: 5 }),
  ]
  const s = settleWorst(rows, (r) => traceScore(r.progress, r.timeSec), 'lower', () => 0)
  expect(s.ranked.map((r) => r.piece.id)).toEqual([piece[2].id, piece[0].id, piece[1].id])
  expect(s.loser.piece.id).toBe(piece[1].id)
})

test('모두 완주면 가장 느린 사람이 꼴찌', () => {
  const rows = [
    makeRecord(piece[0], { progress: 1, timeSec: 8 }),
    makeRecord(piece[1], { progress: 1, timeSec: 12 }),
  ]
  const s = settleWorst(rows, (r) => traceScore(r.progress, r.timeSec), 'lower', () => 0)
  expect(s.loser.piece.id).toBe(piece[1].id)
  expect(whyText(s.loser)).toBe('가장 느렸어요')
})

test('기록 문구: 퍼센트는 내림(미완주는 최대 99%)', () => {
  const r = makeRecord(piece[0], { progress: 0.4567, timeSec: null })
  expect(recordText(r)).toBe('45%')
  expect(whyText(r)).toBe('45%에서 멈췄어요')
  expect(recordText(makeRecord(piece[0], { progress: 0.9999, timeSec: null }))).toBe('99%')
  expect(recordText(makeRecord(piece[0], { progress: 1, timeSec: 7.234 }))).toBe('완주 7.23초')
})
