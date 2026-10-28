export const COUNT_STEP_MS = 700
/** 시작 탭 후 연타 시작까지(3·2·1) */
export const GO_AT_MS = 2100
export const DURATION_MS = 5000

export interface RoundState {
  phase: 'idle' | 'count' | 'go' | 'done'
  count: number
}

export function initRound(): RoundState {
  return { phase: 'idle', count: 0 }
}

export function startCountdown(s: RoundState): RoundState {
  return s.phase === 'idle' ? { ...s, phase: 'count' } : s
}

export function beginGo(s: RoundState): RoundState {
  return s.phase === 'count' ? { ...s, phase: 'go' } : s
}

/** 연타 중일 때만 탭을 센다(카운트다운·종료 후는 무시) */
export function tapPad(s: RoundState): RoundState {
  return s.phase === 'go' ? { ...s, count: s.count + 1 } : s
}

export function endRound(s: RoundState): RoundState {
  return s.phase === 'go' ? { ...s, phase: 'done' } : s
}

export function recordText(n: number): string {
  return `${n}회`
}

export function whyText(n: number): string {
  return `5초 동안 ${n}번밖에 못 눌렀어요 🐌`
}
