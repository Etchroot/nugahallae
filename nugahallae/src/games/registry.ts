import type { GameDefinition } from './types'

export const GAMES: GameDefinition[] = []

export function findGame(id: string): GameDefinition | undefined {
  return GAMES.find((g) => g.id === id)
}
