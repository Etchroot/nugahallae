import type { Piece } from '../../domain/pieces'
import type { Rng } from '../../domain/rng'

export const PENALTY_MS = 1000
export const COUNT_STEP_MS = 700
export const SHAKE_MS = 200
export const PENALTY_FLASH_MS = 600
/** 문제 전환 직후 입력 무시 시간 */
export const INPUT_LOCK_MS = 120
export const QUESTION_COUNT = 10
/** 뜻과 색이 같은 문제의 비율 */
const SAME_RATE = 0.25

export interface InkColor {
  id: string
  name: string
  hex: string
}

/** 색약을 고려해 초록은 뺀 4색. 답 버튼 배치 순서이기도 하다 */
export const COLORS: InkColor[] = [
  { id: 'red', name: '빨강', hex: '#F04452' },
  { id: 'blue', name: '파랑', hex: '#3182F6' },
  { id: 'yellow', name: '노랑', hex: '#FFC342' },
  { id: 'purple', name: '보라', hex: '#8B5CF6' },
]

export interface Question {
  /** 화면에 쓰인 글자가 뜻하는 색 */
  word: string
  /** 글자를 칠한 실제 색(정답) */
  ink: string
}

const pick = (n: number, rng: Rng) => Math.min(n - 1, Math.floor(rng() * n))

export function makeQuestions(rng: Rng, count = QUESTION_COUNT): Question[] {
  const out: Question[] = []
  for (let i = 0; i < count; i++) {
    const same = rng() < SAME_RATE
    const word = COLORS[pick(COLORS.length, rng)]
    if (same) {
      out.push({ word: word.id, ink: word.id })
    } else {
      const others = COLORS.filter((c) => c.id !== word.id)
      out.push({ word: word.id, ink: others[pick(others.length, rng)].id })
    }
  }
  return out
}

export interface ColorRecord {
  piece: Piece
  ms: number
  k: number
}

export function makeRecord(piece: Piece, elapsedMs: number, mistakes: number): ColorRecord {
  return { piece, ms: Math.round(elapsedMs) + mistakes * PENALTY_MS, k: mistakes }
}

const secText = (ms: number) => `${(Math.round(ms / 10) / 100).toFixed(2)}초`

export function recordText(r: ColorRecord): string {
  return r.k > 0 ? `${secText(r.ms)} (실수 ${r.k})` : secText(r.ms)
}

export function whyText(r: ColorRecord): string {
  return `${secText(r.ms)}로 가장 느렸어요`
}
