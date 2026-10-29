import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent, within, cleanup } from '@testing-library/react'
import { TDSMobileAITProvider } from '@toss/tds-mobile-ait'
import { PrepareScreen } from '../PrepareScreen'
import { pieceLabel } from '../../domain/pieces'
import type { Piece } from '../../domain/pieces'
import type { GameDefinition } from '../../games/types'

const game = { title: '돌림판', rule: '규칙' } as unknown as GameDefinition

function setup(count = 4) {
  const onStart = vi.fn<(order: Piece[]) => void>()
  render(
    <TDSMobileAITProvider brandPrimaryColor="#3182F6">
      <PrepareScreen game={game} initialCount={count} onCountChosen={() => {}} onStart={onStart} />
    </TDSMobileAITProvider>,
  )
  fireEvent.click(screen.getByText('말 뽑기 시작'))
  return { onStart }
}

const cards = () => screen.getAllByTestId('piece-card')
const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms) })

/** 카드 i번을 골라 확인까지 마친다 */
async function pick(i: number) {
  fireEvent.click(cards()[i])
  await advance(400)
  fireEvent.click(screen.getByText('확인했어요'))
  await advance(400)
}

function renderRange(def: Partial<GameDefinition>, initialCount: number) {
  const onCountChosen = vi.fn<(n: number) => void>()
  render(
    <TDSMobileAITProvider brandPrimaryColor="#3182F6">
      <PrepareScreen
        game={{ title: 't', rule: 'r', ...def } as unknown as GameDefinition}
        initialCount={initialCount}
        onCountChosen={onCountChosen}
        onStart={() => {}}
      />
    </TDSMobileAITProvider>,
  )
  return { onCountChosen }
}
const minus = () => screen.getByLabelText('인원 줄이기') as HTMLButtonElement
const plus = () => screen.getByLabelText('인원 늘리기') as HTMLButtonElement
const shown = () => screen.getByTestId('player-count').textContent

test('minPlayers 3: 저장값 2도 3부터 보이고 −는 3에서 막힌다', () => {
  renderRange({ minPlayers: 3 }, 2)
  expect(shown()).toBe('3명')
  expect(minus()).toBeDisabled()
  fireEvent.click(plus())
  expect(shown()).toBe('4명')
  fireEvent.click(minus())
  expect(shown()).toBe('3명')
  expect(minus()).toBeDisabled()
})

test('maxPlayers 6: 저장값 8도 6으로 보이고 +는 막힌다, 건드리지 않고 시작하면 저장값을 바꾸지 않는다', () => {
  const { onCountChosen } = renderRange({ maxPlayers: 6, pieceMode: 'auto' }, 8)
  expect(shown()).toBe('6명')
  expect(plus()).toBeDisabled()
  fireEvent.click(screen.getByText('시작하기'))
  expect(onCountChosen).not.toHaveBeenCalled()
})

test('범위 안에서 사용자가 바꾸면 저장한다', () => {
  const { onCountChosen } = renderRange({ maxPlayers: 6, pieceMode: 'auto' }, 8)
  fireEvent.click(minus())
  fireEvent.click(screen.getByText('시작하기'))
  expect(onCountChosen).toHaveBeenCalledWith(5)
})

test('기본 범위는 2~10명(기존 게임 그대로)', () => {
  renderRange({}, 2)
  expect(minus()).toBeDisabled()
  cleanup()
  renderRange({}, 10)
  expect(plus()).toBeDisabled()
  expect(shown()).toBe('10명')
})

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => vi.useRealTimers())

test.each([2, 10])('말 뽑기 시작 후 %i명이면 카드 %i장이 한 번에 보인다', (n) => {
  setup(n)
  expect(cards()).toHaveLength(n)
  expect(screen.getByText('1번째 사람, 내 말을 하나 골라요')).toBeInTheDocument()
  expect(screen.queryByText('시작하기')).not.toBeInTheDocument()
  expect(screen.queryByText('다시 고르기')).not.toBeInTheDocument()
})

test('카드 탭 → 확인 상태 → 확인했어요 → 다음 사람 안내, 고른 카드는 선택됨·비활성', async () => {
  setup(3)
  const first = cards()[1]
  const label = first.textContent!
  fireEvent.click(first)
  expect(screen.getByText(/— 내 말을 기억하세요/)).toBeInTheDocument()
  expect(screen.getByText('확인했어요')).toBeInTheDocument()
  await advance(400)
  fireEvent.click(screen.getByText('확인했어요'))
  expect(screen.getByText('2번째 사람, 내 말을 하나 골라요')).toBeInTheDocument()
  expect(within(cards()[1]).getByText('선택됨')).toBeInTheDocument()
  expect(cards()[1]).toBeDisabled()
  expect(cards()[1].textContent).toContain(label.replace('선택됨', ''))
  expect(cards()[0]).not.toBeDisabled()
})

test('확인 상태에서 다른 카드 탭은 무시된다', async () => {
  setup(3)
  fireEvent.click(cards()[0])
  await advance(1000)
  fireEvent.click(cards()[1])
  expect(screen.getByText(/— 내 말을 기억하세요/)).toBeInTheDocument()
  await advance(400)
  fireEvent.click(screen.getByText('확인했어요'))
  expect(screen.getByText('2번째 사람, 내 말을 하나 골라요')).toBeInTheDocument()
  expect(within(cards()[1]).queryByText('선택됨')).not.toBeInTheDocument()
})

test('400ms 안 연타: 카드 탭 직후 확인했어요는 무시된다', async () => {
  setup(3)
  fireEvent.click(cards()[0])
  fireEvent.click(screen.getByText('확인했어요'))
  expect(screen.getByText(/— 내 말을 기억하세요/)).toBeInTheDocument()
  await advance(400)
  fireEvent.click(screen.getByText('확인했어요'))
  fireEvent.click(cards()[1]) // 확인 직후 카드 탭도 무시
  expect(screen.getByText('2번째 사람, 내 말을 하나 골라요')).toBeInTheDocument()
  expect(screen.queryByText(/— 내 말을 기억하세요/)).not.toBeInTheDocument()
})

test('모두 고르면 시작하기 → onStart는 고른 순서의 말 배열', async () => {
  const { onStart } = setup(3)
  const names = cards().map((c) => c.getAttribute('data-piece-id')!)
  await pick(2)
  await pick(0)
  await pick(1)
  expect(screen.queryByText(/번째 사람, 내 말을 하나 골라요/)).not.toBeInTheDocument()
  fireEvent.click(screen.getByText('시작하기'))
  expect(onStart).toHaveBeenCalledTimes(1)
  const got = onStart.mock.calls[0][0].map((p) => p.id)
  expect(got).toEqual([names[2], names[0], names[1]])
})

test('다시 고르기: 하나 이상 고른 뒤 보이고, 선택 초기화·같은 말 집합·1번째 사람부터', async () => {
  setup(3)
  const before = cards().map((c) => c.getAttribute('data-piece-id'))
  expect(screen.queryByText('다시 고르기')).not.toBeInTheDocument()
  await pick(1)
  await pick(0)
  fireEvent.click(screen.getByText('다시 고르기'))
  expect(screen.getByText('1번째 사람, 내 말을 하나 골라요')).toBeInTheDocument()
  expect(screen.queryByText('선택됨')).not.toBeInTheDocument()
  expect(cards().map((c) => c.getAttribute('data-piece-id'))).toEqual(before)
  expect(screen.queryByText('다시 고르기')).not.toBeInTheDocument()
  expect(cards().every((c) => !(c as HTMLButtonElement).disabled)).toBe(true)
})

test("pieceMode 'auto' 게임은 말 카드 없이 시작하기만, onStart는 인원수 길이의 말 배열", async () => {
  const onStart = vi.fn<(order: Piece[]) => void>()
  const onCountChosen = vi.fn()
  const auto = { title: '손가락 룰렛', rule: '규칙', pieceMode: 'auto' } as unknown as GameDefinition
  render(
    <TDSMobileAITProvider brandPrimaryColor="#3182F6">
      <PrepareScreen game={auto} initialCount={4} onCountChosen={onCountChosen} onStart={onStart} />
    </TDSMobileAITProvider>,
  )
  expect(screen.getByText('이 게임은 손가락을 올리는 순서대로 말이 정해져요')).toBeInTheDocument()
  expect(screen.queryByText('말 뽑기 시작')).not.toBeInTheDocument()
  expect(screen.queryAllByTestId('piece-card')).toHaveLength(0)
  fireEvent.click(screen.getByLabelText('인원 늘리기'))
  await advance(400)
  fireEvent.click(screen.getByText('시작하기'))
  expect(onCountChosen).toHaveBeenCalledWith(5)
  expect(onStart).toHaveBeenCalledTimes(1)
  const got = onStart.mock.calls[0][0]
  expect(got).toHaveLength(5)
  expect(new Set(got.map((p) => p.id)).size).toBe(5)
})

test('확인 상태 문구에 pieceLabel이 쓰인다', () => {
  setup(2)
  fireEvent.click(cards()[0])
  const id = cards()[0].getAttribute('data-piece-id')
  expect(id).toBeTruthy()
  expect(screen.getByText(/— 내 말을 기억하세요/).textContent).toMatch(/^(.+) — 내 말을 기억하세요$/)
  expect(typeof pieceLabel).toBe('function')
})
