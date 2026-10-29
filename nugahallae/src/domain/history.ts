import { storageGet, storageSet } from '../platform/sdk'
import { GAMES } from '../games/registry'

export interface History {
  /** 최근 한 게임 id, 최신순, 중복 없음, 최대 5개 */
  recent: string[]
  plays: Record<string, number>
}

export const EMPTY_HISTORY: History = { recent: [], plays: {} }
const HISTORY_KEY = 'nugahallae:history'
const MAX_RECENT = 5

export function parseHistory(raw: string | null): History {
  if (raw === null) return { recent: [], plays: {} }
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return { recent: [], plays: {} }
  }
  if (typeof data !== 'object' || data === null) return { recent: [], plays: {} }
  const { recent, plays } = data as Record<string, unknown>
  if (!Array.isArray(recent) || typeof plays !== 'object' || plays === null || Array.isArray(plays))
    return { recent: [], plays: {} }
  const known = new Set(GAMES.map((g) => g.id))
  const outRecent: string[] = []
  for (const id of recent) {
    if (typeof id === 'string' && known.has(id) && !outRecent.includes(id)) outRecent.push(id)
  }
  const outPlays: Record<string, number> = {}
  for (const [id, n] of Object.entries(plays as Record<string, unknown>)) {
    if (known.has(id) && typeof n === 'number' && Number.isInteger(n) && n > 0) outPlays[id] = n
  }
  return { recent: outRecent.slice(0, MAX_RECENT), plays: outPlays }
}

export function recordPlay(h: History, gameId: string): History {
  return {
    recent: [gameId, ...h.recent.filter((id) => id !== gameId)].slice(0, MAX_RECENT),
    plays: { ...h.plays, [gameId]: (h.plays[gameId] ?? 0) + 1 },
  }
}

export async function loadHistory(): Promise<History> {
  return parseHistory(await storageGet(HISTORY_KEY))
}

export async function saveHistory(h: History): Promise<void> {
  await storageSet(HISTORY_KEY, JSON.stringify(h))
}
