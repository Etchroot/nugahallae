import { test, expect } from 'vitest'
import { TURN_MS, wireCount, wireSpecs, initWires, startTurn, cutWire, cancelTurn } from '../logic'

test('전선 수는 인원 + 3, 최대 12', () => {
  expect(wireCount(2)).toBe(5)
  expect(wireCount(6)).toBe(9)
  expect(wireCount(9)).toBe(12)
  expect(wireCount(10)).toBe(12)
})

test('전선은 번호·색·무늬가 모두 다르게 조합된다', () => {
  const specs = wireSpecs(12)
  expect(specs.map((s) => s.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  expect(new Set(specs.map((s) => s.color)).size).toBe(12)
  expect(new Set(specs.map((s) => s.colorName)).size).toBe(12)
  expect(new Set(specs.map((s) => s.pattern))).toEqual(new Set(['solid', 'dashed', 'striped']))
})

test('틀린 전선은 정확히 하나이고 rng로 재현된다', () => {
  expect(initWires(4, () => 0).bad).toBe(0)
  expect(initWires(4, () => 0.9999).bad).toBe(6)
  const c = initWires(4, () => 0.5)
  expect(c).toEqual(initWires(4, () => 0.5))
  expect(c.cut.every((x) => !x)).toBe(true)
  expect(c.cut.length).toBe(7)
})

test('준비 단계에서는 자를 수 없고, 시작하면 자를 수 있다', () => {
  const s = initWires(3, () => 0)
  expect(cutWire(s, 1, 0).result).toBe('ignored')
  const r = startTurn(s)
  expect(r.phase).toBe('running')
  expect(startTurn(r)).toBe(r)
})

test('안전한 전선을 자르면 끊어지고 다음 사람 준비 단계', () => {
  const s = startTurn(initWires(3, () => 0))
  const r = cutWire(s, 2, 100)
  expect(r.result).toBe('safe')
  expect(r.state.cut[2]).toBe(true)
  expect(r.state.idx).toBe(1)
  expect(r.state.phase).toBe('ready')
})

test('이미 자른 전선은 다시 자를 수 없다', () => {
  let s = startTurn(initWires(3, () => 0))
  s = cutWire(s, 2, 0).state
  s = startTurn(s)
  const r = cutWire(s, 2, 0)
  expect(r.result).toBe('ignored')
  expect(r.state).toBe(s)
})

test('틀린 전선을 자르면 그 차례 사람이 진다', () => {
  let s = startTurn(initWires(3, () => 0))
  s = cutWire(s, 1, 0).state
  s = startTurn(s)
  const r = cutWire(s, 0, 0)
  expect(r.result).toBe('boom')
  expect(r.state.phase).toBe('over')
  expect(r.state.loserIdx).toBe(1)
  expect(cutWire(r.state, 3, 0).result).toBe('ignored')
})

test('제한 시간 경계: 7999ms는 통과, 8000ms는 시간 초과', () => {
  const s = startTurn(initWires(3, () => 0))
  expect(TURN_MS).toBe(8000)
  expect(cutWire(s, 1, TURN_MS - 1).result).toBe('safe')
  const r = cutWire(s, 1, TURN_MS)
  expect(r.result).toBe('timeout')
  expect(r.state.phase).toBe('over')
  expect(r.state.loserIdx).toBe(0)
})

test('시간 초과 때는 아무 전선도 자르지 않은 채 끝난다', () => {
  const s = startTurn(initWires(3, () => 0))
  const r = cutWire(s, 1, TURN_MS + 5000)
  expect(r.state.cut[1]).toBe(false)
})

test('cancelTurn은 같은 사람 준비 단계로 되돌린다', () => {
  const s = startTurn(initWires(3, () => 0))
  const r = cancelTurn(s)
  expect(r.phase).toBe('ready')
  expect(r.idx).toBe(0)
  expect(cancelTurn(r)).toBe(r)
})

test('안전한 전선이 모두 잘린 뒤에는 남은 전선이 틀린 전선', () => {
  let s = initWires(2, () => 0) // 5개, bad=0
  for (const i of [1, 2, 3, 4]) s = cutWire(startTurn(s), i, 0).state
  expect(s.cut.filter(Boolean).length).toBe(4)
  const r = cutWire(startTurn(s), 0, 0)
  expect(r.result).toBe('boom')
  expect(r.state.loserIdx).toBe(0) // idx 4 % 2
})
