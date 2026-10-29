import type { ComponentType } from 'react'
import type { Piece } from '../domain/pieces'

export interface GameProps {
  order: Piece[]
  onFinish: (loser: Piece) => void
}

export interface GameDefinition {
  id: string
  icon: string
  title: string
  summary: string
  rule: string
  /** 홈 카드 아이콘 타일 배경색 (없으면 연회색) */
  tint?: string
  badge?: '인기' | 'NEW'
  /** 홈 목록 순서: 작은 수가 먼저. 없으면 뒤쪽에 id 알파벳순 */
  order?: number
  /** 준비 화면 인원 범위. 기본 2~10명 */
  minPlayers?: number
  maxPlayers?: number
  /** 'auto'면 준비 화면에서 말 고르기를 건너뛰고 말을 무작위로 배정한다 (기본 'pick') */
  pieceMode?: 'pick' | 'auto'
  Component: ComponentType<GameProps>
}
