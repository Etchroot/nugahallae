import { beforeEach, expect, test, vi } from 'vitest'
import { PIECES } from '../../domain/pieces'
import {
  ANIMAL_VOICES,
  isSoundEnabled,
  loadSound,
  playAnimal,
  playClick,
  playResult,
  resetSoundForTest,
  setSoundEnabled,
} from '../sound'

function fakeContext() {
  const made = { osc: 0, ctx: 0 }
  const param = () => ({ value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() })
  const node = () => ({ connect: vi.fn() })
  const factory = () => {
    made.ctx++
    return {
      currentTime: 0,
      state: 'running',
      destination: {},
      resume: vi.fn(),
      createGain: () => ({ ...node(), gain: param() }),
      createBiquadFilter: () => ({ ...node(), type: '', frequency: param() }),
      createOscillator: () => {
        made.osc++
        return { ...node(), type: '', frequency: param(), start: vi.fn(), stop: vi.fn() }
      },
    } as unknown as AudioContext
  }
  return { made, factory }
}

beforeEach(() => {
  localStorage.clear()
})

test('동물 10종 모두 울음소리가 있고, 앱의 동물 id와 정확히 같다', () => {
  expect(Object.keys(ANIMAL_VOICES).sort()).toEqual(PIECES.map((p) => p.id).sort())
})

test('동물마다 소리를 낸다', () => {
  for (const p of PIECES) {
    const { made, factory } = fakeContext()
    resetSoundForTest(factory)
    playAnimal(p.id)
    expect(made.osc, p.id).toBeGreaterThanOrEqual(ANIMAL_VOICES[p.id].length)
  }
})

test('클릭음과 결과음도 소리를 낸다', () => {
  const { made, factory } = fakeContext()
  resetSoundForTest(factory)
  playClick()
  const afterClick = made.osc
  expect(afterClick).toBeGreaterThan(0)
  playResult('fox')
  expect(made.osc).toBeGreaterThan(afterClick)
})

test('꺼 두면 오디오를 만들지도 않는다', () => {
  const { made, factory } = fakeContext()
  resetSoundForTest(factory)
  setSoundEnabled(false)
  playClick()
  playAnimal('pig')
  expect(made.ctx).toBe(0)
  expect(made.osc).toBe(0)
})

test('모르는 동물이나 오디오가 없는 환경에서도 throw하지 않는다', () => {
  const { factory } = fakeContext()
  resetSoundForTest(factory)
  expect(() => playAnimal('dragon')).not.toThrow()
  resetSoundForTest(() => {
    throw new Error('no audio')
  })
  expect(() => {
    playClick()
    playResult('bear')
  }).not.toThrow()
})

test('켜짐/꺼짐이 저장되고 다시 불러온다', async () => {
  const { factory } = fakeContext()
  resetSoundForTest(factory)
  setSoundEnabled(false)
  await Promise.resolve()
  expect(isSoundEnabled()).toBe(false)
  resetSoundForTest(factory)
  expect(await loadSound()).toBe(false)
  setSoundEnabled(true)
  await vi.waitFor(async () => {
    resetSoundForTest(factory)
    expect(await loadSound()).toBe(true)
  })
})
