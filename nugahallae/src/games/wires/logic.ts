import type { Rng } from '../../domain/rng'

export const TURN_MS = 8000
export const MAX_WIRES = 12

export type Pattern = 'solid' | 'dashed' | 'striped'

export interface WireSpec {
  number: number
  colorName: string
  color: string
  pattern: Pattern
  patternName: string
}

const COLORS: { name: string; color: string }[] = [
  { name: '빨강', color: '#e03131' },
  { name: '파랑', color: '#1c7ed6' },
  { name: '초록', color: '#2f9e44' },
  { name: '주황', color: '#e8590c' },
  { name: '보라', color: '#7048e8' },
  { name: '분홍', color: '#d6336c' },
  { name: '청록', color: '#0c8599' },
  { name: '갈색', color: '#8d5524' },
  { name: '회색', color: '#6b7684' },
  { name: '검정', color: '#212529' },
  { name: '연두', color: '#66a80f' },
  { name: '남색', color: '#364fc7' },
]
const PATTERNS: { p: Pattern; name: string }[] = [
  { p: 'solid', name: '실선' },
  { p: 'dashed', name: '점선' },
  { p: 'striped', name: '줄무늬' },
]

export function wireCount(players: number): number {
  return Math.min(MAX_WIRES, players + 3)
}

export function wireSpecs(count: number): WireSpec[] {
  return Array.from({ length: count }, (_, i) => ({
    number: i + 1,
    colorName: COLORS[i].name,
    color: COLORS[i].color,
    pattern: PATTERNS[i % 3].p,
    patternName: PATTERNS[i % 3].name,
  }))
}

export interface WiresState {
  players: number
  count: number
  /** 틀린 전선 번호(0부터). 화면에 보이지 않는다 */
  bad: number
  cut: boolean[]
  idx: number
  phase: 'ready' | 'running' | 'over'
  loserIdx: number | null
  reason: 'boom' | 'timeout' | null
}

export function initWires(players: number, rng: Rng): WiresState {
  const count = wireCount(players)
  return {
    players,
    count,
    bad: Math.min(count - 1, Math.floor(rng() * count)),
    cut: Array.from({ length: count }, () => false),
    idx: 0,
    phase: 'ready',
    loserIdx: null,
    reason: null,
  }
}

export function startTurn(s: WiresState): WiresState {
  return s.phase === 'ready' ? { ...s, phase: 'running' } : s
}

export function cancelTurn(s: WiresState): WiresState {
  return s.phase === 'running' ? { ...s, phase: 'ready' } : s
}

export type CutResult = 'safe' | 'boom' | 'timeout' | 'ignored'

/** elapsed: 이번 차례 시작 후 경과 ms. TURN_MS 이상이면 자르기 전에 시간 초과로 끝난다 */
export function cutWire(
  s: WiresState,
  wire: number,
  elapsed: number,
): { state: WiresState; result: CutResult } {
  if (s.phase !== 'running' || wire < 0 || wire >= s.count || s.cut[wire])
    return { state: s, result: 'ignored' }
  const who = s.idx % s.players
  if (elapsed >= TURN_MS)
    return { state: { ...s, phase: 'over', loserIdx: who, reason: 'timeout' }, result: 'timeout' }
  if (wire === s.bad)
    return { state: { ...s, phase: 'over', loserIdx: who, reason: 'boom' }, result: 'boom' }
  const cut = s.cut.slice()
  cut[wire] = true
  return { state: { ...s, cut, idx: s.idx + 1, phase: 'ready' }, result: 'safe' }
}

/** 타이머가 시간 초과를 감지했을 때 */
export function expire(s: WiresState): WiresState {
  if (s.phase !== 'running') return s
  return { ...s, phase: 'over', loserIdx: s.idx % s.players, reason: 'timeout' }
}
