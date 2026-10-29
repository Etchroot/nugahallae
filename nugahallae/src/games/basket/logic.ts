import type { Piece } from '../../domain/pieces'
import type { Rng } from '../../domain/rng'

/** 논리 좌표(viewBox) */
export const W = 320
export const H = 520
export const BALL_D = 28
export const BALL_X = W / 2
export const BALL_Y = 380
export const BASKET_Y = 90
/** 중력(px/s^2), 당김 → 속도 배율, 가로 감쇠(같은 당김이 착지점을 덜 흔들게), 최대·최소 당김 거리 */
export const G = 2000
export const K = 12
export const H_DAMP = 0.3
export const MAX_PULL = 110
export const MIN_PULL = 24
/** 공의 가장자리 기준 판정: 입구 반폭에 공 반지름의 절반을 더해 준다 */
export const EDGE_TOL = BALL_D / 4
export const THROWS = 3

export interface Basket {
  x: number
  width: number
}
export interface Launch {
  vx: number
  vy: number
}
export interface Resolved {
  success: boolean
  /** 바구니 높이를 내려가며 지나는 시각(초). 못 닿으면 null */
  tCross: number | null
  crossX: number | null
  /** 비행이 끝나는 시각(초) */
  tEnd: number
}
export interface BasketRecord {
  piece: Piece
  made: number
}

/** 판마다 한 번 정한다. 모든 사람이 같은 바구니 */
export function pickBasket(rng: Rng): Basket {
  const x = W * (0.2 + 0.6 * rng())
  const width = BALL_D * (2.2 + 0.8 * rng())
  return { x, width }
}

/** 당김 길이를 MAX_PULL로 제한(방향 유지). 그리기와 던지기가 같은 값을 쓴다 */
export function clampPull(dx: number, dy: number): { dx: number; dy: number } {
  const len = Math.hypot(dx, dy)
  if (len <= MAX_PULL) return { dx, dy }
  return { dx: (dx * MAX_PULL) / len, dy: (dy * MAX_PULL) / len }
}

/** 당긴 벡터(dx, dy: 공 기준, 아래쪽이 +dy) → 초기 속도. 던지기가 아니면 null */
export function launchOf(dx: number, dy: number): Launch | null {
  if (dy <= 0) return null
  if (Math.hypot(dx, dy) < MIN_PULL) return null
  const c = clampPull(dx, dy)
  return { vx: -c.dx * K * H_DAMP, vy: c.dy * K }
}

/** 시각 t(초)의 공 위치. 프레임과 무관한 해석식 */
export function positionAt(l: Launch, t: number): { x: number; y: number } {
  return { x: BALL_X + l.vx * t, y: BALL_Y - l.vy * t + 0.5 * G * t * t }
}

export function resolveThrow(l: Launch, basket: Basket): Resolved {
  const dh = BALL_Y - BASKET_Y
  const disc = l.vy * l.vy - 2 * G * dh
  if (disc < 0) {
    return { success: false, tCross: null, crossX: null, tEnd: (2 * l.vy) / G }
  }
  const tCross = (l.vy + Math.sqrt(disc)) / G
  const crossX = BALL_X + l.vx * tCross
  return {
    success: Math.abs(crossX - basket.x) <= basket.width / 2 + EDGE_TOL,
    tCross,
    crossX,
    tEnd: tCross,
  }
}

export function flightAnimMs(tEnd: number): number {
  return Math.min(900, Math.max(600, Math.round(tEnd * 1000)))
}

export function makeRecord(piece: Piece, made: number): BasketRecord {
  return { piece, made }
}
export function recordText(r: BasketRecord): string {
  return `${r.made}/${THROWS}`
}
export function whyText(r: BasketRecord): string {
  return `${r.made}개 넣었어요`
}
