import { test, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NextButton } from '../NextButton'

test('버튼 문구: 다음 사람 / 결과 보기', () => {
  const { rerender } = render(<NextButton last={false} onNext={() => {}} />)
  expect(screen.getByRole('button', { name: '다음 사람' })).toBeTruthy()
  rerender(<NextButton last onNext={() => {}} />)
  expect(screen.getByRole('button', { name: '결과 보기' })).toBeTruthy()
})

test('더블탭(400ms 안)은 한 번만 처리, 이후 탭은 처리', () => {
  let t = 1000
  const onNext = vi.fn()
  render(<NextButton last={false} onNext={onNext} now={() => t} />)
  const b = screen.getByRole('button', { name: '다음 사람' })
  fireEvent.click(b)
  t += 100
  fireEvent.click(b)
  expect(onNext).toHaveBeenCalledTimes(1)
  t += 400
  fireEvent.click(b)
  expect(onNext).toHaveBeenCalledTimes(2)
})
