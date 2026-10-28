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
  /** 'auto'면 준비 화면에서 말 고르기를 건너뛰고 말을 무작위로 배정한다 (기본 'pick') */
  pieceMode?: 'pick' | 'auto'
  Component: ComponentType<GameProps>
}
