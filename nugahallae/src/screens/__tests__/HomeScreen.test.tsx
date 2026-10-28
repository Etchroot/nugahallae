import { test, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HomeScreen } from '../HomeScreen'
import { GAMES } from '../../games/registry'

function renderHome(onPickGame = vi.fn()) {
  render(<HomeScreen onPickGame={onPickGame} />)
  return onPickGame
}
const search = () => screen.getByPlaceholderText('어떤 게임 할까요?')
const cards = () => screen.getAllByTestId('game-card')

test('히어로 문구와 검색창', () => {
  renderHome()
  expect(screen.getByText('폰 하나로 정하는')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: '누가할래' })).toBeInTheDocument()
  expect(screen.getByText(/오늘의 벌칙,/)).toBeInTheDocument()
  expect(screen.getByText(/게임 한 판으로 끝!/)).toBeInTheDocument()
  expect(search()).toBeInTheDocument()
})

test('카드는 registry 수와 같고 개수가 보인다', () => {
  renderHome()
  expect(cards()).toHaveLength(GAMES.length)
  expect(screen.getByText('게임 고르기')).toBeInTheDocument()
  expect(screen.getByText('3개')).toBeInTheDocument()
  expect(screen.getByText('인기')).toBeInTheDocument()
  expect(screen.getByText('NEW')).toBeInTheDocument()
})

test('검색: 부분 일치, 공백 무시, 결과 없음, 지우면 복귀', () => {
  renderHome()
  fireEvent.change(search(), { target: { value: '잔' } })
  expect(cards()).toHaveLength(1)
  expect(screen.getByText('잔 채우기')).toBeInTheDocument()
  expect(screen.getByText('1개')).toBeInTheDocument()
  fireEvent.change(search(), { target: { value: '  사다리 ' } })
  expect(cards()).toHaveLength(1)
  expect(screen.getByText('사다리 타기')).toBeInTheDocument()
  fireEvent.change(search(), { target: { value: '없는게임' } })
  expect(screen.queryAllByTestId('game-card')).toHaveLength(0)
  expect(screen.getByText("'없는게임'에 맞는 게임이 없어요")).toBeInTheDocument()
  fireEvent.change(search(), { target: { value: '' } })
  expect(cards()).toHaveLength(3)
  expect(screen.getByText('3개')).toBeInTheDocument()
})

test('한 줄 설명으로도 검색된다', () => {
  renderHome()
  fireEvent.change(search(), { target: { value: '꾹 눌러' } })
  expect(cards()).toHaveLength(1)
})

test('홈에 인원수·벌칙 입력이 없다', () => {
  renderHome()
  expect(screen.queryByText('인원수')).not.toBeInTheDocument()
  expect(screen.queryByLabelText('인원 늘리기')).not.toBeInTheDocument()
  expect(screen.queryByPlaceholderText(/벌칙/)).not.toBeInTheDocument()
})

test('카드를 누르면 onPickGame', () => {
  const pick = renderHome()
  fireEvent.click(screen.getByText('돌림판'))
  expect(pick).toHaveBeenCalledWith('roulette')
})
