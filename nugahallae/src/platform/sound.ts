import { storageGet, storageSet } from './sdk'

// 효과음은 파일 없이 Web Audio로 합성한다(라이선스·용량 걱정이 없다). 어떤 함수도 throw하지 않는다.

const SOUND_KEY = 'nugahallae:sound'
const MASTER_GAIN = 0.6

interface Voice {
  type: OscillatorType
  /** 시작 주파수(Hz) */
  from: number
  /** 끝 주파수. 있으면 지수 곡선으로 이동 */
  to?: number
  /** 시작 시각(초, 지금 기준) */
  at: number
  dur: number
  /** 최대 음량(0~1) */
  gain?: number
  /** 로우패스 필터 차단 주파수 */
  lowpass?: number
  /** 떨림(비브라토) */
  vibrato?: { rate: number; depth: number }
}

/** 동물 id별 울음소리. 실제 녹음이 아니라 흉내 내는 만화풍 소리다. */
export const ANIMAL_VOICES: Record<string, Voice[]> = {
  // 여우: 짧게 두 번 "끼잉"
  fox: [
    { type: 'sawtooth', from: 650, to: 1150, at: 0, dur: 0.14, gain: 0.5, lowpass: 2600 },
    { type: 'sawtooth', from: 760, to: 1300, at: 0.18, dur: 0.18, gain: 0.5, lowpass: 2600 },
  ],
  // 펭귄: 빵빵 하는 나팔 소리
  penguin: [
    { type: 'square', from: 420, to: 330, at: 0, dur: 0.22, gain: 0.3, lowpass: 1500 },
    { type: 'square', from: 440, to: 340, at: 0.27, dur: 0.26, gain: 0.3, lowpass: 1500 },
  ],
  // 개구리: 개굴개굴
  frog: [
    { type: 'sawtooth', from: 190, to: 120, at: 0, dur: 0.12, gain: 0.5, lowpass: 700, vibrato: { rate: 38, depth: 25 } },
    { type: 'sawtooth', from: 210, to: 130, at: 0.17, dur: 0.14, gain: 0.5, lowpass: 700, vibrato: { rate: 38, depth: 25 } },
    { type: 'sawtooth', from: 230, to: 140, at: 0.36, dur: 0.18, gain: 0.5, lowpass: 700, vibrato: { rate: 38, depth: 25 } },
  ],
  // 병아리: 삐약삐약
  chick: [
    { type: 'sine', from: 1900, to: 2700, at: 0, dur: 0.09, gain: 0.45 },
    { type: 'sine', from: 2000, to: 2800, at: 0.13, dur: 0.09, gain: 0.45 },
    { type: 'sine', from: 1800, to: 2500, at: 0.28, dur: 0.12, gain: 0.45 },
  ],
  // 돼지: 꿀꿀
  pig: [
    { type: 'sawtooth', from: 240, to: 130, at: 0, dur: 0.16, gain: 0.5, lowpass: 900, vibrato: { rate: 22, depth: 20 } },
    { type: 'sawtooth', from: 200, to: 110, at: 0.22, dur: 0.22, gain: 0.5, lowpass: 900, vibrato: { rate: 22, depth: 20 } },
  ],
  // 곰: 낮게 으르렁
  bear: [{ type: 'sawtooth', from: 95, to: 70, at: 0, dur: 0.55, gain: 0.6, lowpass: 420, vibrato: { rate: 14, depth: 10 } }],
  // 토끼: 뽁뽁 작은 소리
  rabbit: [
    { type: 'sine', from: 900, to: 1500, at: 0, dur: 0.07, gain: 0.45 },
    { type: 'sine', from: 950, to: 1600, at: 0.12, dur: 0.07, gain: 0.45 },
  ],
  // 호랑이: 어흥
  tiger: [
    { type: 'sawtooth', from: 160, to: 85, at: 0, dur: 0.55, gain: 0.6, lowpass: 800, vibrato: { rate: 28, depth: 30 } },
    { type: 'square', from: 110, to: 70, at: 0.02, dur: 0.5, gain: 0.25, lowpass: 500 },
  ],
  // 유니콘: 반짝이는 소리
  unicorn: [
    { type: 'sine', from: 880, at: 0, dur: 0.22, gain: 0.35 },
    { type: 'sine', from: 1175, at: 0.07, dur: 0.22, gain: 0.35 },
    { type: 'sine', from: 1480, at: 0.14, dur: 0.22, gain: 0.35 },
    { type: 'sine', from: 1760, at: 0.21, dur: 0.4, gain: 0.35 },
  ],
  // 판다: 부드러운 "음메"
  panda: [{ type: 'sine', from: 340, to: 250, at: 0, dur: 0.5, gain: 0.5, lowpass: 900, vibrato: { rate: 6, depth: 12 } }],
}

const CLICK_VOICES: Voice[] = [
  { type: 'sine', from: 1100, to: 700, at: 0, dur: 0.05, gain: 0.5 },
  { type: 'triangle', from: 2200, to: 1400, at: 0, dur: 0.03, gain: 0.15 },
]

/** 결과 화면: 올라가는 세 음 */
const RESULT_VOICES: Voice[] = [
  { type: 'triangle', from: 523, at: 0, dur: 0.14, gain: 0.45 },
  { type: 'triangle', from: 659, at: 0.12, dur: 0.14, gain: 0.45 },
  { type: 'triangle', from: 784, at: 0.24, dur: 0.3, gain: 0.45 },
]

let enabled = true
let ctx: AudioContext | null = null
let master: GainNode | null = null
let factory: () => AudioContext = () => {
  const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }
  const Ctor = w.AudioContext ?? w.webkitAudioContext
  if (!Ctor) throw new Error('no AudioContext')
  return new Ctor()
}

function getContext(): AudioContext | null {
  if (!enabled) return null
  try {
    if (!ctx) {
      ctx = factory()
      master = ctx.createGain()
      master.gain.value = MASTER_GAIN
      master.connect(ctx.destination)
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function play(voices: Voice[], offset = 0): void {
  const c = getContext()
  if (!c || !master) return
  try {
    const base = c.currentTime + offset
    for (const v of voices) {
      const t0 = base + v.at
      const osc = c.createOscillator()
      const amp = c.createGain()
      osc.type = v.type
      osc.frequency.setValueAtTime(v.from, t0)
      if (v.to) osc.frequency.exponentialRampToValueAtTime(v.to, t0 + v.dur)
      const peak = v.gain ?? 0.4
      amp.gain.setValueAtTime(0.0001, t0)
      amp.gain.linearRampToValueAtTime(peak, t0 + 0.012)
      amp.gain.exponentialRampToValueAtTime(0.0001, t0 + v.dur)

      let node: AudioNode = osc
      if (v.lowpass) {
        const f = c.createBiquadFilter()
        f.type = 'lowpass'
        f.frequency.value = v.lowpass
        node.connect(f)
        node = f
      }
      node.connect(amp)
      amp.connect(master)

      if (v.vibrato) {
        const lfo = c.createOscillator()
        const depth = c.createGain()
        lfo.frequency.value = v.vibrato.rate
        depth.gain.value = v.vibrato.depth
        lfo.connect(depth)
        depth.connect(osc.frequency)
        lfo.start(t0)
        lfo.stop(t0 + v.dur + 0.05)
      }
      osc.start(t0)
      osc.stop(t0 + v.dur + 0.05)
    }
  } catch {
    // 소리가 안 나도 앱은 그대로 동작한다
  }
}

/** 브라우저는 사용자 조작 뒤에야 소리를 허용한다. 첫 터치에서 한 번 깨워 둔다. */
export function unlockAudio(): void {
  getContext()
}

export function playClick(): void {
  play(CLICK_VOICES)
}

export function playAnimal(id: string): void {
  const voices = ANIMAL_VOICES[id]
  if (voices) play(voices)
}

/** 결과 화면: 올라가는 소리 뒤에 걸린 동물의 울음소리 */
export function playResult(loserId: string): void {
  play(RESULT_VOICES)
  const voices = ANIMAL_VOICES[loserId]
  if (voices) play(voices, 0.55)
}

export function isSoundEnabled(): boolean {
  return enabled
}

export function setSoundEnabled(on: boolean): void {
  enabled = on
  void storageSet(SOUND_KEY, on ? '1' : '0')
}

/** 저장된 소리 설정을 불러온다(없으면 켜짐) */
export async function loadSound(): Promise<boolean> {
  const raw = await storageGet(SOUND_KEY)
  enabled = raw !== '0'
  return enabled
}

/** 테스트용: 가짜 AudioContext를 끼우고 상태를 처음으로 되돌린다 */
export function resetSoundForTest(f?: () => AudioContext): void {
  ctx = null
  master = null
  enabled = true
  if (f) factory = f
}
