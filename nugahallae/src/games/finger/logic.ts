import type { Rng } from '../../domain/rng'

export type FingerPhase = 'waiting' | 'armed' | 'spinning' | 'done'

/** 인원수만큼 손가락이 모인 뒤 빛이 돌기 시작하기까지 */
export const ARM_MS = 1000
/** 빛이 손가락을 도는 시간(마지막에 멈춤) */
export const SPIN_MS = 2000

export interface FingerState {
  phase: FingerPhase
  /** 인원수 */
  n: number
  /** 게임에 참여한 pointerId, 터치한 순서(= order 인덱스) */
  fingers: number[]
  /** 인원 초과로 무시 중인 pointerId */
  ignored: number[]
  /** pointerId → 말 번호(order 인덱스). 손가락이 떠 있는 동안 고정 */
  slots: Record<number, number>
  /** 걸린 손가락의 fingers 위치 (spinning/done) — 하이라이트 순환용 */
  target: number | null
  /** 걸린 손가락의 말 번호 = loser는 order[targetSlot] */
  targetSlot: number | null
}

export function initFinger(n: number): FingerState {
  return { phase: 'waiting', n, fingers: [], ignored: [], slots: {}, target: null, targetSlot: null }
}

export function addFinger(s: FingerState, id: number): FingerState {
  if (s.phase === 'done') return s
  if (s.fingers.includes(id) || s.ignored.includes(id)) return s
  if (s.fingers.length >= s.n) return { ...s, ignored: [...s.ignored, id] }
  const fingers = [...s.fingers, id]
  const used = new Set(Object.values(s.slots))
  let slot = 0
  while (used.has(slot)) slot++
  return {
    ...s,
    fingers,
    slots: { ...s.slots, [id]: slot },
    phase: fingers.length === s.n ? 'armed' : 'waiting',
  }
}

export function removeFinger(s: FingerState, id: number): FingerState {
  if (s.phase === 'done') return s
  if (s.ignored.includes(id)) return { ...s, ignored: s.ignored.filter((x) => x !== id) }
  if (!s.fingers.includes(id)) return s
  const { [id]: _freed, ...slots } = s.slots
  void _freed
  return {
    ...s,
    fingers: s.fingers.filter((x) => x !== id),
    slots,
    phase: 'waiting',
    target: null,
    targetSlot: null,
  }
}

export function startSpin(s: FingerState, rng: Rng): FingerState {
  if (s.phase !== 'armed') return s
  const target = Math.floor(rng() * s.n)
  return { ...s, phase: 'spinning', target, targetSlot: s.slots[s.fingers[target]] }
}

export function finishSpin(s: FingerState): FingerState {
  return s.phase === 'spinning' ? { ...s, phase: 'done' } : s
}

/**
 * 하이라이트 순환 일정: 인덱스는 0부터 한 칸씩 돌고 마지막은 target, 마지막 시각은 SPIN_MS.
 * 처음엔 빠르고 끝으로 갈수록 간격이 늘어난다.
 */
export function spinSchedule(n: number, target: number): { index: number; at: number }[] {
  const total = n * 3 + target
  const steps: { index: number; at: number }[] = []
  for (let k = 0; k <= total; k++) {
    const at = k === total ? SPIN_MS : Math.round(SPIN_MS * (1 - Math.sqrt(1 - k / total)))
    steps.push({ index: k % n, at })
  }
  return steps
}
