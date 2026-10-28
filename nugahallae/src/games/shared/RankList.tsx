import type { Piece } from '../../domain/pieces'
import { pieceLabel } from '../../domain/pieces'

export interface RankRow {
  piece: Piece
  /** 기록 문구 (예: 7.31초 (±0.31)) */
  text: string
}

/** 순서 기록형 게임 결과 목록. 맨 아래(가장 나쁜 기록)를 빨간색으로 강조한다 */
export function RankList({ rows }: { rows: RankRow[] }) {
  return (
    <div className="rg-rank-wrap">
      <h3 className="rg-rank-title">결과</h3>
      <ol className="rg-rank">
        {rows.map((r, i) => (
          <li key={r.piece.id} className={i === rows.length - 1 ? 'rg-lose' : undefined}>
            <span>{pieceLabel(r.piece)}</span>
            <b>{r.text}</b>
          </li>
        ))}
      </ol>
    </div>
  )
}
