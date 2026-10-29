import { test, expect, describe } from 'vitest'
import { drawPieces } from '../../../domain/pieces'
import {
  BALL_D, BALL_X, BALL_Y, BASKET_Y, EDGE_TOL, G, H_DAMP, K, MAX_PULL, MIN_PULL, THROWS, W,
  clampPull, flightAnimMs, launchOf, makeRecord, pickBasket, positionAt, recordText, resolveThrow, whyText,
} from '../logic'

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

describe('pickBasket', () => {
  test('x는 화면 폭의 20~80%, 입구 폭은 공 지름의 2.2~3.0배', () => {
    for (const r of [0, 0.25, 0.5, 0.999999]) {
      const b = pickBasket(() => r)
      expect(b.x).toBeGreaterThanOrEqual(W * 0.2 - 1e-9)
      expect(b.x).toBeLessThanOrEqual(W * 0.8 + 1e-9)
      expect(b.width).toBeGreaterThanOrEqual(BALL_D * 2.2 - 1e-9)
      expect(b.width).toBeLessThanOrEqual(BALL_D * 3.0 + 1e-9)
    }
  })
  test('끝값: rng 0이면 최소, 1에 가까우면 최대', () => {
    expect(pickBasket(() => 0)).toEqual({ x: W * 0.2, width: BALL_D * 2.2 })
    const hi = pickBasket(() => 0.9999999)
    expect(hi.x).toBeCloseTo(W * 0.8, 3)
    expect(hi.width).toBeCloseTo(BALL_D * 3.0, 3)
  })
  test('같은 rng면 같은 바구니(모두 같은 값)', () => {
    expect(pickBasket(seeded(5))).toEqual(pickBasket(seeded(5)))
    expect(pickBasket(seeded(5))).not.toEqual(pickBasket(seeded(6)))
  })
})

describe('launchOf', () => {
  test('수평 속도 = -dx*K*H_DAMP(감쇠), 수직 속도 = dy*K', () => {
    const l = launchOf(-5, 100)!
    expect(l.vx).toBeCloseTo(5 * K * H_DAMP)
    expect(l.vy).toBeCloseTo(100 * K)
  })
  test('최소 당김 미만이면 던지기가 아니다(null)', () => {
    expect(launchOf(0, MIN_PULL - 0.5)).toBeNull()
    expect(launchOf(0, MIN_PULL)).not.toBeNull()
  })
  test('위로 미는 동작(dy <= 0)은 던지기가 아니다', () => {
    expect(launchOf(0, -80)).toBeNull()
    expect(launchOf(80, 0)).toBeNull()
  })
  test('당김 길이는 MAX_PULL로 제한(방향 유지), 그리기와 같은 값', () => {
    const c = clampPull(-100, 300)
    expect(Math.hypot(c.dx, c.dy)).toBeCloseTo(MAX_PULL)
    expect(c.dx / c.dy).toBeCloseTo(-100 / 300)
    const l = launchOf(-100, 300)!
    expect(l.vy).toBeCloseTo(c.dy * K)
    expect(l.vx).toBeCloseTo(-c.dx * K * H_DAMP)
    expect(clampPull(3, 4)).toEqual({ dx: 3, dy: 4 })
  })
})

describe('비행 해석식', () => {
  test('시간 t의 함수: x = x0 + vx t, y = y0 - vy t + g t^2 / 2', () => {
    const l = launchOf(-5, 100)!
    const p = positionAt(l, 0.3)
    expect(p.x).toBeCloseTo(BALL_X + l.vx * 0.3)
    expect(p.y).toBeCloseTo(BALL_Y - l.vy * 0.3 + 0.5 * G * 0.09)
    expect(positionAt(l, 0)).toEqual({ x: BALL_X, y: BALL_Y })
  })
  test('바구니 높이를 내려가며 지나는 시각과 그때의 x', () => {
    const l = launchOf(-5, 100)!
    const r = resolveThrow(l, { x: 0, width: 10 })
    expect(r.tCross).not.toBeNull()
    const t = r.tCross as number
    const p = positionAt(l, t)
    expect(p.y).toBeCloseTo(BASKET_Y, 6)
    expect(-l.vy + G * t).toBeGreaterThan(0)
    expect(r.crossX).toBeCloseTo(p.x, 6)
  })
  test('바구니 높이에 못 닿으면 실패(crossX null)', () => {
    const l = launchOf(0, MIN_PULL + 5)!
    const r = resolveThrow(l, { x: BALL_X, width: 80 })
    expect(r.crossX).toBeNull()
    expect(r.success).toBe(false)
    expect(r.tEnd).toBeGreaterThan(0)
  })
  test('입구 경계: |x - basketX| <= 폭/2 이면 성공', () => {
    const l = launchOf(-5, 100)!
    const cx = resolveThrow(l, { x: 0, width: 10 }).crossX as number
    const w = 80
    const h = w / 2 + EDGE_TOL // 공 가장자리까지 봐 준다
    expect(resolveThrow(l, { x: cx + h, width: w }).success).toBe(true)
    expect(resolveThrow(l, { x: cx + h - 1e-6, width: w }).success).toBe(true)
    expect(resolveThrow(l, { x: cx + h + 0.01, width: w }).success).toBe(false)
    expect(resolveThrow(l, { x: cx - h - 0.01, width: w }).success).toBe(false)
    expect(resolveThrow(l, { x: cx, width: w }).success).toBe(true)
  })
  test('비행 시간(애니메이션)은 600~900ms로 맞춘다', () => {
    expect(flightAnimMs(0.2)).toBe(600)
    expect(flightAnimMs(0.75)).toBe(750)
    expect(flightAnimMs(3)).toBe(900)
  })
  test('정면으로 세게 당기면 바구니 높이에 닿는다', () => {
    const l = launchOf(0, 110)!
    expect(resolveThrow(l, { x: BALL_X, width: BALL_D * 2.2 }).success).toBe(true)
  })
})

describe('기록', () => {
  const [a] = drawPieces(2, () => 0.5)
  test('{n}/3 문구와 연출 문구', () => {
    expect(THROWS).toBe(3)
    const r = makeRecord(a, 2)
    expect(recordText(r)).toBe('2/3')
    expect(whyText(r)).toBe('2개 넣었어요')
    expect(whyText(makeRecord(a, 0))).toBe('0개 넣었어요')
  })
})

describe('조준 허용 범위(수치 스윕)', () => {
  const widths = [0, 1, 2, 3, 4].map((i) => BALL_D * (2.2 + 0.2 * i))
  const xs = Array.from({ length: 13 }, (_, i) => W * (0.2 + (0.6 * i) / 12))

  test('모든 바구니가 닿을 수 있고, 보통 당김(dy=100)에서 성공 구간이 당김 x 기준 24px 이상', () => {
    for (const x of xs)
      for (const width of widths) {
        const basket = { x, width }
        let reachable = false
        for (let dy = 1; dy <= MAX_PULL && !reachable; dy += 1)
          for (let dx = -MAX_PULL; dx <= MAX_PULL; dx += 1) {
            const l = launchOf(dx, dy)
            if (l && resolveThrow(l, basket).success) {
              reachable = true
              break
            }
          }
        expect(reachable, `닿지 않음 x=${x} w=${width}`).toBe(true)
        let n = 0
        for (let dx = -MAX_PULL; dx <= MAX_PULL; dx += 0.25) {
          const l = launchOf(dx, 100)
          if (l && resolveThrow(l, basket).success) n++
        }
        expect(n * 0.25, `성공 구간 x=${x} w=${width}`).toBeGreaterThanOrEqual(24)
      }
  })

  test('바구니 높이에 닿는 무작위 당김의 8% 이상이 성공한다(모든 구성)', () => {
    for (const x of [xs[0], xs[3], xs[6], xs[9], xs[12]])
      for (const width of [widths[0], widths[2], widths[4]]) {
        let valid = 0
        let ok = 0
        for (let dy = 1; dy <= MAX_PULL; dy += 1)
          for (let dx = -MAX_PULL; dx <= MAX_PULL; dx += 1) {
            const l = launchOf(dx, dy)
            if (!l) continue
            const r = resolveThrow(l, { x, width })
            if (r.crossX === null) continue
            valid++
            if (r.success) ok++
          }
        expect(ok / valid, `성공률 x=${x} w=${width}`).toBeGreaterThanOrEqual(0.08)
      }
  })
})
