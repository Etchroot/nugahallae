import { expect, test, vi } from 'vitest'
import { render } from '@testing-library/react'
import { PlayScreen } from '../PlayScreen'
import { NextButton } from '../../games/shared/NextButton'
import { drawPieces } from '../../domain/pieces'
import type { GameDefinition } from '../../games/types'
import { stopAllSounds } from '../../platform/sound'

vi.mock('../../platform/sound', () => ({ stopAllSounds: vi.fn() }))

const game = {
  id: 'dummy',
  icon: '🧪',
  title: '테스트',
  summary: '',
  rule: '',
  tint: '#fff',
  Component: () => <NextButton last={false} onNext={() => {}} />,
} as unknown as GameDefinition

test('게임 화면은 기본 클릭음을 끄고(data-silent), 다음 사람 버튼만 클릭음을 켠다(data-click)', () => {
  const { container, getByRole } = render(
    <PlayScreen game={game} order={drawPieces(2, () => 0.5)} onFinish={() => {}} />,
  )
  expect(container.querySelector('.play-root')?.hasAttribute('data-silent')).toBe(true)
  expect(getByRole('button').hasAttribute('data-click')).toBe(true)
})

test('게임 화면을 떠나면 모든 소리를 끈다', () => {
  const { unmount } = render(<PlayScreen game={game} order={drawPieces(2, () => 0.5)} onFinish={() => {}} />)
  expect(stopAllSounds).not.toHaveBeenCalled()
  unmount()
  expect(stopAllSounds).toHaveBeenCalledTimes(1)
})
