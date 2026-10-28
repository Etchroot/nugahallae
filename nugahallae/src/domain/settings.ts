import { storageGet, storageSet } from '../platform/sdk'

export interface Settings {
  playerCount: number
}

export const DEFAULT_SETTINGS: Settings = { playerCount: 4 }
const SETTINGS_KEY = 'nugahallae:settings'

// 예전 저장값에 있던 penalty 같은 모르는 필드는 읽지 않고 버린다.
export function parseSettings(raw: string | null): Settings {
  if (raw === null) return { ...DEFAULT_SETTINGS }
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
  if (typeof data !== 'object' || data === null) return { ...DEFAULT_SETTINGS }
  const pc = (data as Record<string, unknown>).playerCount
  const playerCount =
    typeof pc === 'number' && Number.isInteger(pc) && pc >= 2 && pc <= 10
      ? pc
      : DEFAULT_SETTINGS.playerCount
  return { playerCount }
}

export async function loadSettings(): Promise<Settings> {
  return parseSettings(await storageGet(SETTINGS_KEY))
}

export async function saveSettings(s: Settings): Promise<void> {
  await storageSet(SETTINGS_KEY, JSON.stringify({ playerCount: s.playerCount }))
}
