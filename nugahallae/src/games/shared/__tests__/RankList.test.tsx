import { test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { drawPieces, pieceLabel } from '../../../domain/pieces'
import { RankList } from '../RankList'

const p = drawPieces(3, () => 0.5)

test('기록 순서대로 보여 주고 맨 아래만 빨간 강조 클래스', () => {
  render(<RankList rows={[{ piece: p[0], text: '1회' }, { piece: p[1], text: '2회' }, { piece: p[2], text: '3회' }]} />)
  const items = screen.getAllByRole('listitem')
  expect(items.map((li) => li.textContent)).toEqual([
    `${pieceLabel(p[0])}1회`,
    `${pieceLabel(p[1])}2회`,
    `${pieceLabel(p[2])}3회`,
  ])
  expect(items[2].className).toContain('rg-lose')
  expect(items[0].className).not.toContain('rg-lose')
})
