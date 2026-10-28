import type { Piece } from '../../domain/pieces'
import type { Rng } from '../../domain/rng'

export const MIN = 1
export const MAX = 100

export interface GuessRecord {
  piece: Piece
  n: number
}

export interface UpdownState {
  /** 폭탄 숫자. 화면에 보이지 않는다 */
  secret: number
  lo: number
  hi: number
  turn: number
  history: GuessRecord[]
  hint: 'up' | 'down' | null
  phase: 'playing' | 'boom'
  loser: Piece | null
}

export function initUpdown(rng: Rng): UpdownState {
  return {
    secret: Math.min(MAX, MIN + Math.floor(rng() * (MAX - MIN + 1))),
    lo: MIN,
    hi: MAX,
    turn: 0,
    history: [],
    hint: null,
    phase: 'playing',
    loser: null,
  }
}

/** 숫자(0~9)만으로 된 문자열만 숫자로 읽는다. 아니면 null */
export function parseGuess(text: string): number | null {
  const t = text.trim()
  if (!/^\d+$/.test(t)) return null
  return Number(t)
}

export interface SubmitResult {
  state: UpdownState
  /** 입력이 잘못됨(상태 불변) */
  error: boolean
}

export function submitGuess(s: UpdownState, text: string, order: Piece[]): SubmitResult {
  if (s.phase !== 'playing') return { state: s, error: false }
  const n = parseGuess(text)
  if (n === null || n < s.lo || n > s.hi) return { state: s, error: true }
  const piece = order[s.turn % order.length]
  const history = [...s.history, { piece, n }]
  if (n === s.secret) {
    return { state: { ...s, history, phase: 'boom', loser: piece, hint: null }, error: false }
  }
  const up = n < s.secret
  return {
    state: {
      ...s,
      history,
      lo: up ? n + 1 : s.lo,
      hi: up ? s.hi : n - 1,
      hint: up ? 'up' : 'down',
      turn: (s.turn + 1) % order.length,
    },
    error: false,
  }
}
