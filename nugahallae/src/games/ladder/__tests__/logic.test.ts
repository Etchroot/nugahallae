import { test, expect } from 'vitest'
import { drawPieces } from '../../../domain/pieces'
import {
  LEVELS,
  createLadder,
  traceLadder,
  initLadderState,
  startTrace,
  finishTrace,
  currentTracer,
} from '../logic'
import type { Ladder } from '../logic'

function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

test('createLadder: 2..10 모두 규칙을 지킨다', () => {
  for (let cols = 2; cols <= 10; cols++) {
    for (let seed = 1; seed <= 60; seed++) {
      const l = createLadder(cols, seeded(seed * 7 + cols))
      expect(l.cols).toBe(cols)
      expect(l.rungs.length).toBe(LEVELS)
      for (const row of l.rungs) {
        expect(row.length).toBe(cols - 1)
        for (let g = 0; g < cols - 2; g++) expect(row[g] && row[g + 1]).toBe(false)
      }
      for (let g = 0; g < cols - 1; g++) expect(l.rungs.some((r) => r[g])).toBe(true)
      expect(Number.isInteger(l.bad)).toBe(true)
      expect(l.bad).toBeGreaterThanOrEqual(0)
      expect(l.bad).toBeLessThan(cols)
    }
  }
})

test('createLadder: rng가 극단값이어도 규칙을 지킨다', () => {
  for (const v of [0, 0.999999, 0.5]) {
    for (let cols = 2; cols <= 10; cols++) {
      const l = createLadder(cols, () => v)
      for (const row of l.rungs) for (let g = 0; g < cols - 2; g++) expect(row[g] && row[g + 1]).toBe(false)
      for (let g = 0; g < cols - 1; g++) expect(l.rungs.some((r) => r[g])).toBe(true)
      expect(l.bad).toBeLessThan(cols)
    }
  }
})

test('createLadder: 같은 rng면 같은 결과', () => {
  expect(createLadder(6, seeded(42))).toEqual(createLadder(6, seeded(42)))
})

test('createLadder: 범위 밖이면 RangeError', () => {
  for (const c of [1, 11, 2.5, 0, -1, NaN]) {
    expect(() => createLadder(c, () => 0.5)).toThrow(RangeError)
  }
})

function handLadder(): Ladder {
  const rungs = Array.from({ length: LEVELS }, () => [false, false])
  rungs[0][0] = true // level0: 0<->1
  rungs[2][1] = true // level2: 1<->2
  return { cols: 3, rungs, bad: 0 }
}

test('traceLadder: 손으로 만든 사다리', () => {
  const l = handLadder()
  const b = LEVELS + 1
  expect(traceLadder(l, 0)).toEqual({
    end: 2,
    points: [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 3 },
      { x: 2, y: 3 },
      { x: 2, y: b },
    ],
  })
  expect(traceLadder(l, 1).end).toBe(0)
  expect(traceLadder(l, 2).end).toBe(1)
  expect(traceLadder(l, 1).points[0]).toEqual({ x: 1, y: 0 })
})

test('traceLadder: 어떤 사다리든 도착 칸은 순열', () => {
  for (let cols = 2; cols <= 10; cols++) {
    for (let seed = 1; seed <= 30; seed++) {
      const l = createLadder(cols, seeded(seed * 13 + cols))
      const ends = Array.from({ length: cols }, (_, i) => traceLadder(l, i).end)
      expect(new Set(ends).size).toBe(cols)
      expect(Math.min(...ends)).toBe(0)
      expect(Math.max(...ends)).toBe(cols - 1)
    }
  }
})

const order = drawPieces(3, () => 0.5)
function ladderBad(bad: number): Ladder {
  return { ...handLadder(), bad }
}

test('상태: 통과하면 turn+1, idle', () => {
  let s = startTrace(initLadderState())
  expect(s.phase).toBe('tracing')
  s = finishTrace(s, ladderBad(0), order) // 0번 말은 2칸 도착 -> 통과
  expect(s.turn).toBe(1)
  expect(s.phase).toBe('idle')
  expect(s.revealed).toEqual([{ col: 2, piece: order[0], bad: false }])
  expect(s.loser).toBeNull()
  expect(currentTracer(s, order)).toBe(order[1])
})

test('상태: 벌칙 칸에 도착하면 done + loser', () => {
  const s = finishTrace(startTrace(initLadderState()), ladderBad(2), order)
  expect(s.phase).toBe('done')
  expect(s.loser).toBe(order[0])
  expect(s.revealed[0].bad).toBe(true)
})

test('상태: idle에서 finishTrace, tracing에서 startTrace는 무시', () => {
  const idle = initLadderState()
  expect(finishTrace(idle, ladderBad(2), order)).toBe(idle)
  const tracing = startTrace(idle)
  expect(startTrace(tracing)).toBe(tracing)
})

test('상태: 앞사람이 모두 통과하면 마지막 사람이 loser', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const cols = 2 + (seed % 9)
    const pieces = drawPieces(cols, () => 0.5)
    const l = createLadder(cols, seeded(seed))
    let s = initLadderState()
    let steps = 0
    while (s.phase !== 'done') {
      s = finishTrace(startTrace(s), l, pieces)
      steps++
      expect(steps).toBeLessThanOrEqual(cols)
    }
    const ends = s.revealed.map((r) => r.col)
    expect(new Set(ends).size).toBe(ends.length)
    expect(s.loser).toBe(pieces[s.revealed.length - 1])
    if (s.revealed.length === cols) expect(s.loser).toBe(pieces[cols - 1])
    // 끝까지 안 걸린 경우에도 마지막 사람은 반드시 벌칙
    expect(s.revealed.filter((r) => r.bad).length).toBe(1)
  }
})
