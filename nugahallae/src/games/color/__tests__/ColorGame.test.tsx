import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { drawPieces, pieceLabel } from '../../../domain/pieces'
import { ColorGame } from '../ColorGame'
import { COLORS, makeQuestions } from '../logic'
import { RECORD_END_MS } from '../../shared/timing'
import { haptic } from '../../../platform/sdk'

vi.mock('../../../platform/sdk', () => ({ haptic: vi.fn(async () => {}) }))

const order = drawPieces(3, () => 0.5)
let clock = 0
const now = () => clock
const RULE = '글자 뜻 말고 색을 골라요! 가장 느리면 벌칙'
const seededRng = () => {
  let s = 42
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}
const QS = makeQuestions(seededRng())

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
const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })
const mount = (onFinish = vi.fn(), people = order) => {
  render(<ColorGame order={people} onFinish={onFinish} rng={seededRng()} now={now} />)
  return onFinish
}
const answer = (name: string) => fireEvent.pointerDown(screen.getByRole('button', { name }))
const inkNow = () => screen.getByTestId('color-word').getAttribute('data-ink')!
const nameOf = (id: string) => COLORS.find((c) => c.id === id)!.name
const startRound = () => {
  clock += 500
  fireEvent.click(screen.getByRole('button', { name: '시작' }))
  advance(2100)
}
/** 10문제를 모두 맞힌다. 첫 문제 표시 후 총 totalMs(>=5000)에 마지막 정답 */
const run = (totalMs: number, wrongs = 0) => {
  startRound()
  for (let i = 0; i < wrongs; i++) {
    clock += 200
    const wrongName = nameOf(inkNow() === COLORS[0].id ? COLORS[1].id : COLORS[0].id)
    answer(wrongName)
    advance(200)
  }
  const spent = wrongs * 200
  for (let q = 0; q < 10; q++) {
    clock += q === 9 ? totalMs - spent - 9 * 500 : 500
    answer(nameOf(inkNow()))
  }
}
const next = () => {
  clock += 500
  fireEvent.click(screen.getByRole('button', { name: /^(다음 사람|결과 보기)$/ }))
}

test('규칙 띠·차례·시작 버튼', () => {
  mount()
  expect(screen.getByText(RULE)).toBeTruthy()
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  expect(screen.getByRole('button', { name: '시작' })).toBeTruthy()
})

test('3·2·1 뒤 첫 문제와 답 버튼 4개(고정 순서)', () => {
  mount()
  clock += 500
  fireEvent.click(screen.getByRole('button', { name: '시작' }))
  expect(screen.getByText('3')).toBeTruthy()
  advance(700)
  expect(screen.getByText('2')).toBeTruthy()
  advance(700)
  expect(screen.getByText('1')).toBeTruthy()
  advance(700)
  const word = screen.getByTestId('color-word')
  expect(word.getAttribute('data-ink')).toBe(QS[0].ink)
  expect(word.textContent).toBe(nameOf(QS[0].word))
  const names = screen.getAllByTestId('color-answer').map((b) => b.textContent)
  expect(names).toEqual(['빨강', '파랑', '노랑', '보라'])
  expect(screen.getByTestId('color-progress').textContent).toBe('1 / 10')
})

test('모든 사람이 같은 10문제', () => {
  mount()
  const seen: string[][] = []
  for (let p = 0; p < 2; p++) {
    startRound()
    const seq: string[] = []
    for (let q = 0; q < 10; q++) {
      seq.push(`${screen.getByTestId('color-word').textContent}/${inkNow()}`)
      clock += 500
      answer(nameOf(inkNow()))
    }
    seen.push(seq)
    next()
  }
  expect(seen[0]).toEqual(seen[1])
  expect(seen[0]).toEqual(QS.map((q) => `${nameOf(q.word)}/${q.ink}`))
})

test('오답이면 같은 문제 유지, +1초, 버튼 200ms 흔들림', () => {
  mount()
  startRound()
  clock += 500
  const wrong = QS[0].ink === 'red' ? '파랑' : '빨강'
  answer(wrong)
  expect(screen.getByTestId('color-progress').textContent).toBe('1 / 10')
  expect(screen.getByTestId('color-word').getAttribute('data-ink')).toBe(QS[0].ink)
  expect(screen.getByTestId('color-answers').className).toContain('cg-shake')
  advance(199)
  expect(screen.getByTestId('color-answers').className).toContain('cg-shake')
  advance(1)
  expect(screen.getByTestId('color-answers').className).not.toContain('cg-shake')
})

test('시간 = 첫 문제 표시~10번째 정답 + 오답당 1초', () => {
  mount()
  run(10000, 1)
  expect(screen.getByText('11.00초 (실수 1)')).toBeTruthy()
})

test('실수 없으면 `{t}초`', () => {
  mount()
  run(8000)
  expect(screen.getByText('8.00초')).toBeTruthy()
})

test('문제 전환 직후 120ms 동안 입력 무시', () => {
  mount()
  startRound()
  clock += 500
  answer(nameOf(QS[0].ink)) // 정답, 다음 문제로
  expect(screen.getByTestId('color-progress').textContent).toBe('2 / 10')
  clock += 119
  answer(nameOf(QS[1].ink)) // 무시
  expect(screen.getByTestId('color-progress').textContent).toBe('2 / 10')
  clock += 1
  answer(nameOf(QS[1].ink))
  expect(screen.getByTestId('color-progress').textContent).toBe('3 / 10')
})

test('시작 직후(첫 문제 표시 후)에도 120ms 입력 무시, 무시된 입력은 오답 아님', () => {
  mount()
  startRound()
  clock += 50
  answer(nameOf(QS[0].ink === 'red' ? 'blue' : 'red'))
  expect(screen.getByTestId('color-answers').className).not.toContain('cg-shake')
  clock += 70
  answer(nameOf(QS[0].ink))
  expect(screen.getByTestId('color-progress').textContent).toBe('2 / 10')
})

test('모두 끝나면 가장 느린 사람이 onFinish로 1회, 햅틱 error 1회', () => {
  const onFinish = mount()
  run(9000)
  next()
  run(12000)
  next()
  run(10000)
  expect(screen.queryByRole('button', { name: '다음 사람' })).toBeNull()
  next()
  const items = screen.getAllByRole('listitem')
  expect(items[2].textContent).toContain(pieceLabel(order[1]))
  expect(items[2].className).toContain('rg-lose')
  expect(screen.getByText(`${pieceLabel(order[1])} 12.00초로 가장 느렸어요`)).toBeTruthy()
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledWith('error')
  advance(RECORD_END_MS - 1)
  expect(onFinish).not.toHaveBeenCalled()
  advance(1)
  advance(5000)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledWith(order[1])
})

test('다음 사람 연타 가드', () => {
  mount()
  run(9000)
  clock += 100
  fireEvent.click(screen.getByRole('button', { name: '다음 사람' }))
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  clock += 400
  fireEvent.click(screen.getByRole('button', { name: '다음 사람' }))
  expect(screen.getByText(`👉 ${pieceLabel(order[1])} 차례예요`)).toBeTruthy()
})

test('카운트다운·플레이 중 백그라운드 → 무효, 같은 사람이 다시', () => {
  mount()
  clock += 500
  fireEvent.click(screen.getByRole('button', { name: '시작' }))
  advance(700)
  setVisibility('hidden')
  act(() => { document.dispatchEvent(new Event('visibilitychange')) })
  setVisibility('visible')
  advance(5000)
  expect(screen.queryByTestId('color-word')).toBeNull()
  expect(screen.getByText('다시 해 주세요')).toBeTruthy()

  startRound()
  clock += 500
  answer(nameOf(QS[0].ink))
  setVisibility('hidden')
  act(() => { document.dispatchEvent(new Event('visibilitychange')) })
  setVisibility('visible')
  expect(screen.queryByTestId('color-word')).toBeNull()
  expect(screen.getByText('다시 해 주세요')).toBeTruthy()
  expect(screen.getByText(`👉 ${pieceLabel(order[0])} 차례예요`)).toBeTruthy()
  run(7000)
  expect(screen.getByText('7.00초')).toBeTruthy()
  expect(screen.queryByText('다시 해 주세요')).toBeNull()
})

test('진행 중 언마운트 → onFinish·햅틱 없음, 타이머 정리', () => {
  const onFinish = vi.fn()
  const { unmount } = render(<ColorGame order={order} onFinish={onFinish} rng={seededRng()} now={now} />)
  fireEvent.click(screen.getByRole('button', { name: '시작' }))
  advance(2100)
  clock += 500
  answer('빨강')
  unmount()
  expect(vi.getTimerCount()).toBe(0)
  advance(20000)
  expect(onFinish).not.toHaveBeenCalled()
  expect(haptic).not.toHaveBeenCalled()
})

test('결과 연출 도중 언마운트 → onFinish 미호출', () => {
  const onFinish = vi.fn()
  const { unmount } = render(<ColorGame order={drawPieces(2, () => 0.5)} onFinish={onFinish} rng={seededRng()} now={now} />)
  run(5000)
  next()
  run(6000)
  next()
  advance(600)
  unmount()
  advance(5000)
  expect(onFinish).not.toHaveBeenCalled()
})
