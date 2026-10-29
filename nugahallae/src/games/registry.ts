import type { GameDefinition } from './types'
import { collectDefinitions } from './collect'

// 모든 게임은 src/games/<id>/definition.ts(export default)로 등록되고, 아래에서 자동으로 모인다. 자세한 건 README.md.
// 홈 목록 순서는 definition의 order(작은 수가 먼저), 같으면 id 알파벳순이다.
const collected = collectDefinitions(
  import.meta.glob('./*/definition.ts', { eager: true }) as Record<string, { default?: GameDefinition }>,
)

export const GAMES: GameDefinition[] = collected

export function findGame(id: string): GameDefinition | undefined {
  return GAMES.find((g) => g.id === id)
}
