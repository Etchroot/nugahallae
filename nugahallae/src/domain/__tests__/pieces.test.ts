import { test, expect, describe } from 'vitest'
import { PIECES, drawPieces, pieceLabel } from '../pieces'
import type { Rng } from '../rng'

const seq = (values: number[]): Rng => {
  let i = 0
  return () => values[i++ % values.length]
}

describe('pieces', () => {
  test('PIECES는 10개이고 id·color·animalName·colorName이 모두 서로 다르다', () => {
    expect(PIECES).toHaveLength(10)
    for (const key of ['id', 'color', 'animalName', 'colorName'] as const) {
      expect(new Set(PIECES.map((p) => p[key])).size).toBe(10)
    }
  })

  test('drawPieces(4)는 서로 다른 말 4개를 반환한다', () => {
    expect(new Set(drawPieces(4).map((p) => p.id)).size).toBe(4)
  })

  test('drawPieces는 rng가 같으면 같은 순서를 낸다', () => {
    const values = [0.12, 0.85, 0.5, 0.33, 0.99, 0.01, 0.7, 0.45, 0.2]
    const a = drawPieces(5, seq(values)).map((p) => p.id)
    const b = drawPieces(5, seq(values)).map((p) => p.id)
    expect(a).toEqual(b)
  })

  test('drawPieces(10)은 10개 전부를 포함한다', () => {
    expect(new Set(drawPieces(10).map((p) => p.id))).toEqual(new Set(PIECES.map((p) => p.id)))
  })

  test('drawPieces는 2 미만·10 초과·정수 아님에 RangeError', () => {
    expect(() => drawPieces(1)).toThrow(RangeError)
    expect(() => drawPieces(11)).toThrow(RangeError)
    expect(() => drawPieces(2.5)).toThrow(RangeError)
  })

  test('pieceLabel', () => {
    expect(pieceLabel(PIECES[0])).toBe('🦊 주황 여우')
  })
})
