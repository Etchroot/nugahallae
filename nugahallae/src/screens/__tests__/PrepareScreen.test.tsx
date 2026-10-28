import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent, within } from '@testing-library/react'
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

test('확인 상태 문구에 pieceLabel이 쓰인다', () => {
  setup(2)
  fireEvent.click(cards()[0])
  const id = cards()[0].getAttribute('data-piece-id')
  expect(id).toBeTruthy()
  expect(screen.getByText(/— 내 말을 기억하세요/).textContent).toMatch(/^(.+) — 내 말을 기억하세요$/)
  expect(typeof pieceLabel).toBe('function')
})
