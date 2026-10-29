import { test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TDSMobileAITProvider } from '@toss/tds-mobile-ait'

vi.mock('../platform/sdk', () => ({
  onBack: () => () => {},
  closeApp: () => {},
  haptic: async () => {},
  getUserKey: async () => null,
  storageGet: async () => null,
  storageSet: async () => {},
}))

// 광고 SDK 대역: 배너를 붙이는 횟수와 걷어 내는 횟수를 센다.
const attach = vi.fn()
const detach = vi.fn()
const adsReady = vi.fn(async () => true)
vi.mock('../platform/ads', () => ({
  initAds: () => adsReady(),
  attachBanner: (el: HTMLElement, onUnavailable: () => void) => {
    attach(el, onUnavailable)
    return () => detach()
  },
}))

import App from '../App'

function renderApp() {
  return render(
    <TDSMobileAITProvider brandPrimaryColor="#3182F6">
      <App />
    </TDSMobileAITProvider>,
  )
}

beforeEach(() => {
  let t = 0
  vi.spyOn(performance, 'now').mockImplementation(() => (t += 1000))
  attach.mockClear()
  detach.mockClear()
  adsReady.mockReset()
  adsReady.mockResolvedValue(true)
})

test('광고를 쓸 수 있으면 홈 맨 위에 배너 자리가 생기고 본문 앞에 놓인다', async () => {
  renderApp()
  const banner = await screen.findByTestId('top-banner')
  expect(attach).toHaveBeenCalledTimes(1)
  const body = document.querySelector('main')!
  expect(banner.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(banner).not.toHaveAttribute('hidden')
})

test('광고를 쓸 수 없으면(웹 데모·구버전·ID 없음) 배너 자리를 만들지 않는다', async () => {
  adsReady.mockResolvedValue(false)
  renderApp()
  await waitFor(() => expect(adsReady).toHaveBeenCalled())
  expect(screen.queryByTestId('top-banner')).not.toBeInTheDocument()
  expect(attach).not.toHaveBeenCalled()
})

test('광고가 없거나 실패하면 배너 자리를 접는다', async () => {
  renderApp()
  const banner = await screen.findByTestId('top-banner')
  const onUnavailable = attach.mock.calls[0][1] as () => void
  onUnavailable()
  await waitFor(() => expect(banner).toHaveAttribute('hidden'))
})

test('준비 화면에도 배너가 있고, 게임이 시작되면 배너를 걷어 낸다', async () => {
  renderApp()
  await screen.findByTestId('top-banner')
  fireEvent.click(screen.getByText('돌림판'))
  expect(screen.getByTestId('top-banner')).toBeInTheDocument()
  fireEvent.click(screen.getByText('동물 고르기 시작'))
  for (let i = 1; i <= 4; i++) {
    fireEvent.click(screen.getAllByTestId('piece-card').find((c) => !(c as HTMLButtonElement).disabled)!)
    fireEvent.click(screen.getByText('확인했어요'))
  }
  fireEvent.click(screen.getByText('시작하기'))
  expect(await screen.findByRole('button', { name: '돌리기' })).toBeInTheDocument()
  expect(screen.queryByTestId('top-banner')).not.toBeInTheDocument()
  expect(detach).toHaveBeenCalled()
})
