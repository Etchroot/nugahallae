import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { TDSMobileAITProvider } from '@toss/tds-mobile-ait'

const store = new Map<string, string>()
vi.mock('../../platform/sdk', () => ({
  onBack: () => () => {},
  closeApp: () => {},
  haptic: vi.fn(async () => {}),
  storageGet: async (k: string) => store.get(k) ?? null,
  storageSet: async (k: string, v: string) => {
    store.set(k, v)
  },
}))

// TDS ConfirmDialog는 jsdom에서 언마운트 시 실패해서 얇은 대역으로 바꾼다(App.test.tsx와 동일).
vi.mock('../../components/ConfirmDialog', () => ({
  ConfirmDialog: () => null,
}))

import App from '../../App'
import { haptic } from '../../platform/sdk'

function renderApp() {
  return render(
    <TDSMobileAITProvider brandPrimaryColor="#3182F6">
      <App />
    </TDSMobileAITProvider>,
  )
}

const flush = () => act(async () => { await vi.advanceTimersByTimeAsync(0) })
// act 하나 안에서는 렌더/이펙트가 끝까지 밀리지 않으므로 잘게 나눠 진행한다.
async function advance(ms: number) {
  for (let t = 0; t < ms; t += 100) await act(async () => { await vi.advanceTimersByTimeAsync(100) })
}

// TDS NumericSpinner는 framer-motion 탭(pointerdown → pointerup)으로 동작한다.
function tap(el: HTMLElement) {
  fireEvent.pointerDown(el, { pointerId: 1, isPrimary: true, button: 0 })
  fireEvent.pointerUp(el, { pointerId: 1, isPrimary: true, button: 0 })
}

function setPlayers(n: number) {
  const plus = screen.getByLabelText('인원 늘리기')
  const minus = screen.getByLabelText('인원 줄이기')
  for (let i = 0; i < 12; i++) tap(minus)
  for (let i = 2; i < n; i++) tap(plus)
}

async function drawAll(n: number) {
  for (let i = 1; i <= n; i++) {
    fireEvent.click(screen.getByText(`${i}번째 사람, 화면을 눌러 말을 뽑으세요`))
    fireEvent.click(screen.getByText('확인했어요'))
  }
}

async function playRoulette(n: number) {
  for (let r = 0; r < n - 1; r++) {
    fireEvent.click(screen.getByRole('button', { name: '돌리기' }))
    await advance(7000 + 1200 + 100)
  }
  await advance(10000)
}

beforeEach(() => {
  vi.useFakeTimers()
  store.clear()
  vi.mocked(haptic).mockClear()
})
afterEach(() => vi.useRealTimers())

test('홈 → 돌림판 → 3명 말 뽑기 → 시작 → 끝까지 → 결과에 "걸렸다!"와 "벌칙: 커피 사기"', async () => {
  renderApp()
  await flush()
  setPlayers(3)
  fireEvent.change(screen.getByPlaceholderText('벌칙 (선택) 예: 커피 사기'), {
    target: { value: '커피 사기' },
  })
  fireEvent.click(screen.getByText('돌림판'))
  expect(screen.getByText('걸리면 통과! 마지막까지 남으면 벌칙')).toBeInTheDocument()
  await drawAll(3)
  fireEvent.click(screen.getByText('시작하기'))
  await playRoulette(3)
  expect(screen.getByText(/걸렸다!/)).toBeInTheDocument()
  expect(screen.getByText('벌칙: 커피 사기')).toBeInTheDocument()
  expect(haptic).toHaveBeenCalledWith('success')
  expect(vi.mocked(haptic).mock.calls.filter((c) => c[0] === 'success')).toHaveLength(1)
})

test('벌칙이 공백이면 결과에 "벌칙:" 줄이 없다', async () => {
  renderApp()
  await flush()
  setPlayers(2)
  fireEvent.change(screen.getByPlaceholderText('벌칙 (선택) 예: 커피 사기'), {
    target: { value: '   ' },
  })
  fireEvent.click(screen.getByText('돌림판'))
  await drawAll(2)
  fireEvent.click(screen.getByText('시작하기'))
  await playRoulette(2)
  expect(screen.getByText(/걸렸다!/)).toBeInTheDocument()
  expect(screen.queryByText(/벌칙:/)).not.toBeInTheDocument()
})

test('말 공개 중 연속 탭해도 다음 말로 넘어가지 않는다', async () => {
  renderApp()
  await flush()
  fireEvent.click(screen.getByText('돌림판'))
  const wait = screen.getByText('1번째 사람, 화면을 눌러 말을 뽑으세요')
  fireEvent.click(wait)
  expect(screen.getByText(/내 말을 기억하세요/)).toBeInTheDocument()
  const reveal = screen.getByText(/내 말을 기억하세요/).parentElement!
  fireEvent.click(reveal)
  fireEvent.click(reveal)
  expect(screen.getByText(/내 말을 기억하세요/)).toBeInTheDocument()
  fireEvent.click(screen.getByText('확인했어요'))
  expect(screen.getByText('2번째 사람, 화면을 눌러 말을 뽑으세요')).toBeInTheDocument()
})

test('한 판 더 → 같은 게임 준비 화면, 다른 게임 → 홈', async () => {
  renderApp()
  await flush()
  setPlayers(2)
  fireEvent.click(screen.getByText('돌림판'))
  await drawAll(2)
  fireEvent.click(screen.getByText('시작하기'))
  await playRoulette(2)
  fireEvent.click(screen.getByText('한 판 더'))
  expect(screen.getByText('1번째 사람, 화면을 눌러 말을 뽑으세요')).toBeInTheDocument()
  await drawAll(2)
  fireEvent.click(screen.getByText('시작하기'))
  await playRoulette(2)
  fireEvent.click(screen.getByText('다른 게임'))
  expect(screen.getByText('인원수')).toBeInTheDocument()
})

test('인원수는 2 아래/10 위로 못 간다', async () => {
  renderApp()
  await flush()
  for (let i = 0; i < 15; i++) tap(screen.getByLabelText('인원 줄이기'))
  fireEvent.click(screen.getByText('돌림판'))
  await drawAll(2)
  expect(screen.queryByText('3번째 사람, 화면을 눌러 말을 뽑으세요')).not.toBeInTheDocument()
  expect(screen.getByText('시작하기')).toBeInTheDocument()
})

test('인원수 10명 위로는 못 간다', async () => {
  renderApp()
  await flush()
  for (let i = 0; i < 15; i++) tap(screen.getByLabelText('인원 늘리기'))
  fireEvent.click(screen.getByText('돌림판'))
  await drawAll(10)
  expect(screen.queryByText('11번째 사람, 화면을 눌러 말을 뽑으세요')).not.toBeInTheDocument()
  expect(screen.getByText('시작하기')).toBeInTheDocument()
})
