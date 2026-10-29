import { test, expect, describe, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({ getAnonymousKey: vi.fn() }))
vi.mock('@apps-in-toss/web-framework', () => ({
  generateHapticFeedback: vi.fn(),
  Storage: { getItem: vi.fn(), setItem: vi.fn() },
  graniteEvent: { addEventListener: vi.fn() },
  closeView: vi.fn(),
  User: { getAnonymousKey: m.getAnonymousKey },
}))

import { getUserKey, resetUserKeyForTest } from '../sdk'

beforeEach(() => {
  vi.clearAllMocks()
  resetUserKeyForTest()
})

describe('getUserKey', () => {
  test('HASH 응답이면 hash를 돌려준다', async () => {
    m.getAnonymousKey.mockResolvedValue({ type: 'HASH', hash: 'abc123' })
    await expect(getUserKey()).resolves.toBe('abc123')
  })
  test('throw(미지원 버전·오류)하면 null, 재시도하지 않는다', async () => {
    m.getAnonymousKey.mockRejectedValue(new Error('UNSUPPORTED_APP_VERSION'))
    await expect(getUserKey()).resolves.toBeNull()
    expect(m.getAnonymousKey).toHaveBeenCalledTimes(1)
  })
  test('동기 throw도 null', async () => {
    m.getAnonymousKey.mockImplementation(() => {
      throw new Error('x')
    })
    await expect(getUserKey()).resolves.toBeNull()
  })
  test('예상 밖 응답은 null', async () => {
    m.getAnonymousKey.mockResolvedValue({ type: 'OTHER' })
    await expect(getUserKey()).resolves.toBeNull()
    m.getAnonymousKey.mockResolvedValue(undefined)
    resetUserKeyForTest()
    await expect(getUserKey()).resolves.toBeNull()
  })
  test('여러 번 불러도 SDK는 한 번만 호출한다(StrictMode 이중 호출 방지)', async () => {
    m.getAnonymousKey.mockResolvedValue({ type: 'HASH', hash: 'k' })
    const [a, b] = await Promise.all([getUserKey(), getUserKey()])
    expect(a).toBe('k')
    expect(b).toBe('k')
    await getUserKey()
    expect(m.getAnonymousKey).toHaveBeenCalledTimes(1)
  })
})
