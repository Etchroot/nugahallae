import type { Piece } from '../../domain/pieces'
import type { Rng } from '../../domain/rng'

export const SENTENCES: readonly string[] = [
  '간장 공장 공장장은 강 공장장이고 된장 공장 공장장은 공 공장장이다.',
  '저기 저 콩깍지는 깐 콩깍지인가 안 깐 콩깍지인가.',
  '내가 그린 기린 그림은 목이 긴 기린 그림이고 네가 그린 기린 그림은 목이 짧은 기린 그림이다.',
  '철수 책상 철 책상, 영희 책상 철 책상.',
  '경찰청 철창살은 외철창살이고 검찰청 철창살은 쌍철창살이다.',
  '서울특별시 특허허가과 허가과장 허과장.',
  '앞집 팥죽은 붉은 팥 풋팥죽이고 뒷집 콩죽은 햇콩 단콩 콩죽이다.',
  '저 분은 박 법학박사이고 이 분은 백 법학박사이다.',
  '한국관광공사 곽진관 관광과장.',
  '안 촉촉한 초코칩 나라에 살던 안 촉촉한 초코칩은 촉촉한 초코칩 나라의 촉촉한 초코칩을 부러워했다.',
]

/** 틀린 기록의 점수(어떤 성공 시간보다 나쁘다) */
export const WRONG_SCORE = 1000

export interface TwisterRecord {
  piece: Piece
  ok: boolean
  timeSec: number
}

/** 판마다 한 번, 모두 같은 문장 */
export function pickSentence(rng: Rng): string {
  const i = Math.min(SENTENCES.length - 1, Math.max(0, Math.floor(rng() * SENTENCES.length)))
  return SENTENCES[i]
}

export function makeRecord(piece: Piece, ok: boolean, rawSec: number): TwisterRecord {
  return { piece, ok, timeSec: Math.round(rawSec * 100) / 100 }
}

export function scoreOf(r: TwisterRecord): number {
  return r.ok ? r.timeSec : WRONG_SCORE
}

export function recordText(r: TwisterRecord): string {
  return r.ok ? `${r.timeSec.toFixed(2)}초` : '틀림'
}

export function whyText(r: TwisterRecord): string {
  return r.ok ? `${r.timeSec.toFixed(2)}초로 가장 느렸어요` : '틀렸어요'
}
