import type { Piece } from '../../domain/pieces'
import type { Rng } from '../../domain/rng'

export interface Point {
  x: number
  y: number
}

/** 논리 좌표(SVG viewBox). 1단위 = 1px로 그려진다 */
export const W = 320
export const H = 480
export const ROAD_W = 56
export const START_R = 32
const TOP = 52
const BOTTOM = H - 36

/** 한 걸음 최대 좌우 이동 */
const MAX_DX = 110
const TRIES = 40

/**
 * 위→아래 꾸불꾸불한 중심선. 시작·끝 + 꺾임점 8~10개, 좌우 흔들림은 rng.
 * 인접하지 않은 구간끼리는 길 폭 이상 떨어지도록 후보를 다시 뽑는다(지름길 방지).
 */
export function makePath(rng: Rng): Point[] {
  const bends = 8 + Math.min(2, Math.floor(rng() * 3))
  const n = bends + 2
  const lo = START_R
  const hi = W - START_R
  const ys = Array.from({ length: n }, (_, i) => TOP + ((BOTTOM - TOP) * i) / (n - 1))
  const pts: Point[] = [{ x: W / 2, y: ys[0] }]
  const gapOf = (i: number, c: Point) => {
    let g = Infinity
    for (let j = 0; j < i - 2; j++) g = Math.min(g, segSegDist(pts[i - 1], c, pts[j], pts[j + 1]))
    return g
  }
  // 막다른 길이면 되돌아가며 다시 뽑는다(깊이 우선, 호출 수 상한)
  let budget = 4000
  const build = (i: number): boolean => {
    if (i === n) return true
    for (let k = 0; k < TRIES && budget > 0; k++) {
      budget--
      const x = Math.max(lo, Math.min(hi, pts[i - 1].x + (rng() * 2 - 1) * MAX_DX))
      const c = { x, y: ys[i] }
      if (gapOf(i, c) < ROAD_W) continue
      pts[i] = c
      if (build(i + 1)) return true
    }
    pts.length = i
    return false
  }
  if (build(1)) return pts
  // 상한을 넘기면(드묾) 가장 덜 겹치는 후보로 채운다
  pts.length = 1
  for (let i = 1; i < n; i++) {
    let best = { x: pts[i - 1].x, y: ys[i] }
    let bestGap = -1
    for (let k = 0; k < TRIES; k++) {
      const x = Math.max(lo, Math.min(hi, pts[i - 1].x + (rng() * 2 - 1) * MAX_DX))
      const c = { x, y: ys[i] }
      const g = gapOf(i, c)
      if (g > bestGap) {
        best = c
        bestGap = g
      }
    }
    pts.push(best)
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

function ccw(a: Point, b: Point, c: Point): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
}

/** 두 선분 사이 최소 거리(교차하면 0) */
export function segSegDist(a: Point, b: Point, c: Point, d: Point): number {
  const d1 = ccw(a, b, c)
  const d2 = ccw(a, b, d)
  const d3 = ccw(c, d, a)
  const d4 = ccw(c, d, b)
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return 0
  return Math.min(distToSegment(a, c, d), distToSegment(b, c, d), distToSegment(c, a, b), distToSegment(d, a, b))
}

/** 현재 진행 지점 뒤로 허용하는 길이 */
const WINDOW_BACK = 24
/** 앞으로 허용하는 길이(한 번에 이 이상은 건너뛸 수 없다) */
const WINDOW_AHEAD = 60
/** 샘플 사이를 이 간격으로 쪼개 벽 통과를 잡는다 */
const STEP_PX = 8

/**
 * 진행 지점(maxProg) 근처 구간[뒤 24, 앞 60px]에서만 가장 가까운 중심선 지점을 찾는다.
 * 다른 팔(겹쳐 접힌 먼 구간)에 올라타도 진행이 인정되지 않는다.
 */
function nearestInWindow(p: Point, path: Point[], maxProg: number): { dist: number; arc: number } {
  const lo = maxProg - WINDOW_BACK
  const hi = maxProg + WINDOW_AHEAD
  let best = Infinity
  let bestArc = maxProg
  let c0 = 0
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]
    const b = path[i]
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    const c1 = c0 + len
    if (c1 >= lo && c0 <= hi && len > 0) {
      const t0 = Math.max(lo, c0)
      const t1 = Math.min(hi, c1)
      const pa = { x: a.x + ((b.x - a.x) * (t0 - c0)) / len, y: a.y + ((b.y - a.y) * (t0 - c0)) / len }
      const pb = { x: a.x + ((b.x - a.x) * (t1 - c0)) / len, y: a.y + ((b.y - a.y) * (t1 - c0)) / len }
      const pr = project(p, pa, pb)
      if (pr.dist < best) {
        best = pr.dist
        bestArc = t0 + pr.t * (t1 - t0)
      }
    }
    c0 = c1
  }
  return { dist: best, arc: bestArc }
}

export function inStartCircle(p: Point, path: Point[]): boolean {
  return Math.hypot(p.x - path[0].x, p.y - path[0].y) <= START_R
}

/** 시작 원 안이면서 길(진행 0 기준 구간) 안일 때만 시작할 수 있다 */
export function canStart(p: Point, path: Point[]): boolean {
  return inStartCircle(p, path) && nearestInWindow(p, path, 0).dist <= ROAD_W / 2
}

export interface SweepResult {
  ok: boolean
  /** 실패했다면 처음 길 밖으로 나간 지점 */
  failAt?: Point
  /** 지금까지의 최대 진행 거리 (줄어들지 않는다) */
  maxProg: number
  finished: boolean
}

/**
 * 이전 샘플(from)에서 현재 샘플(to)까지 8px 이하 간격으로 쪼개 검사한다.
 * 첫 길 밖 지점에서 실패, 도착선(끝점 y)에 길 안에서 닿으면 완주.
 */
export function sweep(path: Point[], maxProg: number, from: Point | null, to: Point): SweepResult {
  const total = totalLength(path)
  const end = path[path.length - 1]
  const dist = from ? Math.hypot(to.x - from.x, to.y - from.y) : 0
  const steps = Math.max(1, Math.ceil(dist / STEP_PX))
  let m = maxProg
  for (let k = 1; k <= steps; k++) {
    const q = from
      ? { x: from.x + ((to.x - from.x) * k) / steps, y: from.y + ((to.y - from.y) * k) / steps }
      : to
    const r = nearestInWindow(q, path, m)
    if (r.dist > ROAD_W / 2) return { ok: false, failAt: q, maxProg: m, finished: false }
    m = Math.max(m, r.arc)
    if (q.y >= end.y && r.arc >= total - STEP_PX) return { ok: true, maxProg: total, finished: true }
  }
  return { ok: true, maxProg: m, finished: false }
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
