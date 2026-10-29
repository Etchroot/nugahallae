import type { GameDefinition } from './types'

// import.meta.glob(게임 폴더별 definition.ts, eager) 결과에서 게임 정의를 모아 id 알파벳순으로 돌려준다.
export function collectDefinitions(modules: Record<string, { default?: GameDefinition }>): GameDefinition[] {
  const defs: GameDefinition[] = []
  for (const mod of Object.values(modules)) {
    if (mod && mod.default) defs.push(mod.default)
  }
  return defs.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}
