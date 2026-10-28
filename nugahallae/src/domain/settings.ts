import { storageGet, storageSet } from '../platform/sdk'

export interface Settings {
  playerCount: number
  penalty: string
}

export const DEFAULT_SETTINGS: Settings = { playerCount: 4, penalty: '' }
export const PENALTY_MAX = 20
const SETTINGS_KEY = 'nugahallae:settings'

export function normalizePenalty(raw: string): string {
  return raw.trim().slice(0, PENALTY_MAX)
}

export function parseSettings(raw: string | null): Settings {
  if (raw === null) return { ...DEFAULT_SETTINGS }
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
  if (typeof data !== 'object' || data === null) return { ...DEFAULT_SETTINGS }
  const o = data as Record<string, unknown>
  const pc = o.playerCount
  const playerCount =
    typeof pc === 'number' && Number.isInteger(pc) && pc >= 2 && pc <= 10
      ? pc
      : DEFAULT_SETTINGS.playerCount
  const penalty =
    typeof o.penalty === 'string' ? normalizePenalty(o.penalty) : DEFAULT_SETTINGS.penalty
  return { playerCount, penalty }
}

export async function loadSettings(): Promise<Settings> {
  return parseSettings(await storageGet(SETTINGS_KEY))
}

export async function saveSettings(s: Settings): Promise<void> {
  await storageSet(
    SETTINGS_KEY,
    JSON.stringify({ playerCount: s.playerCount, penalty: normalizePenalty(s.penalty) }),
  )
}
