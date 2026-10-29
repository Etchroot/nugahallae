import { beforeEach, expect, test, vi } from 'vitest'
import {
  LOOPS,
  MAX_ACTIVE,
  SFX,
  notePitch,
  playSfx,
  playTickTrain,
  resetSoundForTest,
  setSoundEnabled,
  startLoop,
  stopAllSounds,
} from '../sound'
import type { SfxName } from '../sound'

// 노이즈·루프까지 흉내 내는 가짜 AudioContext. 만든 소스와 stop 호출을 센다.
function fakeContext() {
  const made = { ctx: 0, osc: 0, noise: 0, buffers: 0, stops: 0 }
  const sources: { stop: ReturnType<typeof vi.fn> }[] = []
  const param = () => ({
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  })
  const node = () => ({ connect: vi.fn() })
  const c = {
    currentTime: 0,
    sampleRate: 1000,
    state: 'running',
    destination: {},
    resume: vi.fn(),
    createGain: () => ({ ...node(), gain: param() }),
    createBiquadFilter: () => ({ ...node(), type: '', frequency: param(), Q: param() }),
    createOscillator: () => {
      made.osc++
      const s = { ...node(), type: '', frequency: param(), start: vi.fn(), stop: vi.fn(() => made.stops++) }
      sources.push(s)
      return s
    },
    createBuffer: (_ch: number, len: number) => {
      made.buffers++
      const data = new Float32Array(len)
      return { getChannelData: () => data }
    },
    createBufferSource: () => {
      made.noise++
      const s = { ...node(), buffer: null, loop: false, start: vi.fn(), stop: vi.fn(() => made.stops++) }
      sources.push(s)
      return s
    },
  }
  const factory = () => {
    made.ctx++
    return c as unknown as AudioContext
  }
  return { made, c, sources, factory }
}

beforeEach(() => {
  localStorage.clear()
})

const names = Object.keys(SFX) as SfxName[]

test('모든 효과음이 소리를 내고 throw하지 않는다', () => {
  for (const name of names) {
    const { made, factory } = fakeContext()
    resetSoundForTest(factory)
    expect(() => playSfx(name)).not.toThrow()
    expect(made.osc + made.noise, name).toBeGreaterThan(0)
  }
})

test('효과음 음량은 0.6 이하이고, 한 번에 1.2초를 넘지 않는다', () => {
  for (const name of names) {
    for (const v of SFX[name].voices) {
      expect(v.gain ?? 0.4, name).toBeLessThanOrEqual(0.6)
      expect(v.at + v.dur, name).toBeLessThanOrEqual(1.2)
    }
  }
})

test('게임이 끝날 때 쓰는 소리는 0.45초 안에 끝난다(결과 화면 소리와 겹치지 않게)', () => {
  const endings: SfxName[] = ['loseSting', 'pour.splash', 'balloon.pop', 'croc.chomp', 'tower.collapse', 'nunchi.clash']
  for (const name of endings) {
    const end = Math.max(...SFX[name].voices.map((v) => v.at + v.dur))
    expect(end, name).toBeLessThanOrEqual(0.45)
  }
})

test('이어지는 소리는 작게(층마다 0.18 이하)', () => {
  for (const [name, layers] of Object.entries(LOOPS)) {
    for (const l of layers) expect(l.gain, name).toBeLessThanOrEqual(0.18)
  }
})

test('노이즈 버퍼는 한 번만 만든다', () => {
  const { made, c, factory } = fakeContext()
  resetSoundForTest(factory)
  playSfx('whoosh')
  c.currentTime = 1
  playSfx('whoosh')
  expect(made.noise).toBe(2)
  expect(made.buffers).toBe(1)
})

test('꺼 두면 어떤 효과음·루프·틱도 오디오를 만들지 않는다', () => {
  const { made, factory } = fakeContext()
  resetSoundForTest(factory)
  setSoundEnabled(false)
  playSfx('boom')
  startLoop('water').set('pitch', 2)
  startLoop('fuse').stop()
  playTickTrain([0, 0.1]).stop()
  expect(made.ctx).toBe(0)
  expect(made.osc + made.noise).toBe(0)
})

test('같은 효과음은 minIntervalMs보다 자주 나지 않는다', () => {
  const { made, c, factory } = fakeContext()
  resetSoundForTest(factory)
  playSfx('pop')
  playSfx('pop')
  expect(made.osc).toBe(1)
  c.currentTime = 0.04
  playSfx('pop')
  expect(made.osc).toBe(2)
})

test('동시에 울리는 효과음은 MAX_ACTIVE개까지만', () => {
  const { made, factory } = fakeContext()
  resetSoundForTest(factory)
  for (let i = 0; i < MAX_ACTIVE + 5; i++) playSfx('chime')
  expect(made.osc).toBe(MAX_ACTIVE * SFX.chime.voices.length)
})

test('루프는 시작·조절·정지가 되고, stop은 소스를 멈춘다', () => {
  const { made, sources, factory } = fakeContext()
  resetSoundForTest(factory)
  const h = startLoop('water')
  expect(made.noise).toBe(1)
  expect(() => {
    h.set('pitch', 1.5)
    h.set('gain', 0.5)
    h.set('lfoRate', 18)
  }).not.toThrow()
  h.stop()
  expect(sources.every((s) => s.stop.mock.calls.length > 0)).toBe(true)
  h.stop()
})

test('stopAllSounds는 루프·예약된 틱을 모두 끈다', () => {
  const { sources, factory } = fakeContext()
  resetSoundForTest(factory)
  startLoop('fuse')
  playTickTrain([0.5, 1, 1.5])
  stopAllSounds()
  expect(sources.length).toBeGreaterThan(0)
  expect(sources.every((s) => s.stop.mock.calls.length > 0)).toBe(true)
})

test('소리를 끄면 이어지던 소리도 멈춘다', () => {
  const { sources, factory } = fakeContext()
  resetSoundForTest(factory)
  startLoop('chalk')
  setSoundEnabled(false)
  expect(sources.every((s) => s.stop.mock.calls.length > 0)).toBe(true)
})

test('틱 열: 시각마다 하나씩 예약하고 stop으로 취소한다', () => {
  const { sources, factory } = fakeContext()
  resetSoundForTest(factory)
  const h = playTickTrain([0, 0.2, 0.4])
  const per = SFX.tick.voices.length
  expect(sources).toHaveLength(3 * per)
  const before = sources.map((s) => s.stop.mock.calls.length)
  h.stop()
  sources.forEach((s, i) => expect(s.stop.mock.calls.length).toBe(before[i] + 1))
})

test('오디오가 없는 환경에서도 throw하지 않는다', () => {
  resetSoundForTest(() => {
    throw new Error('no audio')
  })
  expect(() => {
    playSfx('boom')
    startLoop('water').stop()
    playTickTrain([0]).stop()
    stopAllSounds()
  }).not.toThrow()
})

test('notePitch: 5음계로 올라가고 5칸마다 한 옥타브', () => {
  expect(notePitch(0)).toBe(1)
  expect(notePitch(5)).toBeCloseTo(2)
  for (let i = 1; i < 16; i++) expect(notePitch(i)).toBeGreaterThan(notePitch(i - 1))
})
