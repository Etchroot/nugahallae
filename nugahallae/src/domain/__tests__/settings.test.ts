import { test, expect, describe, vi, beforeEach } from 'vitest'

vi.mock('../../platform/sdk', () => ({
  storageGet: vi.fn(),
  storageSet: vi.fn(),
}))

import { storageGet, storageSet } from '../../platform/sdk'
import {
  DEFAULT_SETTINGS,
  parseSettings,
  loadSettings,
  saveSettings,
} from '../settings'

describe('parseSettings', () => {
  test('parseSettings(null) → DEFAULT_SETTINGS', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(DEFAULT_SETTINGS).toEqual({ playerCount: 4 })
  })
  test('parseSettings("{깨진") → DEFAULT_SETTINGS', () => {
    expect(parseSettings('{깨진')).toEqual(DEFAULT_SETTINGS)
  })
  test('parseSettings 인원 1, 99, 3.5, "4" → 기본 4', () => {
    for (const v of ['1', '99', '3.5', '"4"']) {
      expect(parseSettings(`{"playerCount":${v}}`).playerCount).toBe(4)
    }
  })
  test('옛 데이터(penalty 포함)는 penalty를 무시한다', () => {
    expect(parseSettings('{"playerCount":7,"penalty":"커피"}')).toEqual({ playerCount: 7 })
  })
  test('parseSettings 누락 필드는 기본값', () => {
    expect(parseSettings('{}')).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings('null')).toEqual(DEFAULT_SETTINGS)
  })
})

describe('load/saveSettings', () => {
  beforeEach(() => vi.clearAllMocks())
  test('loadSettings는 키 nugahallae:settings를 읽는다', async () => {
    vi.mocked(storageGet).mockResolvedValue('{"playerCount":5,"penalty":"x"}')
    expect(await loadSettings()).toEqual({ playerCount: 5 })
    expect(storageGet).toHaveBeenCalledWith('nugahallae:settings')
  })
  test('saveSettings는 playerCount만 JSON으로 저장한다', async () => {
    await saveSettings({ playerCount: 5 })
    expect(storageSet).toHaveBeenCalledWith('nugahallae:settings', JSON.stringify({ playerCount: 5 }))
  })
})
