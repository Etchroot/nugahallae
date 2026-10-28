import { test, expect, describe, vi, beforeEach } from 'vitest'

vi.mock('../../platform/sdk', () => ({
  storageGet: vi.fn(),
  storageSet: vi.fn(),
}))

import { storageGet, storageSet } from '../../platform/sdk'
import {
  DEFAULT_SETTINGS,
  PENALTY_MAX,
  normalizePenalty,
  parseSettings,
  loadSettings,
  saveSettings,
} from '../settings'

describe('parseSettings', () => {
  test('parseSettings(null) → DEFAULT_SETTINGS', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS)
  })
  test('parseSettings("{깨진") → DEFAULT_SETTINGS', () => {
    expect(parseSettings('{깨진')).toEqual(DEFAULT_SETTINGS)
  })
  test('parseSettings 인원 1, 99, 3.5, "4" → 기본 4', () => {
    for (const v of ['1', '99', '3.5', '"4"']) {
      expect(parseSettings(`{"playerCount":${v},"penalty":"a"}`).playerCount).toBe(4)
    }
  })
  test('parseSettings 정상값 유지', () => {
    expect(parseSettings('{"playerCount":7,"penalty":"커피 사기"}')).toEqual({
      playerCount: 7,
      penalty: '커피 사기',
    })
  })
  test('parseSettings 누락/타입 오류 필드는 해당 필드만 기본값', () => {
    expect(parseSettings('{"playerCount":6}')).toEqual({ playerCount: 6, penalty: '' })
    expect(parseSettings('{"penalty":5,"playerCount":3}')).toEqual({ playerCount: 3, penalty: '' })
    expect(parseSettings('null')).toEqual(DEFAULT_SETTINGS)
  })
  test('parseSettings 긴 벌칙은 정규화된다', () => {
    const r = parseSettings(JSON.stringify({ playerCount: 3, penalty: 'ㄱ'.repeat(30) }))
    expect(r.penalty).toHaveLength(PENALTY_MAX)
  })
})

describe('normalizePenalty', () => {
  test('공백/trim/20자 제한', () => {
    expect(normalizePenalty('   ')).toBe('')
    expect(normalizePenalty('  설거지 ')).toBe('설거지')
    expect(normalizePenalty('가'.repeat(30))).toBe('가'.repeat(20))
  })
})

describe('load/saveSettings', () => {
  beforeEach(() => vi.clearAllMocks())
  test('loadSettings는 키 nugahallae:settings를 읽는다', async () => {
    vi.mocked(storageGet).mockResolvedValue('{"playerCount":5,"penalty":"x"}')
    expect(await loadSettings()).toEqual({ playerCount: 5, penalty: 'x' })
    expect(storageGet).toHaveBeenCalledWith('nugahallae:settings')
  })
  test('saveSettings는 정규화해서 JSON으로 저장한다', async () => {
    await saveSettings({ playerCount: 5, penalty: '  ab ' })
    expect(storageSet).toHaveBeenCalledWith(
      'nugahallae:settings',
      JSON.stringify({ playerCount: 5, penalty: 'ab' }),
    )
  })
})
