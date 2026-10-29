import { test, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react'
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
  getUserKey: () => getUserKey(),
  storageGet: async (k: string) => store.get(k) ?? null,
  storageSet: async (k: string, v: string) => {
    store.set(k, v)
    storageSetSpy(k, v)
  },
}))
const store = new Map<string, string>()
const storageSetSpy = vi.fn()
const getUserKey = vi.fn(async (): Promise<string | null> => null)

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
  store.clear()
  storageSetSpy.mockClear()
  getUserKey.mockReset()
  getUserKey.mockResolvedValue(null)
})

test('시작 시 사용자 키를 한 번 확인하고, 저장된 값과 다르면 저장한다', async () => {
  getUserKey.mockResolvedValue('hash-1')
  renderApp()
  await waitFor(() => expect(store.get('nugahallae:uid')).toBe('hash-1'))
  expect(getUserKey).toHaveBeenCalledTimes(1)
  expect(screen.queryByText('hash-1')).not.toBeInTheDocument()
})

test('사용자 키가 이미 같으면 다시 저장하지 않고, 없으면(null) 저장하지 않는다', async () => {
  store.set('nugahallae:uid', 'hash-1')
  getUserKey.mockResolvedValue('hash-1')
  const { unmount } = renderApp()
  await waitFor(() => expect(getUserKey).toHaveBeenCalled())
  await act(async () => {})
  expect(storageSetSpy.mock.calls.filter((c) => c[0] === 'nugahallae:uid')).toHaveLength(0)
  unmount()
  store.clear()
  getUserKey.mockResolvedValue(null)
  renderApp()
  await act(async () => {})
  expect(store.has('nugahallae:uid')).toBe(false)
})

test('사용자 키 확인이 실패해도 홈이 정상으로 보인다', async () => {
  getUserKey.mockRejectedValue(new Error('x'))
  renderApp()
  await act(async () => {})
  expect(screen.getByText('게임 고르기')).toBeInTheDocument()
})

test('게임 플레이에 들어가면 기록이 저장되고, 홈에 최근 한 게임이 보인다', async () => {
  renderApp()
  expect(screen.queryByText('최근 한 게임')).not.toBeInTheDocument()
  fireEvent.click(screen.getByText('돌림판'))
  fireEvent.click(screen.getByText('동물 고르기 시작'))
  for (let i = 1; i <= 4; i++) {
    fireEvent.click(screen.getAllByTestId('piece-card').find((c) => !(c as HTMLButtonElement).disabled)!)
    fireEvent.click(screen.getByText('확인했어요'))
  }
  fireEvent.click(screen.getByText('시작하기'))
  await waitFor(() => expect(JSON.parse(store.get('nugahallae:history') ?? 'null')?.recent).toEqual(['roulette']))
  act(() => backHandler!())
  fireEvent.click(screen.getByText('그만하기'))
  expect(screen.getByText('최근 한 게임')).toBeInTheDocument()
  expect(screen.getAllByTestId('recent-card')).toHaveLength(1)
})

test('홈 화면이 보인다', () => {
  renderApp()
  expect(screen.getByText('게임 고르기')).toBeInTheDocument()
})

test('홈에서 뒤로가기 → 확인 창 없이 closeApp 한 번', () => {
  renderApp()
  act(() => backHandler!())
  expect(closeApp).toHaveBeenCalledTimes(1)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.queryByText('누가할래를 닫을까요?')).not.toBeInTheDocument()
})

test('준비 화면에서 뒤로가기는 홈으로 가고 앱은 닫히지 않는다', () => {
  renderApp()
  fireEvent.click(screen.getByText('돌림판'))
  act(() => backHandler!())
  expect(screen.getByText('게임 고르기')).toBeInTheDocument()
  expect(closeApp).not.toHaveBeenCalled()
})

test('언마운트 시 onBack 해제', () => {
  const { unmount } = renderApp()
  expect(backHandler).not.toBeNull()
  unmount()
  expect(backHandler).toBeNull()
})

async function goToPlay() {
  renderApp()
  fireEvent.click(screen.getByText('돌림판'))
  fireEvent.click(screen.getByText('동물 고르기 시작'))
  for (let i = 1; i <= 4; i++) {
    expect(screen.getByText(`${i}번째 사람, 내 동물을 하나 골라요`)).toBeInTheDocument()
    fireEvent.click(screen.getAllByTestId('piece-card').find((c) => !(c as HTMLButtonElement).disabled)!)
    fireEvent.click(screen.getByText('확인했어요'))
  }
  fireEvent.click(screen.getByText('시작하기'))
  // 게임 화면은 고를 때 내려받는 코드라서 뜰 때까지 기다린다
  expect(await screen.findByRole('button', { name: '돌리기' })).toBeInTheDocument()
}

test('플레이 중 뒤로가기 → 그만할까요 확인, 계속하기는 게임 유지', async () => {
  await goToPlay()
  act(() => backHandler!())
  expect(screen.getByText('게임을 그만할까요?')).toBeInTheDocument()
  fireEvent.click(screen.getByText('계속하기'))
  expect(screen.queryByText('게임을 그만할까요?')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: '돌리기' })).toBeInTheDocument()
})

test('그만하기는 홈으로 간다', async () => {
  await goToPlay()
  act(() => backHandler!())
  fireEvent.click(screen.getByText('그만하기'))
  expect(screen.getByText('게임 고르기')).toBeInTheDocument()
})

test('다이얼로그가 열린 상태에서 뒤로가기는 다이얼로그를 닫는다', async () => {
  await goToPlay()
  act(() => backHandler!())
  expect(screen.getByText('게임을 그만할까요?')).toBeInTheDocument()
  act(() => backHandler!())
  expect(screen.queryByText('게임을 그만할까요?')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: '돌리기' })).toBeInTheDocument()
})
