import { test, expect } from 'vitest'
import {
  FUSE_MAX,
  FUSE_MIN,
  MAX_SWAPS,
  TOPICS,
  explode,
  ignite,
  initTopicBomb,
  passBomb,
  shakeSeconds,
  swapTopic,
} from '../logic'

const seq = (vals: number[]) => {
  let i = 0
  return () => vals[i++ % vals.length]
}

test('주제 목록은 지시서의 30개', () => {
  expect(TOPICS.length).toBe(30)
  expect(new Set(TOPICS).size).toBe(30)
  expect(TOPICS[0]).toBe('과일')
  expect(TOPICS[29]).toBe('놀이공원 시설')
})

test('주제는 목록 중 하나이고 같은 rng면 같다', () => {
  const a = initTopicBomb(seq([0.5, 0.5]))
  const b = initTopicBomb(seq([0.5, 0.5]))
  expect(a).toEqual(b)
  expect(TOPICS[a.topic]).toBeTruthy()
  expect(initTopicBomb(seq([0, 0])).topic).toBe(0)
  expect(initTopicBomb(seq([0.9999, 0])).topic).toBe(29)
})

test('심지 시간은 9~25초 범위', () => {
  expect(FUSE_MIN).toBe(9000)
  expect(FUSE_MAX).toBe(25000)
  expect(initTopicBomb(seq([0, 0])).fuse).toBe(9000)
  expect(initTopicBomb(seq([0, 0.9999999])).fuse).toBeLessThanOrEqual(25000)
  expect(initTopicBomb(seq([0, 0.9999999])).fuse).toBeGreaterThan(24990)
  for (let i = 0; i < 50; i++) {
    const f = initTopicBomb(seq([Math.random(), Math.random()])).fuse
    expect(f).toBeGreaterThanOrEqual(9000)
    expect(f).toBeLessThanOrEqual(25000)
  }
})

test('주제 바꾸기: 시작 전에만, 최대 3번, 항상 다른 주제', () => {
  let s = initTopicBomb(seq([0, 0]))
  const fuse = s.fuse
  for (let n = 1; n <= MAX_SWAPS; n++) {
    const prev = s.topic
    s = swapTopic(s, seq([0.4]))
    expect(s.topic).not.toBe(prev)
    expect(s.swaps).toBe(n)
  }
  expect(MAX_SWAPS).toBe(3)
  const blocked = swapTopic(s, seq([0.4]))
  expect(blocked).toBe(s)
  expect(s.fuse).toBe(fuse) // 심지는 그대로
  const lit = ignite(initTopicBomb(seq([0, 0])))
  expect(swapTopic(lit, () => 0.4)).toBe(lit)
})

test('바꾸기는 모든 주제를 고를 수 있고 현재 주제는 뺀다', () => {
  const s = initTopicBomb(seq([0, 0])) // 과일(0)
  expect(swapTopic(s, () => 0).topic).toBe(1)
  expect(swapTopic(s, () => 0.9999).topic).toBe(29)
  const t = { ...s, topic: 29 }
  expect(swapTopic(t, () => 0.9999).topic).toBe(28)
  expect(swapTopic(t, () => 0).topic).toBe(0)
})

test('불 붙이기 → 넘기기로 차례 순환 → 터지면 들고 있던 사람', () => {
  let s = ignite(initTopicBomb(seq([0, 0])))
  expect(s.phase).toBe('lit')
  expect(ignite(s)).toBe(s)
  s = passBomb(s, 3)
  s = passBomb(s, 3)
  s = passBomb(s, 3)
  expect(s.idx).toBe(0) // 3명이면 세 번 넘기고 한 바퀴
  s = passBomb(s, 3)
  expect(s.idx).toBe(1)
  const e = explode(s, 3)
  expect(e.phase).toBe('exploded')
  expect(e.loserIdx).toBe(1)
  expect(passBomb(e, 3)).toBe(e)
  expect(explode(e, 3)).toBe(e)
})

test('시작 전에는 넘길 수도 터질 수도 없다', () => {
  const s = initTopicBomb(seq([0, 0]))
  expect(passBomb(s, 3)).toBe(s)
  expect(explode(s, 3)).toBe(s)
})

test('흔들림은 빨라지다가 심지의 75% 이후로는 더 빨라지지 않는다(심지 길이를 짐작 못 하게)', () => {
  expect(shakeSeconds(0, 10000)).toBeGreaterThan(shakeSeconds(2000, 10000))
  expect(shakeSeconds(2000, 10000)).toBeGreaterThan(shakeSeconds(5000, 10000))
  expect(shakeSeconds(7500, 10000)).toBe(shakeSeconds(9999, 10000))
  expect(shakeSeconds(7500, 10000)).toBeGreaterThanOrEqual(0.08)
  // 선형이 아니다: 중간 지점에서 이미 절반 넘게 빨라져 있다
  const full = shakeSeconds(0, 10000) - shakeSeconds(7500, 10000)
  expect(shakeSeconds(0, 10000) - shakeSeconds(3750, 10000)).toBeGreaterThan(full * 0.6)
})
