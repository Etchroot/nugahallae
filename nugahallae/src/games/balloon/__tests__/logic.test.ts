import { test, expect } from 'vitest'
import { drawPieces } from '../../../domain/pieces'
import { MAX_PUMP, initBalloon, pump, passTurn, canPass, canPump, balloonScale } from '../logic'

const three = drawPieces(3, () => 0.5)

test('터지는 지점은 4 ~ 6+인원*3 (rng)', () => {
  expect(initBalloon(() => 0, 3).pop).toBe(4)
  expect(initBalloon(() => 0.999, 3).pop).toBe(15)
  expect(initBalloon(() => 0.999, 2).pop).toBe(12)
  expect(initBalloon(() => 0.999, 10).pop).toBe(36)
})

test('차례당 최대 3번, 4번째는 무시', () => {
  expect(MAX_PUMP).toBe(3)
  let s = initBalloon(() => 0.999, 3)
  for (let i = 0; i < 3; i++) s = pump(s, three)
  expect(s.mine).toBe(3)
  expect(canPump(s)).toBe(false)
  expect(pump(s, three)).toBe(s)
})

test('최소 1번 펌프해야 넘기기', () => {
  let s = initBalloon(() => 0.999, 3)
  expect(canPass(s)).toBe(false)
  expect(passTurn(s, three)).toBe(s)
  s = pump(s, three)
  expect(canPass(s)).toBe(true)
  s = passTurn(s, three)
  expect(s.turn).toBe(1)
  expect(s.mine).toBe(0)
  expect(s.total).toBe(1)
})

test('차례는 순환한다', () => {
  let s = initBalloon(() => 0.999, 3)
  for (let i = 0; i < 3; i++) s = passTurn(pump(s, three), three)
  expect(s.turn).toBe(0)
})

test('pop 지점에 도달하면 펌프한 사람이 loser, 이후 입력 무시', () => {
  let s = initBalloon(() => 0, 3) // pop 4
  s = passTurn(pump(pump(s, three), three), three) // total 2, turn1
  s = pump(s, three) // 3
  s = pump(s, three) // 4 -> pop
  expect(s.phase).toBe('popped')
  expect(s.loser).toBe(three[1])
  expect(pump(s, three)).toBe(s)
  expect(passTurn(s, three)).toBe(s)
  expect(canPass(s)).toBe(false)
  expect(canPump(s)).toBe(false)
})

test('풍선 크기는 커지고 2.6에서 멈춘다', () => {
  expect(balloonScale(0)).toBe(1)
  expect(balloonScale(5)).toBeCloseTo(1.45)
  expect(balloonScale(100)).toBe(2.6)
})
