import { test, expect } from 'vitest'
import { drawPieces } from '../../../domain/pieces'
import { TEETH, initCroc, pressTooth, currentPlayer } from '../logic'

const order = drawPieces(3, () => 0.5)

test('이빨은 12개, 함정은 rng로 0~11', () => {
  expect(TEETH).toBe(12)
  expect(initCroc(() => 0).trap).toBe(0)
  expect(initCroc(() => 0.999).trap).toBe(11)
  expect(initCroc(() => 0.5).trap).toBe(6)
})

test('안전한 이빨을 누르면 눌림 표시 + 차례가 순환한다', () => {
  let s = initCroc(() => 0)
  s = pressTooth(s, 5, order)
  expect(s.pressed[5]).toBe(true)
  expect(s.turn).toBe(1)
  s = pressTooth(s, 6, order)
  s = pressTooth(s, 7, order)
  expect(s.turn).toBe(0)
  expect(currentPlayer(s, order)).toBe(order[0])
})

test('이미 누른 이빨은 다시 못 누른다', () => {
  let s = initCroc(() => 0)
  s = pressTooth(s, 5, order)
  expect(pressTooth(s, 5, order)).toBe(s)
})

test('함정을 누르면 그 차례 사람이 loser, 이후 입력 무시', () => {
  let s = initCroc(() => 0.5)
  s = pressTooth(s, 0, order)
  s = pressTooth(s, 6, order)
  expect(s.phase).toBe('bitten')
  expect(s.loser).toBe(order[1])
  expect(pressTooth(s, 1, order)).toBe(s)
})

test('범위 밖 인덱스는 무시', () => {
  const s = initCroc(() => 0)
  expect(pressTooth(s, -1, order)).toBe(s)
  expect(pressTooth(s, 12, order)).toBe(s)
})
