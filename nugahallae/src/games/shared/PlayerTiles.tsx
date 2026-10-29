import { useRef } from 'react'
import type { KeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { pieceLabel } from '../../domain/pieces'
import type { Piece } from '../../domain/pieces'
import './player-tiles.css'

export interface PlayerTilesProps {
  order: Piece[]
  /** at: pointerdown 시점의 now() (키보드는 keydown 시점) */
  onTileDown: (index: number, at: number) => void
  renderStatus?: (index: number) => ReactNode
  disabled?: (index: number) => boolean
  now?: () => number
}

function columnsFor(n: number): number {
  if (n <= 4) return 2
  if (n <= 9) return 3
  return 4
}

/**
 * 둘러앉아 각자 자기 말 칸을 누르는 게임의 공용 칸 그리드.
 * pointerId별로 추적해 여러 손가락이 동시에 서로 다른 칸을 눌러도 각각 처리하고,
 * 같은 포인터는 뗄 때까지 처음 누른 칸만 인정한다.
 */
export function PlayerTiles({
  order,
  onTileDown,
  renderStatus,
  disabled,
  now = () => performance.now(),
}: PlayerTilesProps) {
  const active = useRef(new Map<number, number>())
  const cbRef = useRef({ onTileDown, now })
  cbRef.current = { onTileDown, now }

  const down = (e: ReactPointerEvent<HTMLButtonElement>, i: number) => {
    e.preventDefault()
    const at = cbRef.current.now()
    if (active.current.has(e.pointerId)) return
    active.current.set(e.pointerId, i)
    if (disabled?.(i)) return
    cbRef.current.onTileDown(i, at)
  }
  const release = (e: ReactPointerEvent<HTMLElement>) => {
    active.current.delete(e.pointerId)
  }
  const key = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    if (e.repeat || disabled?.(i)) return
    cbRef.current.onTileDown(i, cbRef.current.now())
  }

  return (
    <div
      className="pt-grid"
      style={{ gridTemplateColumns: `repeat(${columnsFor(order.length)}, minmax(0, 1fr))` }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(e) => e.preventDefault()}
    >
      {order.map((piece, i) => {
        const off = disabled?.(i) ?? false
        return (
          <button
            key={piece.id}
            type="button"
            className={'pt-tile' + (off ? ' pt-off' : '')}
            aria-label={pieceLabel(piece)}
            aria-disabled={off}
            style={{ borderColor: piece.color, background: `${piece.color}26` }}
            onPointerDown={(e) => down(e, i)}
            onKeyDown={(e) => key(e, i)}
          >
            <span className="pt-emoji" aria-hidden="true">
              {piece.emoji}
            </span>
            <span className="pt-name">
              {piece.colorName} {piece.animalName}
            </span>
            <span className="pt-status">{renderStatus?.(i)}</span>
          </button>
        )
      })}
    </div>
  )
}
