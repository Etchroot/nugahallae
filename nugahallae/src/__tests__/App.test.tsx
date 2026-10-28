import { test, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { TDSMobileAITProvider } from '@toss/tds-mobile-ait'

let backHandler: (() => void) | null = null
const closeApp = vi.fn()
vi.mock('../platform/sdk', () => ({
  onBack: (h: () => void) => {
    backHandler = h
    return () => {
      backHandler = null
    }
  },
  closeApp: () => closeApp(),
}))

// TDS ConfirmDialog는 jsdom에서 언마운트 시 난독화된 셀렉터 해제 코드가 실패한다.
// 다이얼로그 자체는 브라우저에서 확인하고, 여기서는 App의 배선만 검증하기 위해 얇은 대역으로 바꾼다.
vi.mock('../components/ConfirmDialog', () => ({
  ConfirmDialog: (p: {
    open: boolean
    title: string
    confirmLabel: string
    cancelLabel: string
    onConfirm: () => void
    onCancel: () => void
  }) =>
    p.open ? (
      <div role="dialog" aria-label={p.title}>
        <p>{p.title}</p>
        <button onClick={p.onCancel}>{p.cancelLabel}</button>
        <button onClick={p.onConfirm}>{p.confirmLabel}</button>
      </div>
    ) : null,
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
  backHandler = null
  closeApp.mockClear()
})

test('홈 placeholder가 보인다', () => {
  renderApp()
  expect(screen.getByText('홈')).toBeInTheDocument()
})

test('홈에서 뒤로가기 → 종료 확인, 닫기 누르면 closeApp', async () => {
  renderApp()
  expect(screen.queryByText('누가할래를 닫을까요?')).not.toBeInTheDocument()
  act(() => backHandler!())
  expect(await screen.findByText('누가할래를 닫을까요?')).toBeInTheDocument()
  fireEvent.click(screen.getByText('닫기'))
  expect(closeApp).toHaveBeenCalledTimes(1)
})

test('언마운트 시 onBack 해제', () => {
  const { unmount } = renderApp()
  expect(backHandler).not.toBeNull()
  unmount()
  expect(backHandler).toBeNull()
})
