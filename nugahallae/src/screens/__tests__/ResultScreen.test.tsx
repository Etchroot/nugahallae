import { test, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { TDSMobileAITProvider } from '@toss/tds-mobile-ait'

vi.mock('../../platform/sdk', () => ({
  haptic: vi.fn(async () => {}),
}))

import { ResultScreen } from '../ResultScreen'
import { PIECES } from '../../domain/pieces'
import { haptic } from '../../platform/sdk'

afterEach(() => {
  cleanup()
  vi.mocked(haptic).mockClear()
})

function renderResult() {
  return render(
    <TDSMobileAITProvider brandPrimaryColor="#3182F6">
      <ResultScreen loser={PIECES[0]} onAgain={() => {}} onOtherGame={() => {}} />
    </TDSMobileAITProvider>,
  )
}

test('벌칙자를 기다림 없이 바로 보여 준다', () => {
  renderResult()
  expect(screen.getByText('🦊 주황 여우 걸렸다!')).toBeInTheDocument()
  expect(screen.queryByText('두구두구…')).not.toBeInTheDocument()
})

test('결과를 보여 줄 때 진동은 한 번만 울린다', () => {
  const { rerender } = renderResult()
  rerender(
    <TDSMobileAITProvider brandPrimaryColor="#3182F6">
      <ResultScreen loser={PIECES[0]} onAgain={() => {}} onOtherGame={() => {}} />
    </TDSMobileAITProvider>,
  )
  expect(haptic).toHaveBeenCalledTimes(1)
  expect(haptic).toHaveBeenCalledWith('success')
})
