import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { drawPieces, pieceLabel } from '../../../domain/pieces'
import { WiresGame } from '../WiresGame'
import { TURN_MS } from '../logic'
import { END_EFFECT_MS } from '../../shared/timing'
import { haptic } from '../../../platform/sdk'

vi.mock('../../../platform/sdk', () => ({ haptic: vi.fn(async () => {}) }))

const order = drawPieces(3, () => 0.5)
let clock = 0
const now = () => clock
const advance = (ms: number) =>
  act(() => {
    clock += ms
    vi.advanceTimersByTime(ms)
  })

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(haptic).mockClear()
  clock = 10000
})
afterEach(() => vi.useRealTimers())

const wires = () => screen.getAllByRole('button', { name: /^전선 \d+번/ })
const ready = () => fireEvent.click(screen.getByRole('button', { name: '준비됐어요' }))
const mount = (rng = () => 0, onFinish: (p: unknown) => void = () => {}) =>
  render(<WiresGame order={order} onFinish={onFinish} rng={rng} now={now} />)

test('규칙 띠, 차례 문구, 준비 버튼, 전선 수(인원+3)', () => {
  mount()
  expect(screen.getByText('틀린 전선은 딱 하나! 자르면 펑')).toBeTruthy()
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  expect(screen.getByRole('button', { name: '준비됐어요' })).toBeTruthy()
  expect(wires().length).toBe(6)
})

test('전선 이름에 번호·색·무늬가 모두 들어간다', () => {
  mount()
  expect(wires()[0].getAttribute('aria-label')).toBe('전선 1번 빨강 실선')
  expect(wires()[1].getAttribute('aria-label')).toBe('전선 2번 파랑 점선')
  expect(wires()[2].getAttribute('aria-label')).toBe('전선 3번 초록 줄무늬')
})

test('준비 전에는 전선을 눌러도 아무 일도 없다', () => {
  const onFinish = vi.fn()
  mount(() => 0, onFinish)
  fireEvent.click(wires()[0])
  advance(END_EFFECT_MS + 100)
  expect(onFinish).not.toHaveBeenCalled()
  expect(haptic).not.toHaveBeenCalled()
})

test('안전한 전선: 끊어지고 tap 1회, 다음 사람 준비 화면', () => {
  mount()
  ready()
  fireEvent.click(wires()[1])
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledWith('tap')
  expect(screen.getByText(`👉 ${pieceLabel(order[1])} 차례예요`)).toBeTruthy()
  expect(screen.getByRole('button', { name: '준비됐어요' })).toBeTruthy()
  expect(wires()[1].hasAttribute('disabled')).toBe(true)
  expect(wires()[1].getAttribute('aria-label')).toContain('끊어짐')
})

test('끊어진 전선은 다시 누를 수 없다', () => {
  mount()
  ready()
  fireEvent.click(wires()[1])
  advance(500)
  ready()
  vi.mocked(haptic).mockClear()
  fireEvent.click(wires()[1])
  expect(haptic).not.toHaveBeenCalled()
})

test('틀린 전선: 오버레이 + error 1회 + 500ms 뒤 onFinish 1회', () => {
  const onFinish = vi.fn()
  mount(() => 0, onFinish)
  ready()
  fireEvent.click(wires()[0])
  expect(screen.getByText(`${pieceLabel(order[0])} 펑!`)).toBeTruthy()
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledWith('error')
  fireEvent.click(wires()[2]) // 결정 뒤 입력 무시
  advance(END_EFFECT_MS - 1)
  expect(onFinish).not.toHaveBeenCalled()
  advance(1)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledWith(order[0])
  advance(5000)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledTimes(1)
})

test('시간 초과: 8초에 오버레이, 그 사람이 패배', () => {
  const onFinish = vi.fn()
  mount(() => 0, onFinish)
  ready()
  advance(TURN_MS - 100)
  expect(screen.queryByText(`${pieceLabel(order[0])} 시간이 다 됐어요`)).toBeNull()
  advance(100)
  expect(screen.getByText(`${pieceLabel(order[0])} 시간이 다 됐어요`)).toBeTruthy()
  expect(haptic).toHaveBeenCalledWith('error')
  advance(END_EFFECT_MS)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledWith(order[0])
})

test('타이머가 늦게 돌아도 실제 경과 시간으로 시간 초과 처리', () => {
  const onFinish = vi.fn()
  mount(() => 0, onFinish)
  ready()
  act(() => {
    clock += TURN_MS + 3000
    vi.advanceTimersByTime(100)
  })
  expect(screen.getByText(`${pieceLabel(order[0])} 시간이 다 됐어요`)).toBeTruthy()
  advance(END_EFFECT_MS)
  expect(onFinish).toHaveBeenCalledTimes(1)
})

test('제한 시간이 지난 뒤의 늦은 클릭은 안전 전선이어도 시간 초과', () => {
  const onFinish = vi.fn()
  mount(() => 0, onFinish)
  ready()
  act(() => {
    clock += TURN_MS // 타이머 콜백 없이 시계만 감
  })
  fireEvent.click(wires()[1])
  expect(screen.getByText(`${pieceLabel(order[0])} 시간이 다 됐어요`)).toBeTruthy()
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledWith('error')
})

test('시간 막대가 줄어든다', () => {
  mount()
  ready()
  const bar = () => screen.getByTestId('wr-bar-fill').style.width
  expect(bar()).toBe('100%')
  advance(4000)
  expect(bar()).toBe('50%')
})

test('한 바퀴 돌아 처음 사람에게 차례가 돌아온다', () => {
  mount()
  for (const i of [1, 2, 3]) {
    ready()
    fireEvent.click(wires()[i])
    advance(500)
  }
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
})

test('안전한 전선을 모두 자르면 다음 사람은 틀린 전선만 남는다', () => {
  const onFinish = vi.fn()
  mount(() => 0, onFinish)
  for (const i of [1, 2, 3, 4, 5]) {
    ready()
    fireEvent.click(wires()[i])
    advance(500)
  }
  ready()
  fireEvent.click(wires()[0])
  advance(END_EFFECT_MS)
  expect(onFinish).toHaveBeenCalledWith(order[2]) // 6번째 차례 = idx 5 % 3
})

test('자른 직후 400ms 안의 준비 버튼 탭은 무시된다', () => {
  mount()
  ready()
  fireEvent.click(wires()[1])
  ready() // 같은 시각 더블탭
  expect(screen.getByRole('button', { name: '준비됐어요' })).toBeTruthy()
  advance(400)
  ready()
  expect(screen.queryByRole('button', { name: '준비됐어요' })).toBeNull()
})

test('앱이 백그라운드로 가면 그 차례는 무효, 같은 사람 준비 화면 + 안내', () => {
  const onFinish = vi.fn()
  mount(() => 0, onFinish)
  ready()
  advance(3000)
  act(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
  expect(screen.getByText('다시 해 주세요')).toBeTruthy()
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  advance(TURN_MS * 2)
  expect(onFinish).not.toHaveBeenCalled()
  advance(400)
  ready()
  expect(screen.queryByText('다시 해 주세요')).toBeNull()
})

test('정답 전선은 자르기 전 DOM에 드러나지 않는다', () => {
  const a = mount(() => 0)
  const htmlA = a.container.innerHTML
  a.unmount()
  const b = mount(() => 0.99)
  const htmlB = b.container.innerHTML
  expect(htmlA).toBe(htmlB)
})

test('진행 중 언마운트 → onFinish·햅틱 없음', () => {
  const onFinish = vi.fn()
  const { unmount } = mount(() => 0, onFinish)
  ready()
  advance(1000)
  unmount()
  advance(TURN_MS * 3)
  expect(onFinish).not.toHaveBeenCalled()
  expect(haptic).not.toHaveBeenCalled()
})

test('결정 후 언마운트 → onFinish 미호출', () => {
  const onFinish = vi.fn()
  const { unmount } = mount(() => 0, onFinish)
  ready()
  fireEvent.click(wires()[0])
  unmount()
  advance(5000)
  expect(onFinish).not.toHaveBeenCalled()
})
