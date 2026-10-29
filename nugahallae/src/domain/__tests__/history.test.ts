import { test, expect, describe, vi, beforeEach } from 'vitest'

const store = vi.hoisted(() => new Map<string, string>())
vi.mock('../../platform/sdk', () => ({
  storageGet: async (k: string) => store.get(k) ?? null,
  storageSet: async (k: string, v: string) => {
    store.set(k, v)
  },
}))

import { EMPTY_HISTORY, parseHistory, recordPlay, loadHistory, saveHistory } from '../history'
import { GAMES } from '../../games/registry'

const ids = GAMES.map((g) => g.id)

beforeEach(() => store.clear())

describe('parseHistory', () => {
  test('null·깨진 JSON·잘못된 형태는 빈 기록', () => {
    expect(parseHistory(null)).toEqual(EMPTY_HISTORY)
    expect(parseHistory('{oops')).toEqual(EMPTY_HISTORY)
    expect(parseHistory('123')).toEqual(EMPTY_HISTORY)
    expect(parseHistory('{"recent":"x","plays":[]}')).toEqual(EMPTY_HISTORY)
  })
  test('정상 값은 그대로, 모르는 게임 id는 걸러낸다', () => {
    const raw = JSON.stringify({ recent: [ids[1], 'ghost', ids[0]], plays: { [ids[0]]: 3, ghost: 9, [ids[1]]: -1 } })
    expect(parseHistory(raw)).toEqual({ recent: [ids[1], ids[0]], plays: { [ids[0]]: 3 } })
  })
  test('recent는 중복 제거 후 최대 5개', () => {
    const raw = JSON.stringify({ recent: [ids[0], ids[0], ...ids.slice(1, 8)], plays: {} })
    const h = parseHistory(raw)
    expect(h.recent).toHaveLength(5)
    expect(new Set(h.recent).size).toBe(5)
  })
})

describe('recordPlay', () => {
  test('최신순, 중복 제거, 최대 5개, 횟수 누적', () => {
    let h = EMPTY_HISTORY
    for (const id of ids.slice(0, 6)) h = recordPlay(h, id)
    expect(h.recent).toEqual(ids.slice(0, 6).reverse().slice(0, 5))
    h = recordPlay(h, ids[3])
    expect(h.recent[0]).toBe(ids[3])
    expect(h.recent.filter((x) => x === ids[3])).toHaveLength(1)
    expect(h.plays[ids[3]]).toBe(2)
  })
  test('원본을 바꾸지 않는다', () => {
    const h = recordPlay(EMPTY_HISTORY, ids[0])
    expect(EMPTY_HISTORY.recent).toEqual([])
    expect(h).not.toBe(EMPTY_HISTORY)
  })
})

test('save/load 왕복', async () => {
  const h = recordPlay(recordPlay(EMPTY_HISTORY, ids[0]), ids[1])
  await saveHistory(h)
  expect(store.has('nugahallae:history')).toBe(true)
  await expect(loadHistory()).resolves.toEqual(h)
})
