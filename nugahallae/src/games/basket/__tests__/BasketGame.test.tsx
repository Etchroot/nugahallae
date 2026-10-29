import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { drawPieces, pieceLabel } from '../../../domain/pieces'
import { BasketGame } from '../BasketGame'
import { BALL_X, BALL_Y } from '../logic'
import { RECORD_END_MS } from '../../shared/timing'
import { haptic } from '../../../platform/sdk'

vi.mock('../../../platform/sdk', () => ({ haptic: vi.fn(async () => {}) }))

const order = drawPieces(3, () => 0.5)
let clock = 0
const now = () => clock

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(haptic).mockClear()
  clock = 0
})
afterEach(() => {
  vi.useRealTimers()
  setVisibility('visible')
})

function setVisibility(v: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => v })
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => v === 'hidden' })
}

const advance = (ms: number) => {
  clock += ms
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}
// rng 0.5 → 바구니 x=160(정중앙), 입구 폭 72.8
const mount = (onFinish = vi.fn(), people = order) => {
  const r = render(<BasketGame order={people} onFinish={onFinish} rng={() => 0.5} now={now} />)
  return { onFinish, ...r }
}
const area = () => screen.getByTestId('basket-area')
type Ev = 'pointerDown' | 'pointerMove' | 'pointerUp' | 'pointerCancel' | 'lostPointerCapture'
const ev = (type: Ev, x: number, y: number, pointerId = 1) => {
  fireEvent[type](area(), { clientX: x, clientY: y, pointerId })
}
/** 공을 (dx, dy)만큼 당겼다 놓기. 비행이 끝날 때까지 시간을 흘린다 */
const pullAndRelease = (dx: number, dy: number, wait = 1000) => {
  clock += 500
  ev('pointerDown', BALL_X, BALL_Y)
  ev('pointerMove', BALL_X + dx, BALL_Y + dy)
  ev('pointerUp', BALL_X + dx, BALL_Y + dy)
  if (wait > 0) advance(wait)
}
const HIT = [0, 110] as const // 정중앙 바구니에 들어간다
const MISS = [-20, 110] as const // 옆으로 빗나간다
const next = () => {
  clock += 500
  fireEvent.click(screen.getByRole('button', { name: /^(다음 사람|결과 보기)$/ }))
}
/** 한 사람이 던지기 3번(결과 문자열 배열: 'h' 성공, 'm' 실패) */
const turn = (s: string) => {
  for (const c of s) {
    if (c === 'h') pullAndRelease(...HIT)
    else pullAndRelease(...MISS)
  }
}

test('규칙 띠와 차례 문구, 시작 안내', () => {
  mount()
  expect(screen.getByText('3번 던져서 많이 넣기! 가장 적으면 벌칙')).toBeTruthy()
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  expect(screen.getByTestId('basket-area')).toBeTruthy()
})

test('성공: 비행이 끝나면 들어갔어요 + 누적 1/3, 햅틱 tap 1회(던질 때는 없음)', () => {
  mount()
  pullAndRelease(...HIT, 0)
  expect(haptic).not.toHaveBeenCalled()
  expect(screen.queryByText('들어갔어요')).toBeNull()
  advance(1000)
  expect(screen.getByText('들어갔어요')).toBeTruthy()
  expect(screen.getByText('1/3')).toBeTruthy()
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledWith('tap')
})

test('실패: 아쉬워요 + 0/3, 햅틱 없음', () => {
  mount()
  pullAndRelease(...MISS)
  expect(screen.getByText('아쉬워요')).toBeTruthy()
  expect(screen.getByText('0/3')).toBeTruthy()
  expect(haptic).not.toHaveBeenCalled()
})

test('가벼운 당김은 던지기로 치지 않고 다시 던질 수 있다', () => {
  mount()
  pullAndRelease(0, 8)
  expect(screen.queryByText('아쉬워요')).toBeNull()
  expect(screen.getByText('1번째 던지기')).toBeTruthy()
  pullAndRelease(...HIT)
  expect(screen.getByText('들어갔어요')).toBeTruthy()
  expect(screen.getByText('2번째 던지기')).toBeTruthy()
})

test('공에서 먼 곳을 눌러 시작하면 무시한다', () => {
  mount()
  clock += 500
  ev('pointerDown', 20, 40)
  ev('pointerMove', 20, 160)
  ev('pointerUp', 20, 160)
  advance(1000)
  expect(screen.queryByText('아쉬워요')).toBeNull()
  expect(screen.queryByText('들어갔어요')).toBeNull()
})

test('비행 중 새 던지기는 무시한다', () => {
  mount()
  pullAndRelease(...MISS, 100)
  ev('pointerDown', BALL_X, BALL_Y)
  ev('pointerMove', BALL_X, BALL_Y + 110)
  ev('pointerUp', BALL_X, BALL_Y + 110)
  advance(1000)
  expect(screen.getByText('0/3')).toBeTruthy()
  expect(screen.getByText('2번째 던지기')).toBeTruthy()
})

test('두 번째 포인터는 첫 포인터 던지기를 가로채지 못한다', () => {
  mount()
  clock += 500
  ev('pointerDown', BALL_X, BALL_Y, 1)
  ev('pointerDown', BALL_X, BALL_Y, 2)
  ev('pointerMove', BALL_X - 50, BALL_Y + 20, 2)
  ev('pointerUp', BALL_X - 50, BALL_Y + 20, 2)
  ev('pointerMove', BALL_X, BALL_Y + 110, 1)
  ev('pointerUp', BALL_X, BALL_Y + 110, 1)
  advance(1000)
  expect(screen.getByText('들어갔어요')).toBeTruthy()
})

test('pointercancel · lostpointercapture는 그 던지기를 취소한다(횟수 안 씀)', () => {
  mount()
  clock += 500
  ev('pointerDown', BALL_X, BALL_Y)
  ev('pointerMove', BALL_X, BALL_Y + 110)
  ev('pointerCancel', BALL_X, BALL_Y + 110)
  ev('pointerUp', BALL_X, BALL_Y + 110)
  advance(1000)
  expect(screen.queryByText('들어갔어요')).toBeNull()
  expect(screen.getByText('1번째 던지기')).toBeTruthy()

  ev('pointerDown', BALL_X, BALL_Y)
  ev('pointerMove', BALL_X, BALL_Y + 110)
  ev('lostPointerCapture', BALL_X, BALL_Y + 110)
  ev('pointerUp', BALL_X, BALL_Y + 110)
  advance(1000)
  expect(screen.queryByText('들어갔어요')).toBeNull()
  expect(screen.getByText('1번째 던지기')).toBeTruthy()
})

test('손을 뗀 뒤 따라오는 lostpointercapture는 던지기에 영향이 없다', () => {
  mount()
  pullAndRelease(...HIT, 0)
  ev('lostPointerCapture', BALL_X, BALL_Y + 110)
  advance(1000)
  expect(screen.getByText('들어갔어요')).toBeTruthy()
})

test('백그라운드로 가면 진행 중인 던지기는 무효 + 다시 해 주세요', () => {
  mount()
  pullAndRelease(...HIT, 100)
  setVisibility('hidden')
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
  setVisibility('visible')
  advance(2000)
  expect(screen.getByText('다시 해 주세요')).toBeTruthy()
  expect(screen.queryByText('들어갔어요')).toBeNull()
  expect(screen.getByText('1번째 던지기')).toBeTruthy()
  expect(haptic).not.toHaveBeenCalled()
})

test('3번 던지면 기록 확정 → 다음 사람, 마지막은 결과 보기', () => {
  mount()
  turn('hmh')
  expect(screen.getByText('2/3')).toBeTruthy()
  expect(screen.getByRole('button', { name: '다음 사람' })).toBeTruthy()
  next()
  expect(screen.getByText(`👉 ${pieceLabel(order[1])} 차례예요`)).toBeTruthy()
  expect(screen.getByText('0/3')).toBeTruthy()
  turn('mmm')
  next()
  turn('hhh')
  expect(screen.queryByRole('button', { name: '다음 사람' })).toBeNull()
  expect(screen.getByRole('button', { name: '결과 보기' })).toBeTruthy()
})

test('가장 적게 넣은 사람이 onFinish로 1회, 연출·순위·햅틱 error 1회', () => {
  const { onFinish } = mount()
  turn('hhm') // 2
  next()
  turn('mmm') // 0
  next()
  turn('hhh') // 3
  vi.mocked(haptic).mockClear()
  next()
  expect(screen.getByText(`${pieceLabel(order[1])} 0개 넣었어요`)).toBeTruthy()
  expect(screen.getByText('결과')).toBeTruthy()
  expect(vi.mocked(haptic).mock.calls.filter((c) => c[0] === 'error')).toHaveLength(1)
  expect(onFinish).not.toHaveBeenCalled()
  advance(RECORD_END_MS)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledWith(order[1])
  advance(5000)
  expect(onFinish).toHaveBeenCalledTimes(1)
})

test('동점이면 동점자 중 랜덤 표시', () => {
  const { onFinish } = mount()
  turn('hmm') // 1
  next()
  turn('mhm') // 1
  next()
  turn('hhh') // 3
  next()
  expect(screen.getByText(/\(동점자 중 랜덤\)/)).toBeTruthy()
  advance(RECORD_END_MS)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledWith(order[1])
})

test('다음 버튼 연타는 한 번만 처리한다', () => {
  mount()
  turn('hhh')
  clock += 500
  const btn = screen.getByRole('button', { name: '다음 사람' })
  fireEvent.click(btn)
  clock += 100
  const again = screen.queryByRole('button', { name: /^(다음 사람|결과 보기)$/ })
  if (again) fireEvent.click(again)
  expect(screen.getByText(`👉 ${pieceLabel(order[1])} 차례예요`)).toBeTruthy()
})

test('언마운트하면 타이머를 정리하고 onFinish를 부르지 않는다', () => {
  const { onFinish, unmount } = mount()
  turn('hhm')
  next()
  turn('mmm')
  next()
  turn('hhh')
  next()
  unmount()
  advance(10000)
  expect(onFinish).not.toHaveBeenCalled()
  expect(vi.getTimerCount()).toBe(0)
})

test('비행 중 언마운트해도 안전하다', () => {
  const { onFinish, unmount } = mount()
  pullAndRelease(...HIT, 100)
  unmount()
  advance(5000)
  expect(onFinish).not.toHaveBeenCalled()
  expect(vi.getTimerCount()).toBe(0)
})
