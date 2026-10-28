import { test, expect } from 'vitest'
import { drawPieces } from '../../../domain/pieces'
import { initUpdown, submitGuess, parseGuess } from '../logic'

const order = drawPieces(3, () => 0.5)

test('비밀 숫자는 1~100 (rng)', () => {
  expect(initUpdown(() => 0).secret).toBe(1)
  expect(initUpdown(() => 0.999).secret).toBe(100)
  expect(initUpdown(() => 0.5).secret).toBe(51)
})

test('parseGuess: 숫자만 허용, 공백 제거', () => {
  expect(parseGuess(' 42 ')).toBe(42)
  expect(parseGuess('')).toBeNull()
  expect(parseGuess('abc')).toBeNull()
  expect(parseGuess('4.5')).toBeNull()
  expect(parseGuess('-3')).toBeNull()
  expect(parseGuess('1e2')).toBeNull()
})

test('작은 숫자는 UP: lo가 올라가고 차례 순환, 기록에 남는다', () => {
  const s0 = { ...initUpdown(() => 0.5), secret: 60 }
  const r = submitGuess(s0, '30', order)
  expect(r.error).toBe(false)
  expect(r.state.lo).toBe(31)
  expect(r.state.hi).toBe(100)
  expect(r.state.hint).toBe('up')
  expect(r.state.turn).toBe(1)
  expect(r.state.history).toEqual([{ piece: order[0], n: 30 }])
})

test('큰 숫자는 DOWN: hi가 내려간다', () => {
  const s0 = { ...initUpdown(() => 0.5), secret: 60 }
  const r = submitGuess(s0, '80', order)
  expect(r.state.hi).toBe(79)
  expect(r.state.hint).toBe('down')
})

test('범위 밖·빈 값·숫자 아님은 error, 상태 불변(차례 안 넘어감)', () => {
  const s0 = { ...initUpdown(() => 0.5), secret: 60, lo: 31, hi: 79 }
  for (const t of ['30', '80', '', 'x', '0']) {
    const r = submitGuess(s0, t, order)
    expect(r.error).toBe(true)
    expect(r.state).toBe(s0)
  }
})

test('경계값(lo, hi)은 허용', () => {
  const s0 = { ...initUpdown(() => 0.5), secret: 60, lo: 31, hi: 79 }
  expect(submitGuess(s0, '31', order).error).toBe(false)
  expect(submitGuess(s0, '79', order).error).toBe(false)
})

test('폭탄 숫자를 부르면 그 사람이 loser, 이후 입력 무시', () => {
  let s = { ...initUpdown(() => 0.5), secret: 60 }
  s = submitGuess(s, '10', order).state
  const r = submitGuess(s, '60', order)
  expect(r.state.phase).toBe('boom')
  expect(r.state.loser).toBe(order[1])
  expect(r.error).toBe(false)
  const again = submitGuess(r.state, '61', order)
  expect(again.state).toBe(r.state)
})

test('범위가 1개만 남으면 그 숫자가 폭탄이다', () => {
  let s = { ...initUpdown(() => 0.5), secret: 50 }
  s = submitGuess(s, '49', order).state
  s = submitGuess(s, '51', order).state
  expect(s.lo).toBe(50)
  expect(s.hi).toBe(50)
  expect(submitGuess(s, '50', order).state.loser).toBe(order[2])
})
