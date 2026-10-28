import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { drawPieces, pieceLabel } from '../../../domain/pieces'
import { TraceGame } from '../TraceGame'
import { makePath, totalLength, progressDist } from '../logic'
import { RECORD_END_MS } from '../../shared/timing'
import { haptic } from '../../../platform/sdk'

vi.mock('../../../platform/sdk', () => ({ haptic: vi.fn(async () => {}) }))

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const order = drawPieces(3, () => 0.5)
const path = makePath(seeded(11))
const total = totalLength(path)
let clock = 0
const now = () => clock

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(haptic).mockClear()
  clock = 0
})
afterEach(() => vi.useRealTimers())

const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })

/** rng: 첫 호출들은 길 생성(같은 시드), 이후 정산용으로도 같은 수열을 계속 쓴다 */
const mount = (onFinish = vi.fn(), people = order) => {
  render(<TraceGame order={people} onFinish={onFinish} rng={seeded(11)} now={now} />)
  return onFinish
}
const area = () => screen.getByTestId('trace-area')
const ev = (type: 'pointerDown' | 'pointerMove' | 'pointerUp', x: number, y: number) => {
  const fire = fireEvent[type]
  fire(area(), { clientX: x, clientY: y, pointerId: 1 })
}
/** 지정한 점에서 클릭이 아닌 포인터 시퀀스 헬퍼 */
const startAt = (x = path[0].x, y = path[0].y) => {
  clock += 500
  ev('pointerDown', x, y)
}
const trace = (upTo: number) => {
  // 꺾임점 upTo까지 중심선을 따라 이동
  for (let i = 1; i <= upTo; i++) {
    const a = path[i - 1]
    const b = path[i]
    for (let k = 1; k <= 4; k++) {
      clock += 20
      ev('pointerMove', a.x + ((b.x - a.x) * k) / 4, a.y + ((b.y - a.y) * k) / 4)
    }
  }
}
const next = () => {
  clock += 500
  fireEvent.click(screen.getByRole('button', { name: /^(다음 사람|결과 보기)$/ }))
}
/** 첫 꺾임점까지만 가서 손 떼기 */
const failByRelease = (upTo: number) => {
  startAt()
  trace(upTo)
  ev('pointerUp', path[upTo].x, path[upTo].y)
}
const pctAt = (i: number) => {
  const sub = path.slice(0, i + 1)
  return Math.floor((totalLength(sub) / total) * 100)
}

test('규칙 띠·차례·시작 안내가 보인다', () => {
  mount()
  expect(screen.getByText('벽에 닿으면 끝! 가장 짧게 가면 벌칙')).toBeTruthy()
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  expect(screen.getByText('시작 원에 손가락을 올리고 따라가요')).toBeTruthy()
})

test('시작 원 밖에서 누르면 시작되지 않는다', () => {
  mount()
  startAt(path[0].x + 100, path[0].y + 100)
  trace(2)
  expect(screen.queryByRole('button', { name: /^(다음 사람|결과 보기)$/ })).toBeNull()
  // 아직 시작 전이라 손을 떼도 기록은 없다
  ev('pointerUp', 0, 0)
  expect(screen.queryByRole('button', { name: /^(다음 사람|결과 보기)$/ })).toBeNull()
})

test('길을 따라가다 벽을 벗어나면 그 진행률로 기록, 햅틱 tap 1회', () => {
  mount()
  startAt()
  trace(3)
  ev('pointerMove', 0, path[3].y + 150)
  const expected = Math.floor(
    (progressDist(path[3], path) / total) * 100,
  )
  expect(screen.getByText(`${expected}%`)).toBeTruthy()
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledWith('tap')
  // 이후 움직임·손 떼기는 무시
  ev('pointerMove', path[4].x, path[4].y)
  ev('pointerUp', path[4].x, path[4].y)
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('button', { name: '다음 사람' })).toBeTruthy()
  expect(screen.getByLabelText('실패 지점')).toBeTruthy()
})

test('손을 떼면 실패', () => {
  mount()
  failByRelease(2)
  expect(screen.getByText(`${pctAt(2)}%`)).toBeTruthy()
  expect(screen.getByRole('button', { name: '다음 사람' })).toBeTruthy()
})

test('도착선에 닿으면 완주 시간이 기록된다', () => {
  mount()
  startAt()
  trace(path.length - 1)
  expect(screen.getByText(/^완주 \d+\.\d\d초$/)).toBeTruthy()
  expect(haptic).not.toHaveBeenCalled()
})

test('모두 끝나면 순위, 가장 짧게 간 사람이 벌칙 → onFinish 1회', () => {
  const onFinish = mount()
  failByRelease(5)
  next()
  expect(screen.getByText(`👉 ${pieceLabel(order[1])} 차례예요`)).toBeTruthy()
  failByRelease(2)
  next()
  failByRelease(7)
  vi.mocked(haptic).mockClear()
  next() // 결과 보기
  const items = screen.getAllByRole('listitem')
  expect(items[2].textContent).toContain(pieceLabel(order[1]))
  expect(items[2].className).toContain('rg-lose')
  expect(screen.getByText(`${pieceLabel(order[1])} ${pctAt(2)}%에서 멈췄어요`)).toBeTruthy()
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledWith('error')
  advance(RECORD_END_MS - 1)
  expect(onFinish).not.toHaveBeenCalled()
  advance(1)
  advance(5000)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledWith(order[1])
})

test('모두 완주하면 가장 느린 사람이 꼴찌', () => {
  const onFinish = mount(vi.fn(), drawPieces(2, () => 0.5))
  startAt()
  trace(path.length - 1)
  next()
  startAt()
  // 느리게(각 이동 사이 시간을 더 줌)
  clock += 3000
  trace(path.length - 1)
  next()
  expect(screen.getByText(/가장 느렸어요$/)).toBeTruthy()
  advance(RECORD_END_MS)
  expect(onFinish).toHaveBeenCalledWith(drawPieces(2, () => 0.5)[1])
})

test('실패 직후(100ms 안) 다음 사람 연타는 건너뛰지 않는다', () => {
  mount()
  failByRelease(2)
  clock += 100
  fireEvent.click(screen.getByRole('button', { name: '다음 사람' }))
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  clock += 400
  fireEvent.click(screen.getByRole('button', { name: '다음 사람' }))
  expect(screen.getByText(`👉 ${pieceLabel(order[1])} 차례예요`)).toBeTruthy()
})

test('진행 중·연출 중 언마운트 → onFinish 미호출', () => {
  const onFinish = vi.fn()
  const two = drawPieces(2, () => 0.5)
  const { unmount } = render(<TraceGame order={two} onFinish={onFinish} rng={seeded(11)} now={now} />)
  startAt()
  trace(2)
  ev('pointerUp', path[2].x, path[2].y)
  next()
  startAt()
  trace(1)
  ev('pointerUp', path[1].x, path[1].y)
  next()
  advance(600)
  unmount()
  advance(5000)
  expect(onFinish).not.toHaveBeenCalled()
})
