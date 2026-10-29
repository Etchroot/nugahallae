import type { Rng } from '../../domain/rng'

/** 서로 다른 두 사람의 pointerdown 시간차가 이 값 이하면 겹침 */
export const OVERLAP_MS = 250
export const COUNT_STEP_MS = 700

export interface Press {
  index: number
  at: number
}

export type Verdict =
  | { kind: 'overlap'; loser: number; group: number[] }
  | { kind: 'last'; loser: number }

/** 같은 사람의 두 번째 이후 기록은 버린다(시각순 유지). */
function firstPresses(presses: Press[]): Press[] {
  const seen = new Set<number>()
  const out: Press[] = []
  for (const p of [...presses].sort((a, b) => a.at - b.at)) {
    if (seen.has(p.index)) continue
    seen.add(p.index)
    out.push(p)
  }
  return out
}

/** 시각순으로 이웃한 간격이 thresholdMs 이하로 이어진 묶음 중 먼저 생긴(2명 이상) 묶음. 없으면 null */
export function findOverlapGroup(presses: Press[], thresholdMs = OVERLAP_MS): number[] | null {
  const sorted = firstPresses(presses)
  let run: Press[] = []
  for (const p of sorted) {
    if (run.length > 0 && p.at - run[run.length - 1].at > thresholdMs) {
      if (run.length >= 2) break
      run = []
    }
    run.push(p)
  }
  return run.length >= 2 ? run.map((p) => p.index) : null
}

export function pickOne<T>(items: T[], rng: Rng): T {
  return items[Math.min(items.length - 1, Math.floor(rng() * items.length))]
}

/**
 * 겹침이 있으면 겹친 묶음 중 rng로 한 명, 겹침 없이 n-1명이 눌렀으면 남은 한 명.
 * 아직 가려지지 않았으면 null.
 */
export function judge(presses: Press[], n: number, rng: Rng): Verdict | null {
  const group = findOverlapGroup(presses)
  if (group) return { kind: 'overlap', loser: pickOne(group, rng), group }
  const pressed = new Set(presses.map((p) => p.index))
  if (pressed.size >= n - 1 && pressed.size < n) {
    for (let i = 0; i < n; i++) if (!pressed.has(i)) return { kind: 'last', loser: i }
  }
  return null
}
