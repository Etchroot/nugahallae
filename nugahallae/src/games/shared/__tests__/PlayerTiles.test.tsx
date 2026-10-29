import { test, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { drawPieces, pieceLabel } from '../../../domain/pieces'
import { PlayerTiles } from '../PlayerTiles'

const order = drawPieces(4, () => 0.5)

// jsdom에는 PointerEvent가 없어 pointerId를 직접 실은 이벤트를 쓴다.
function ev(type: string, pointerId: number): Event {
  const e = new Event(type, { bubbles: true, cancelable: true })
  Object.assign(e, { pointerId, pointerType: 'touch' })
  return e
}
const tile = (i: number) => screen.getByRole('button', { name: pieceLabel(order[i]) })

test('인원수만큼 칸이 있고 색·동물 글자와 상태 슬롯이 보인다', () => {
  render(<PlayerTiles order={order} onTileDown={() => {}} renderStatus={(i) => <b>상태{i}</b>} />)
  expect(screen.getAllByRole('button')).toHaveLength(4)
  expect(screen.getByText(`${order[2].colorName} ${order[2].animalName}`)).toBeTruthy()
  expect(screen.getByText('상태3')).toBeTruthy()
})

test('2명과 10명도 그린다', () => {
  const { rerender } = render(<PlayerTiles order={drawPieces(2, () => 0)} onTileDown={() => {}} />)
  expect(screen.getAllByRole('button')).toHaveLength(2)
  rerender(<PlayerTiles order={drawPieces(10, () => 0)} onTileDown={() => {}} />)
  expect(screen.getAllByRole('button')).toHaveLength(10)
})

test('동시에 서로 다른 칸에 pointerdown 두 개가 각각 전달되고 at은 pointerdown 시점의 now', () => {
  const onTileDown = vi.fn()
  let t = 1000
  render(<PlayerTiles order={order} onTileDown={onTileDown} now={() => t} />)
  fireEvent(tile(0), ev('pointerdown', 1))
  t = 1003
  fireEvent(tile(2), ev('pointerdown', 2))
  expect(onTileDown).toHaveBeenCalledTimes(2)
  expect(onTileDown).toHaveBeenNthCalledWith(1, 0, 1000)
  expect(onTileDown).toHaveBeenNthCalledWith(2, 2, 1003)
})

test('같은 포인터가 칸 사이를 미끄러져도 처음 누른 칸만 인정한다', () => {
  const onTileDown = vi.fn()
  render(<PlayerTiles order={order} onTileDown={onTileDown} />)
  fireEvent(tile(0), ev('pointerdown', 1))
  fireEvent(tile(1), ev('pointerdown', 1)) // 떼지 않은 같은 포인터가 다른 칸에 내려옴
  expect(onTileDown).toHaveBeenCalledTimes(1)
  expect(onTileDown).toHaveBeenCalledWith(0, expect.any(Number))
  fireEvent(tile(0), ev('pointerup', 1))
  fireEvent(tile(1), ev('pointerdown', 1))
  expect(onTileDown).toHaveBeenCalledTimes(2)
})

test('pointercancel 뒤에는 같은 포인터가 다시 누를 수 있다', () => {
  const onTileDown = vi.fn()
  render(<PlayerTiles order={order} onTileDown={onTileDown} />)
  fireEvent(tile(0), ev('pointerdown', 5))
  fireEvent(tile(0), ev('pointercancel', 5))
  fireEvent(tile(0), ev('pointerdown', 5))
  expect(onTileDown).toHaveBeenCalledTimes(2)
})

test('비활성 칸은 무시하고 aria-disabled를 단다', () => {
  const onTileDown = vi.fn()
  render(<PlayerTiles order={order} onTileDown={onTileDown} disabled={(i) => i === 1} />)
  fireEvent(tile(1), ev('pointerdown', 1))
  fireEvent.keyDown(tile(1), { key: 'Enter' })
  expect(onTileDown).not.toHaveBeenCalled()
  expect(tile(1).getAttribute('aria-disabled')).toBe('true')
  expect(tile(0).getAttribute('aria-disabled')).toBe('false')
})

test('키보드 Enter/Space로 누르고 길게 눌러 반복되는 키는 무시한다', () => {
  const onTileDown = vi.fn()
  render(<PlayerTiles order={order} onTileDown={onTileDown} now={() => 42} />)
  fireEvent.keyDown(tile(3), { key: 'Enter' })
  fireEvent.keyDown(tile(3), { key: ' ' })
  fireEvent.keyDown(tile(3), { key: 'Enter', repeat: true })
  fireEvent.keyDown(tile(3), { key: 'a' })
  expect(onTileDown).toHaveBeenCalledTimes(2)
  expect(onTileDown).toHaveBeenCalledWith(3, 42)
})
