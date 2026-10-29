import { beforeEach, expect, test, vi } from 'vitest'

const { initialize, attachBannerFn } = vi.hoisted(() => ({
  initialize: Object.assign(vi.fn(), { isSupported: vi.fn(() => true) }),
  attachBannerFn: Object.assign(vi.fn(), { isSupported: vi.fn(() => true) }),
}))
vi.mock('@apps-in-toss/web-framework', () => ({
  TossAds: { initialize, attachBanner: attachBannerFn },
}))

import { adsSupported, attachBanner, initAds, resetAdsForTest } from '../ads'

const supported = (init: boolean, attach: boolean) => {
  vi.mocked(initialize.isSupported).mockReturnValue(init)
  vi.mocked(attachBannerFn.isSupported).mockReturnValue(attach)
}

beforeEach(() => {
  vi.unstubAllEnvs()
  vi.stubEnv('VITE_AD_GROUP_ID', 'ait-ad-test-banner-id')
  initialize.mockReset()
  attachBannerFn.mockReset()
  supported(true, true)
  resetAdsForTest()
})

test('광고 그룹 ID가 없으면 쓰지 않는다', () => {
  vi.stubEnv('VITE_AD_GROUP_ID', '')
  expect(adsSupported()).toBe(false)
})

test('초기화나 부착이 지원되지 않는 환경이면 쓰지 않는다', () => {
  supported(false, true)
  expect(adsSupported()).toBe(false)
  supported(true, false)
  expect(adsSupported()).toBe(false)
})

test('지원되고 ID가 있으면 쓴다', () => {
  expect(adsSupported()).toBe(true)
})

test('초기화는 앱에서 한 번만 하고, 성공하면 true', async () => {
  initialize.mockImplementation((o: { callbacks: { onInitialized: () => void } }) => o.callbacks.onInitialized())
  const [a, b] = await Promise.all([initAds(), initAds()])
  expect(a).toBe(true)
  expect(b).toBe(true)
  expect(initialize).toHaveBeenCalledTimes(1)
})

test('초기화에 실패하거나 던지면 false이고 throw하지 않는다', async () => {
  initialize.mockImplementation((o: { callbacks: { onInitializationFailed: (e: Error) => void } }) =>
    o.callbacks.onInitializationFailed(new Error('x')),
  )
  expect(await initAds()).toBe(false)
  resetAdsForTest()
  initialize.mockImplementation(() => {
    throw new Error('boom')
  })
  expect(await initAds()).toBe(false)
})

test('지원하지 않는 환경이면 SDK를 부르지 않고 false', async () => {
  supported(false, false)
  expect(await initAds()).toBe(false)
  expect(initialize).not.toHaveBeenCalled()
})

test('배너를 붙일 때 광고 그룹 ID와 SDK 기본 스타일 옵션을 넘기고, 걷어 내면 destroy', () => {
  const destroy = vi.fn()
  attachBannerFn.mockReturnValue({ destroy })
  const el = document.createElement('div')
  const off = attachBanner(el, () => {})
  expect(attachBannerFn).toHaveBeenCalledTimes(1)
  const [id, target, opts] = attachBannerFn.mock.calls[0]
  expect(id).toBe('ait-ad-test-banner-id')
  expect(target).toBe(el)
  expect(opts).toMatchObject({ theme: 'light', variant: 'expanded' })
  off()
  off()
  expect(destroy).toHaveBeenCalled()
})

test('광고가 없거나(onNoFill) 그리기에 실패하면 알린다', () => {
  attachBannerFn.mockReturnValue({ destroy: vi.fn() })
  const onUnavailable = vi.fn()
  attachBanner(document.createElement('div'), onUnavailable)
  const { callbacks } = attachBannerFn.mock.calls[0][2] as { callbacks: Record<string, () => void> }
  callbacks.onNoFill()
  callbacks.onAdFailedToRender()
  expect(onUnavailable).toHaveBeenCalledTimes(2)
})

test('부착이 던져도 앱이 멈추지 않고 알린다', () => {
  attachBannerFn.mockImplementation(() => {
    throw new Error('no element')
  })
  const onUnavailable = vi.fn()
  expect(() => attachBanner(document.createElement('div'), onUnavailable)).not.toThrow()
  expect(onUnavailable).toHaveBeenCalledTimes(1)
})
