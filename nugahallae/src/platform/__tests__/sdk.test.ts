import { test, expect, describe, vi, beforeEach, afterEach } from 'vitest'

const m = vi.hoisted(() => ({
  generateHapticFeedback: vi.fn(),
  getItem: vi.fn(),
  setItem: vi.fn(),
  addEventListener: vi.fn(),
  closeView: vi.fn(),
}))

vi.mock('@apps-in-toss/web-framework', () => ({
  generateHapticFeedback: m.generateHapticFeedback,
  Storage: { getItem: m.getItem, setItem: m.setItem },
  graniteEvent: { addEventListener: m.addEventListener },
  closeView: m.closeView,
}))

import { haptic, storageGet, storageSet, onBack, closeApp } from '../sdk'

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})
afterEach(() => vi.restoreAllMocks())

describe('haptic', () => {
  test('SDK에 type을 전달한다', async () => {
    m.generateHapticFeedback.mockResolvedValue(undefined)
    await haptic('success')
    expect(m.generateHapticFeedback).toHaveBeenCalledWith({ type: 'success' })
  })
  test('SDK가 reject해도 throw하지 않는다', async () => {
    m.generateHapticFeedback.mockRejectedValue(new Error('x'))
    await expect(haptic('tap')).resolves.toBeUndefined()
  })
  test('SDK가 동기 throw해도 throw하지 않는다', async () => {
    m.generateHapticFeedback.mockImplementation(() => { throw new Error('x') })
    await expect(haptic('error')).resolves.toBeUndefined()
  })
})

describe('storage', () => {
  test('SDK 값이 있으면 SDK 값을 쓴다', async () => {
    m.getItem.mockResolvedValue('sdk')
    expect(await storageGet('k')).toBe('sdk')
  })
  test('storageGet: SDK가 throw하면 localStorage 값을 쓴다', async () => {
    m.getItem.mockRejectedValue(new Error('x'))
    localStorage.setItem('k', 'local')
    expect(await storageGet('k')).toBe('local')
  })
  test('storageGet: SDK·localStorage 모두 throw해도 null을 반환하고 throw하지 않는다', async () => {
    m.getItem.mockRejectedValue(new Error('x'))
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('y') })
    await expect(storageGet('k')).resolves.toBeNull()
  })
  test('storageSet: SDK 실패 시 localStorage에 저장', async () => {
    m.setItem.mockRejectedValue(new Error('x'))
    await storageSet('k', 'v')
    expect(localStorage.getItem('k')).toBe('v')
  })
  test('storageSet: 모두 실패해도 throw하지 않는다', async () => {
    m.setItem.mockRejectedValue(new Error('x'))
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('y') })
    await expect(storageSet('k', 'v')).resolves.toBeUndefined()
  })
})

describe('onBack', () => {
  test('backEvent를 구독하고 해제 함수를 반환한다', () => {
    const unsub = vi.fn()
    m.addEventListener.mockReturnValue(unsub)
    const handler = vi.fn()
    const off = onBack(handler)
    expect(m.addEventListener).toHaveBeenCalledWith('backEvent', expect.objectContaining({ onEvent: handler }))
    off()
    expect(unsub).toHaveBeenCalled()
  })
  test('구독이 throw해도 no-op 해제 함수를 반환한다', () => {
    m.addEventListener.mockImplementation(() => { throw new Error('x') })
    const off = onBack(() => {})
    expect(() => off()).not.toThrow()
  })
  test('해제 함수가 throw해도 throw하지 않는다', () => {
    m.addEventListener.mockReturnValue(() => { throw new Error('x') })
    expect(() => onBack(() => {})()).not.toThrow()
  })
})

describe('closeApp', () => {
  test('closeView를 호출한다', () => {
    m.closeView.mockResolvedValue(undefined)
    closeApp()
    expect(m.closeView).toHaveBeenCalled()
  })
  test('reject/throw해도 throw하지 않는다', async () => {
    m.closeView.mockRejectedValue(new Error('x'))
    expect(() => closeApp()).not.toThrow()
    m.closeView.mockImplementation(() => { throw new Error('x') })
    expect(() => closeApp()).not.toThrow()
    await Promise.resolve()
  })
})
