import { test, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NextButton } from '../NextButton'

test('버튼 문구: 다음 사람 / 결과 보기, 클릭하면 onNext', () => {
  const onNext = vi.fn()
  const { rerender } = render(<NextButton last={false} onNext={onNext} />)
  fireEvent.click(screen.getByRole('button', { name: '다음 사람' }))
  expect(onNext).toHaveBeenCalledTimes(1)
  rerender(<NextButton last onNext={onNext} />)
  expect(screen.getByRole('button', { name: '결과 보기' })).toBeTruthy()
})
