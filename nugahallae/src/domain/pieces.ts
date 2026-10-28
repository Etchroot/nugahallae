import { defaultRng } from './rng'
import type { Rng } from './rng'

export interface Piece {
  id: string
  emoji: string
  animalName: string
  colorName: string
  color: string
}

export const PIECES: readonly Piece[] = [
  { id: 'fox', emoji: '🦊', colorName: '주황', animalName: '여우', color: '#FF7A1A' },
  { id: 'penguin', emoji: '🐧', colorName: '파란', animalName: '펭귄', color: '#3182F6' },
  { id: 'frog', emoji: '🐸', colorName: '초록', animalName: '개구리', color: '#03B26C' },
  { id: 'chick', emoji: '🐥', colorName: '노란', animalName: '병아리', color: '#FFC342' },
  { id: 'pig', emoji: '🐷', colorName: '분홍', animalName: '돼지', color: '#F472B6' },
  { id: 'bear', emoji: '🐻', colorName: '갈색', animalName: '곰', color: '#A0643C' },
  { id: 'rabbit', emoji: '🐰', colorName: '하늘', animalName: '토끼', color: '#38BDF8' },
  { id: 'tiger', emoji: '🐯', colorName: '빨간', animalName: '호랑이', color: '#F04452' },
  { id: 'unicorn', emoji: '🦄', colorName: '보라', animalName: '유니콘', color: '#8B5CF6' },
  { id: 'panda', emoji: '🐼', colorName: '회색', animalName: '판다', color: '#6B7684' },
]

export function drawPieces(count: number, rng: Rng = defaultRng): Piece[] {
  if (!Number.isInteger(count) || count < 2 || count > PIECES.length) {
    throw new RangeError(`count must be an integer between 2 and ${PIECES.length}`)
  }
  const pool = [...PIECES]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count)
}

export function pieceLabel(p: Piece): string {
  return `${p.emoji} ${p.colorName} ${p.animalName}`
}
