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
  haptic: async () => {},
  storageGet: async () => null,
  storageSet: async () => {},
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
  // 연속 탭 방지(400ms)를 통과하도록 시계가 호출마다 1초씩 간다.
  let t = 0
  vi.spyOn(performance, 'now').mockImplementation(() => (t += 1000))
  backHandler = null
  closeApp.mockClear()
})

test('홈 화면이 보인다', () => {
  renderApp()
  expect(screen.getByText('인원수')).toBeInTheDocument()
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

function goToPlay() {
  renderApp()
  fireEvent.click(screen.getByText('돌림판'))
  for (let i = 1; i <= 4; i++) {
    fireEvent.click(screen.getByText(`${i}번째 사람, 화면을 눌러 말을 뽑으세요`))
    fireEvent.click(screen.getByText('확인했어요'))
  }
  fireEvent.click(screen.getByText('시작하기'))
  expect(screen.getByRole('button', { name: '돌리기' })).toBeInTheDocument()
}

test('플레이 중 뒤로가기 → 그만할까요 확인, 계속하기는 게임 유지', () => {
  goToPlay()
  act(() => backHandler!())
  expect(screen.getByText('게임을 그만할까요?')).toBeInTheDocument()
  fireEvent.click(screen.getByText('계속하기'))
  expect(screen.queryByText('게임을 그만할까요?')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: '돌리기' })).toBeInTheDocument()
})

test('그만하기는 홈으로 간다', () => {
  goToPlay()
  act(() => backHandler!())
  fireEvent.click(screen.getByText('그만하기'))
  expect(screen.getByText('인원수')).toBeInTheDocument()
})

test('다이얼로그가 열린 상태에서 뒤로가기는 다이얼로그를 닫는다', () => {
  goToPlay()
  act(() => backHandler!())
  expect(screen.getByText('게임을 그만할까요?')).toBeInTheDocument()
  act(() => backHandler!())
  expect(screen.queryByText('게임을 그만할까요?')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: '돌리기' })).toBeInTheDocument()
})
