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
  Component: ComponentType<GameProps>
}
