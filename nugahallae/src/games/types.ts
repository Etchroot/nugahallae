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
  Component: ComponentType<GameProps>
}
