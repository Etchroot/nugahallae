import { test, expect } from 'vitest'
import {
  ROAD_W, START_R, makePath, totalLength, distToSegment, distToPath, sweep, canStart,
  segSegDist, interiorAngleDeg, traceScore, makeRecord, recordText, whyText,
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

test('길 생성: 인접하지 않은 구간끼리 길 폭 이상 떨어져 있다(여러 시드)', () => {
  for (let seed = 1; seed <= 3000; seed++) {
    const p = makePath(seeded(seed))
    // expect를 안쪽 반복마다 부르면 느리므로 시드마다 최솟값만 구해 한 번 검사한다.
    let minGap = Infinity
    for (let i = 0; i < p.length - 1; i++) {
      for (let j = i + 2; j < p.length - 1; j++) {
        minGap = Math.min(minGap, segSegDist(p[i], p[i + 1], p[j], p[j + 1]))
      }
    }
    expect(minGap, `seed ${seed}`).toBeGreaterThanOrEqual(ROAD_W)
  }
}, 30_000)

test('길 생성: 모든 꺾임의 안쪽 각도는 75도 이상(날카로운 모서리 없음)', () => {
  for (let seed = 1; seed <= 3000; seed++) {
    const p = makePath(seeded(seed))
    let minAngle = Infinity
    for (let i = 1; i < p.length - 1; i++) {
      minAngle = Math.min(minAngle, interiorAngleDeg(p[i - 1], p[i], p[i + 1]))
    }
    expect(minAngle, `seed ${seed}`).toBeGreaterThanOrEqual(75 - 1e-9)
  }
}, 30_000)

test('모서리 안쪽을 25px 벗어나 붙어 가도 100%에 도달한다(여러 시드)', () => {
  for (let seed = 1; seed <= 600; seed++) {
    const path = makePath(seeded(seed))
    // 각 꺾임점에서 안쪽 이등분선 방향으로 25px 옮긴 점을 이어 간다
    const pts = [path[0]]
    for (let i = 1; i < path.length - 1; i++) {
      const a = path[i - 1]
      const v = path[i]
      const b = path[i + 1]
      const ua = { x: a.x - v.x, y: a.y - v.y }
      const ub = { x: b.x - v.x, y: b.y - v.y }
      const la = Math.hypot(ua.x, ua.y)
      const lb = Math.hypot(ub.x, ub.y)
      const bis = { x: ua.x / la + ub.x / lb, y: ua.y / la + ub.y / lb }
      const bl = Math.hypot(bis.x, bis.y)
      pts.push({ x: v.x + (bis.x / bl) * 25, y: v.y + (bis.y / bl) * 25 })
    }
    pts.push(path[path.length - 1])
    let m = 0
    let prev: { x: number; y: number } | null = null
    let finished = false
    for (const q of pts) {
      const r = sweep(path, m, prev, q)
      expect(r.ok, `seed ${seed}`).toBe(true)
      m = r.maxProg
      prev = q
      finished = r.finished
    }
    expect(finished, `seed ${seed}`).toBe(true)
  }
})

test('길 안/밖: 중심선까지 거리 28 이하면 안', () => {
  const path = [{ x: 100, y: 0 }, { x: 100, y: 100 }]
  expect(distToPath({ x: 120, y: 50 }, path)).toBe(20)
  expect(sweep(path, 0, null, { x: 128, y: 50 }).ok).toBe(true)
  const r = sweep(path, 0, null, { x: 128.5, y: 50 })
  expect(r.ok).toBe(false)
  expect(r.failAt).toEqual({ x: 128.5, y: 50 })
})

test('진행은 단조 증가(뒤로 가도 최대값 유지), 완주 판정', () => {
  const path = [{ x: 100, y: 0 }, { x: 100, y: 100 }, { x: 200, y: 100 }]
  let m = sweep(path, 0, null, { x: 100, y: 40 }).maxProg
  expect(m).toBe(40)
  m = sweep(path, m, { x: 100, y: 40 }, { x: 100, y: 20 }).maxProg
  expect(m).toBe(40)
  m = sweep(path, m, { x: 100, y: 20 }, { x: 100, y: 90 }).maxProg
  expect(m).toBe(90)
  const fin = sweep(path, m, { x: 100, y: 90 }, { x: 200, y: 100 })
  expect(fin.ok).toBe(true)
  expect(fin.finished).toBe(true)
  expect(fin.maxProg).toBe(200)
})

test('시작: 시작 원 안이면서 길 안일 때만', () => {
  const path = [{ x: 100, y: 40 }, { x: 100, y: 300 }]
  expect(canStart({ x: 100, y: 40 }, path)).toBe(true)
  expect(canStart({ x: 120, y: 60 }, path)).toBe(true)
  // 원 안(거리 30)이지만 길 밖(28 초과)
  expect(canStart({ x: 130, y: 40 }, path)).toBe(false)
  expect(canStart({ x: 100, y: 80 }, path)).toBe(false)
})

test('다른 팔로 건너뛰면 진행을 얻지 못하고 실패한다', () => {
  // U자 길: 오른쪽 팔(arc 220~420)이 왼쪽 팔(0~200)에서 20px 거리
  const path = [{ x: 100, y: 0 }, { x: 100, y: 200 }, { x: 120, y: 200 }, { x: 120, y: 0 }]
  const r = sweep(path, 0, null, { x: 120, y: 10 })
  // 가까운 같은 팔(길 안, 진행 10)이지 먼 팔(진행 410)이 아니다
  expect(r.ok).toBe(true)
  expect(r.maxProg).toBeLessThan(30)
  const far = sweep(path, 0, null, { x: 120, y: 190 })
  expect(far.ok).toBe(false)
  expect(far.maxProg).toBe(0)
})

test('빠른 직선 스와이프로 벽을 건너뛰면 첫 벽 밖 지점에서 실패', () => {
  const path = [{ x: 100, y: 0 }, { x: 100, y: 200 }]
  const r = sweep(path, 0, { x: 100, y: 50 }, { x: 300, y: 50 })
  expect(r.ok).toBe(false)
  expect(r.failAt!.x).toBeGreaterThan(128)
  expect(r.failAt!.x).toBeLessThanOrEqual(136)
  expect(r.maxProg).toBe(50)
})

test('성실하게 따라가면 100%에 도달', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const path = makePath(seeded(seed))
    let m = 0
    let prev = null as { x: number; y: number } | null
    let finished = false
    for (const q of [...path]) {
      const r = sweep(path, m, prev, q)
      expect(r.ok).toBe(true)
      m = r.maxProg
      prev = q
      finished = r.finished
    }
    expect(finished).toBe(true)
    expect(m).toBeCloseTo(totalLength(path), 5)
  }
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
