import type { Piece } from '../../domain/pieces'
import type { Rng } from '../../domain/rng'

export interface Point {
  x: number
  y: number
}

/** 논리 좌표(SVG viewBox). 1단위 = 1px로 그려진다 */
export const W = 320
export const H = 400
export const ROAD_W = 56
export const START_R = 32
const TOP = 52
const BOTTOM = H - 36

/** 위→아래 꾸불꾸불한 중심선. 시작·끝 + 꺾임점 8~10개, 좌우 흔들림은 rng */
export function makePath(rng: Rng): Point[] {
  const bends = 8 + Math.min(2, Math.floor(rng() * 3))
  const n = bends + 2
  const lo = START_R
  const hi = W - START_R
  const pts: Point[] = []
  for (let i = 0; i < n; i++) {
    const y = TOP + ((BOTTOM - TOP) * i) / (n - 1)
    const x = i === 0 ? W / 2 : lo + rng() * (hi - lo)
    pts.push({ x, y })
  }
  return pts
}

export function totalLength(path: Point[]): number {
  let sum = 0
  for (let i = 1; i < path.length; i++) sum += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y)
  return sum
}

function project(p: Point, a: Point, b: Point): { t: number; dist: number } {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2))
  return { t, dist: Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)) }
}

export function distToSegment(p: Point, a: Point, b: Point): number {
  return project(p, a, b).dist
}

export function distToPath(p: Point, path: Point[]): number {
  let best = Infinity
  for (let i = 1; i < path.length; i++) best = Math.min(best, distToSegment(p, path[i - 1], path[i]))
  return best
}

export function isInsideRoad(p: Point, path: Point[]): boolean {
  return distToPath(p, path) <= ROAD_W / 2
}

/** 중심선에 투영한 시작점부터의 거리 */
export function progressDist(p: Point, path: Point[]): number {
  let best = Infinity
  let at = 0
  let acc = 0
  for (let i = 1; i < path.length; i++) {
    const seg = Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y)
    const pr = project(p, path[i - 1], path[i])
    if (pr.dist < best) {
      best = pr.dist
      at = acc + pr.t * seg
    }
    acc += seg
  }
  return at
}

/** 최대 진행 거리는 줄어들지 않는다 */
export function nextMaxProgress(prev: number, cur: number): number {
  return Math.max(prev, cur)
}

export function inStartCircle(p: Point, path: Point[]): boolean {
  return Math.hypot(p.x - path[0].x, p.y - path[0].y) <= START_R
}

/** 도착선(끝점의 y)에 길 안에서 닿으면 완주 */
export function reachedFinish(p: Point, path: Point[]): boolean {
  const end = path[path.length - 1]
  return p.y >= end.y && isInsideRoad(p, path)
}

export function traceScore(progress: number, timeSec: number | null): number {
  if (progress < 1 || timeSec === null) return progress * 1000
  return 1000 + (100 - Math.min(timeSec, 99.9))
}

export interface TraceRecord {
  piece: Piece
  /** 0~1. 미완주는 표시 퍼센트(내림, 최대 99)에 맞춰 둔다 */
  progress: number
  /** 완주 시 걸린 시간(초), 아니면 null */
  timeSec: number | null
  trail: Point[]
  failAt: Point | null
}

export function makeRecord(
  piece: Piece,
  r: { progress: number; timeSec: number | null; trail?: Point[]; failAt?: Point | null },
): TraceRecord {
  const finished = r.timeSec !== null && r.progress >= 1
  const pct = Math.min(99, Math.floor(r.progress * 100))
  return {
    piece,
    progress: finished ? 1 : pct / 100,
    timeSec: finished ? r.timeSec : null,
    trail: r.trail ?? [],
    failAt: r.failAt ?? null,
  }
}

export function recordText(r: TraceRecord): string {
  return r.timeSec !== null ? `완주 ${r.timeSec.toFixed(2)}초` : `${Math.round(r.progress * 100)}%`
}

export function whyText(r: TraceRecord): string {
  return r.timeSec !== null ? '가장 느렸어요' : `${Math.round(r.progress * 100)}%에서 멈췄어요`
}
