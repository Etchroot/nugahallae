import { storageGet, storageSet } from './sdk'

// 효과음은 파일 없이 Web Audio로 합성한다(라이선스·용량 걱정이 없다). 어떤 함수도 throw하지 않는다.

const SOUND_KEY = 'nugahallae:sound'
const MASTER_GAIN = 0.6
/** 동시에 울리는 단발 효과음 최대 개수(멀티터치 연타 대비) */
export const MAX_ACTIVE = 12

interface FilterSpec {
  type: BiquadFilterType
  /** 시작 차단(중심) 주파수 */
  from: number
  /** 있으면 지수 곡선으로 이동(필터 스윕) */
  to?: number
  q?: number
}

interface Voice {
  /** 'noise'는 화이트노이즈(필터와 함께 쓴다) */
  type: OscillatorType | 'noise'
  /** 시작 주파수(Hz). 노이즈는 쓰지 않는다 */
  from?: number
  /** 끝 주파수. 있으면 지수 곡선으로 이동 */
  to?: number
  /** 시작 시각(초, 지금 기준) */
  at: number
  dur: number
  /** 최대 음량(0~1) */
  gain?: number
  /** 소리가 커지는 데 걸리는 시간(초) */
  attack?: number
  /** 로우패스 필터 차단 주파수 */
  lowpass?: number
  filter?: FilterSpec
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

interface Sfx {
  voices: Voice[]
  /** 같은 효과음을 이 간격(ms)보다 자주 내지 않는다 */
  minIntervalMs?: number
}

// 게임 효과음. 공용 소리(위쪽)를 여러 게임이 같이 쓰고, 게임 고유음은 이름 앞에 게임 id를 붙인다.
// 게임이 끝날 때 나는 소리는 0.45초 안에 끝나게 한다(결과 화면 소리와 겹치지 않게).
export const SFX = {
  // 나무 걸쇠 "딸깍"
  tick: {
    voices: [
      { type: 'triangle', from: 1800, at: 0, dur: 0.012, gain: 0.25 },
      { type: 'noise', at: 0, dur: 0.008, gain: 0.12, filter: { type: 'highpass', from: 4000 } },
    ],
    minIntervalMs: 25,
  },
  tapSoft: { voices: [{ type: 'sine', from: 700, to: 450, at: 0, dur: 0.045, gain: 0.3 }], minIntervalMs: 40 },
  // "뽁"
  pop: { voices: [{ type: 'sine', from: 380, to: 900, at: 0, dur: 0.06, gain: 0.35 }], minIntervalMs: 35 },
  // 음계 한 음(높이는 notePitch로 정한다)
  note: { voices: [{ type: 'triangle', from: 523, at: 0, dur: 0.09, gain: 0.3 }], minIntervalMs: 30 },
  countBeep: { voices: [{ type: 'sine', from: 660, at: 0, dur: 0.08, gain: 0.35 }] },
  goBeep: { voices: [{ type: 'sine', from: 1320, at: 0, dur: 0.16, gain: 0.35 }] },
  // 스톱워치 "딱"
  stopClick: {
    voices: [
      { type: 'square', from: 2000, at: 0, dur: 0.008, gain: 0.15 },
      { type: 'triangle', from: 900, at: 0, dur: 0.03, gain: 0.35 },
    ],
    minIntervalMs: 30,
  },
  whoosh: {
    voices: [{ type: 'noise', at: 0, dur: 0.25, gain: 0.3, attack: 0.08, filter: { type: 'bandpass', from: 400, to: 2500, q: 1 } }],
    minIntervalMs: 60,
  },
  cardFlip: {
    voices: [
      { type: 'noise', at: 0, dur: 0.05, gain: 0.3, filter: { type: 'bandpass', from: 2000, to: 5000, q: 1 } },
      { type: 'sine', from: 900, at: 0, dur: 0.02, gain: 0.2 },
    ],
    minIntervalMs: 60,
  },
  chime: {
    voices: [
      { type: 'triangle', from: 784, at: 0, dur: 0.12, gain: 0.3 },
      { type: 'triangle', from: 1047, at: 0.06, dur: 0.16, gain: 0.3 },
    ],
  },
  /** 기록형 게임: 잘했든 못했든 같은 중립음으로 기록을 알린다 */
  record: {
    voices: [
      { type: 'sine', from: 660, at: 0, dur: 0.1, gain: 0.3 },
      { type: 'sine', from: 880, at: 0.08, dur: 0.14, gain: 0.3 },
    ],
  },
  success: {
    voices: [
      { type: 'triangle', from: 523, at: 0, dur: 0.09, gain: 0.35 },
      { type: 'triangle', from: 659, at: 0.08, dur: 0.09, gain: 0.35 },
      { type: 'triangle', from: 784, at: 0.16, dur: 0.14, gain: 0.35 },
    ],
  },
  buzz: {
    voices: [
      { type: 'square', from: 150, to: 120, at: 0, dur: 0.1, gain: 0.3, lowpass: 900 },
      { type: 'square', from: 150, to: 120, at: 0.12, dur: 0.1, gain: 0.3, lowpass: 900 },
    ],
    minIntervalMs: 80,
  },
  // 벌칙이 정해질 때 "띠로리"
  loseSting: {
    voices: [
      { type: 'triangle', from: 600, at: 0, dur: 0.12, gain: 0.35 },
      { type: 'triangle', from: 450, at: 0.12, dur: 0.12, gain: 0.35 },
      { type: 'triangle', from: 300, at: 0.24, dur: 0.18, gain: 0.35 },
    ],
  },
  boom: {
    voices: [
      { type: 'noise', at: 0, dur: 0.6, gain: 0.5, filter: { type: 'lowpass', from: 4000, to: 150 } },
      { type: 'sine', from: 110, to: 40, at: 0, dur: 0.4, gain: 0.55 },
    ],
  },

  // 잔 채우기: 한 방울 "똑", 넘침 "철퍽"
  'pour.drip': { voices: [{ type: 'sine', from: 1400, to: 600, at: 0, dur: 0.06, gain: 0.35 }], minIntervalMs: 40 },
  'pour.splash': {
    voices: [
      { type: 'noise', at: 0, dur: 0.45, gain: 0.45, filter: { type: 'lowpass', from: 3000, to: 400 } },
      { type: 'sine', from: 180, to: 60, at: 0, dur: 0.3, gain: 0.4 },
    ],
  },
  // 폭탄: 불 붙이는 "치익"
  'bomb.ignite': {
    voices: [{ type: 'noise', at: 0, dur: 0.3, gain: 0.3, filter: { type: 'highpass', from: 2000, to: 6000 } }],
  },
  // 풍선: 펌프 "피슉"과 고무 늘어나는 소리, 터지는 "펑"
  'balloon.pump': {
    voices: [
      { type: 'noise', at: 0, dur: 0.18, gain: 0.3, filter: { type: 'bandpass', from: 600, to: 1800, q: 1 } },
      { type: 'sine', from: 400, to: 600, at: 0.05, dur: 0.12, gain: 0.15 },
    ],
  },
  'balloon.pop': {
    voices: [
      { type: 'noise', at: 0, dur: 0.04, gain: 0.55, filter: { type: 'highpass', from: 800 } },
      { type: 'noise', at: 0.02, dur: 0.2, gain: 0.3, filter: { type: 'lowpass', from: 2500, to: 300 } },
    ],
  },
  // 악어: 안전한 이빨 "딸깍"(모든 이빨이 같은 소리), 함정 "콱"
  'croc.tooth': { voices: [{ type: 'triangle', from: 500, to: 350, at: 0, dur: 0.05, gain: 0.35 }] },
  'croc.chomp': {
    voices: [
      { type: 'noise', at: 0, dur: 0.08, gain: 0.4, filter: { type: 'lowpass', from: 2000 } },
      { type: 'square', from: 160, to: 60, at: 0, dur: 0.25, gain: 0.3, lowpass: 900 },
    ],
  },
  // 전선: "싹둑"(모든 전선이 같은 소리)
  'wires.snip': {
    voices: [
      { type: 'noise', at: 0, dur: 0.015, gain: 0.4, filter: { type: 'highpass', from: 3000 } },
      { type: 'noise', at: 0.03, dur: 0.015, gain: 0.4, filter: { type: 'highpass', from: 3000 } },
    ],
  },
  // 369: 손뼉 "짝"
  'clap.clap': {
    voices: [
      { type: 'noise', at: 0, dur: 0.008, gain: 0.45, filter: { type: 'bandpass', from: 1200, q: 0.8 } },
      { type: 'noise', at: 0.013, dur: 0.06, gain: 0.4, filter: { type: 'bandpass', from: 1200, q: 0.8 } },
    ],
    minIntervalMs: 40,
  },
  // 왕 카드: 짧은 나팔 두 음
  'kings.king': {
    voices: [
      { type: 'square', from: 523, at: 0, dur: 0.1, gain: 0.25, lowpass: 1500 },
      { type: 'square', from: 659, at: 0.1, dur: 0.16, gain: 0.25, lowpass: 1500 },
    ],
  },
  // 블록 탑: 나무 "톡", 삐걱, 와르르
  'tower.knock': {
    voices: [
      { type: 'triangle', from: 320, to: 260, at: 0, dur: 0.06, gain: 0.4 },
      { type: 'noise', at: 0, dur: 0.015, gain: 0.15, filter: { type: 'bandpass', from: 2000 } },
    ],
  },
  'tower.creak': {
    voices: [{ type: 'sine', from: 140, at: 0.05, dur: 0.2, gain: 0.15, vibrato: { rate: 6, depth: 8 } }],
  },
  'tower.collapse': {
    voices: [
      { type: 'triangle', from: 340, to: 260, at: 0, dur: 0.06, gain: 0.35 },
      { type: 'triangle', from: 280, to: 220, at: 0.05, dur: 0.06, gain: 0.35 },
      { type: 'triangle', from: 380, to: 300, at: 0.11, dur: 0.06, gain: 0.35 },
      { type: 'triangle', from: 300, to: 240, at: 0.17, dur: 0.06, gain: 0.35 },
      { type: 'triangle', from: 260, to: 200, at: 0.24, dur: 0.06, gain: 0.35 },
      { type: 'triangle', from: 360, to: 280, at: 0.3, dur: 0.06, gain: 0.3 },
      { type: 'sine', from: 90, to: 40, at: 0.05, dur: 0.35, gain: 0.5 },
    ],
  },
  // 업다운: 올라가는/내려가는 두 음
  'updown.up': {
    voices: [
      { type: 'sine', from: 500, at: 0, dur: 0.08, gain: 0.3 },
      { type: 'sine', from: 800, at: 0.08, dur: 0.1, gain: 0.3 },
    ],
  },
  'updown.down': {
    voices: [
      { type: 'sine', from: 800, at: 0, dur: 0.08, gain: 0.3 },
      { type: 'sine', from: 500, at: 0.08, dur: 0.1, gain: 0.3 },
    ],
  },
  // 눈치게임: 겹쳤을 때 어긋난 두 음
  'nunchi.clash': {
    voices: [
      { type: 'square', from: 300, at: 0, dur: 0.3, gain: 0.2, lowpass: 1500 },
      { type: 'square', from: 318, at: 0, dur: 0.3, gain: 0.2, lowpass: 1500 },
    ],
  },
  // 마지막 터치: 모두에게 같이 들리는 신호
  'lasttouch.signal': { voices: [{ type: 'square', from: 1320, at: 0, dur: 0.15, gain: 0.3, lowpass: 4000 }] },
  // 손가락 접기 "꾹"
  'never.fold': { voices: [{ type: 'sine', from: 520, to: 420, at: 0, dur: 0.07, gain: 0.3 }], minIntervalMs: 15 },
  // 바구니: 들어가면 "슉", 빗나가면 테두리 "텅"
  'basket.swish': {
    voices: [
      { type: 'noise', at: 0, dur: 0.2, gain: 0.3, filter: { type: 'bandpass', from: 3000, to: 1000, q: 1 } },
      { type: 'triangle', from: 1047, at: 0.12, dur: 0.16, gain: 0.25 },
    ],
  },
  'basket.rim': { voices: [{ type: 'triangle', from: 420, at: 0, dur: 0.3, gain: 0.35, vibrato: { rate: 30, depth: 6 } }] },
  // 연타 끝 호루라기
  'tap.whistle': { voices: [{ type: 'sine', from: 1800, at: 0, dur: 0.25, gain: 0.3, vibrato: { rate: 24, depth: 40 } }] },
} satisfies Record<string, Sfx>

export type SfxName = keyof typeof SFX

interface LoopLayer {
  type: OscillatorType | 'noise'
  /** 오실레이터 주파수(노이즈는 쓰지 않는다) */
  freq?: number
  gain: number
  filter?: { type: BiquadFilterType; freq: number; q?: number }
  /** 느린 흔들림: 음량·높이·필터 중 하나를 rate(Hz)로 depth만큼 흔든다 */
  lfo?: { target: 'gain' | 'freq' | 'cutoff'; rate: number; depth: number }
}

// 이어지는 소리. 음량은 작게(0.18 이하) 둔다.
export const LOOPS = {
  // 물 붓기: 물줄기 노이즈 + 차오르는 "꼴꼴" 음
  water: [
    { type: 'noise', gain: 0.14, filter: { type: 'bandpass', freq: 900, q: 1.2 }, lfo: { target: 'gain', rate: 9, depth: 0.06 } },
    { type: 'sine', freq: 300, gain: 0.06, lfo: { target: 'freq', rate: 9, depth: 25 } },
  ],
  // 심지 타는 지글거림(속도·높이 고정)
  fuse: [{ type: 'noise', gain: 0.1, filter: { type: 'highpass', freq: 5000 }, lfo: { target: 'gain', rate: 13, depth: 0.04 } }],
  // 길 따라가기: 낮은 웅웅
  hum: [
    { type: 'sine', freq: 330, gain: 0.06, lfo: { target: 'freq', rate: 5, depth: 3 } },
    { type: 'triangle', freq: 660, gain: 0.03 },
  ],
  // 자 긋기: 분필 긁는 소리(길이와 무관하게 일정)
  chalk: [{ type: 'noise', gain: 0.08, filter: { type: 'bandpass', freq: 2500, q: 2 } }],
} satisfies Record<string, LoopLayer[]>

export type LoopName = keyof typeof LOOPS

export interface LoopHandle {
  /** pitch·gain은 처음 값에 곱하는 배수, lfoRate는 Hz */
  set(param: 'pitch' | 'gain' | 'lfoRate', value: number, rampSec?: number): void
  stop(fadeSec?: number): void
}

export interface StopHandle {
  stop(): void
}

const NOOP_LOOP: LoopHandle = { set: () => {}, stop: () => {} }
const NOOP_STOP: StopHandle = { stop: () => {} }

let enabled = true
let ctx: AudioContext | null = null
let master: GainNode | null = null
let noiseBuf: AudioBuffer | null = null
/** 아직 울리는(또는 예약된) 소스: 일괄 정지용 */
let live: { node: AudioScheduledSourceNode; end: number }[] = []
/** 단발 효과음이 끝나는 시각들: 동시 개수 제한용 */
let soundEnds: number[] = []
const lastPlayed = new Map<string, number>()
const loops = new Set<LoopHandle>()
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

/** 1초짜리 화이트노이즈. 한 번 만들어 계속 쓴다 */
function noise(c: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    const rate = c.sampleRate || 44100
    noiseBuf = c.createBuffer(1, rate, rate)
    const data = noiseBuf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  return noiseBuf
}

function source(c: AudioContext, type: OscillatorType | 'noise'): AudioScheduledSourceNode {
  if (type === 'noise') {
    const src = c.createBufferSource()
    src.buffer = noise(c)
    src.loop = true
    return src
  }
  const osc = c.createOscillator()
  osc.type = type
  return osc
}

function track(node: AudioScheduledSourceNode, end: number): void {
  live.push({ node, end })
}

function prune(now: number): void {
  live = live.filter((x) => x.end > now)
  soundEnds = soundEnds.filter((t) => t > now)
}

function play(voices: Voice[], offset = 0, pitch = 1, gainMul = 1): void {
  const c = getContext()
  if (!c || !master) return
  try {
    const base = c.currentTime + offset
    for (const v of voices) {
      const t0 = base + v.at
      const end = t0 + v.dur + 0.05
      const src = source(c, v.type)
      const amp = c.createGain()
      if (v.type !== 'noise') {
        const osc = src as OscillatorNode
        osc.frequency.setValueAtTime((v.from ?? 440) * pitch, t0)
        if (v.to) osc.frequency.exponentialRampToValueAtTime(v.to * pitch, t0 + v.dur)
      }
      const peak = (v.gain ?? 0.4) * gainMul
      amp.gain.setValueAtTime(0.0001, t0)
      amp.gain.linearRampToValueAtTime(peak, t0 + Math.min(v.attack ?? 0.012, v.dur / 2))
      amp.gain.exponentialRampToValueAtTime(0.0001, t0 + v.dur)

      let node: AudioNode = src
      const spec: FilterSpec | null = v.filter ?? (v.lowpass ? { type: 'lowpass', from: v.lowpass } : null)
      if (spec) {
        const f = c.createBiquadFilter()
        f.type = spec.type
        // 노이즈는 필터가 음높이 역할을 한다
        const k = v.type === 'noise' ? pitch : 1
        f.frequency.setValueAtTime(spec.from * k, t0)
        if (spec.to) f.frequency.exponentialRampToValueAtTime(spec.to * k, t0 + v.dur)
        if (spec.q) f.Q.value = spec.q
        node.connect(f)
        node = f
      }
      node.connect(amp)
      amp.connect(master)

      if (v.vibrato && v.type !== 'noise') {
        const lfo = c.createOscillator()
        const depth = c.createGain()
        lfo.frequency.value = v.vibrato.rate
        depth.gain.value = v.vibrato.depth
        lfo.connect(depth)
        depth.connect((src as OscillatorNode).frequency)
        lfo.start(t0)
        lfo.stop(end)
        track(lfo, end)
      }
      src.start(t0)
      src.stop(end)
      track(src, end)
    }
  } catch {
    // 소리가 안 나도 앱은 그대로 동작한다
  }
}

function lengthOf(voices: Voice[]): number {
  return voices.reduce((m, v) => Math.max(m, v.at + v.dur), 0)
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

/**
 * 게임 효과음 한 번. pitch는 높이 배수(1 = 원래 높이), gain은 음량 배수.
 * 같은 효과음을 너무 자주 부르거나 동시에 너무 많이 울리면 조용히 건너뛴다.
 */
export function playSfx(name: SfxName, opts?: { pitch?: number; gain?: number }): void {
  const c = getContext()
  if (!c) return
  try {
    const sfx: Sfx = SFX[name]
    const now = c.currentTime
    prune(now)
    const last = lastPlayed.get(name)
    if (sfx.minIntervalMs && last !== undefined && (now - last) * 1000 < sfx.minIntervalMs) return
    if (soundEnds.length >= MAX_ACTIVE) return
    lastPlayed.set(name, now)
    soundEnds.push(now + lengthOf(sfx.voices))
    play(sfx.voices, 0, opts?.pitch ?? 1, Math.min(1, opts?.gain ?? 1))
  } catch {
    // 무시
  }
}

const PENTA = [0, 2, 4, 7, 9]

/** 5음계 i번째 음(0부터)의 높이 배수. note 효과음과 함께 쓴다 */
export function notePitch(i: number): number {
  const k = Math.max(0, Math.floor(i))
  const semi = Math.floor(k / PENTA.length) * 12 + PENTA[k % PENTA.length]
  return Math.pow(2, semi / 12)
}

/** 정해진 시각(초, 지금 기준)마다 효과음을 미리 예약한다. stop()으로 남은 것을 취소한다 */
export function playTickTrain(timesSec: number[], name: SfxName = 'tick'): StopHandle {
  const c = getContext()
  if (!c) return NOOP_STOP
  const start = live.length
  try {
    for (const t of timesSec) if (t >= 0) play(SFX[name].voices, t)
  } catch {
    return NOOP_STOP
  }
  const mine = live.slice(start).map((x) => x.node)
  return {
    stop: () => {
      for (const n of mine) {
        try {
          n.stop()
        } catch {
          // 이미 끝난 소스
        }
      }
    },
  }
}

/** 이어지는 소리를 시작한다. 꼭 stop()으로 끝낸다(화면을 떠나면 stopAllSounds가 대신 끈다) */
export function startLoop(name: LoopName): LoopHandle {
  const c = getContext()
  if (!c || !master) return NOOP_LOOP
  try {
    const t0 = c.currentTime
    const out = c.createGain()
    out.gain.setValueAtTime(0.0001, t0)
    out.gain.linearRampToValueAtTime(1, t0 + 0.05)
    out.connect(master)
    const nodes: AudioScheduledSourceNode[] = []
    const pitched: { param: AudioParam; base: number }[] = []
    const lfos: OscillatorNode[] = []
    for (const layer of LOOPS[name] as LoopLayer[]) {
      const src = source(c, layer.type)
      const g = c.createGain()
      g.gain.value = layer.gain
      let node: AudioNode = src
      let filter: BiquadFilterNode | null = null
      if (layer.type !== 'noise') {
        const f = layer.freq ?? 440
        ;(src as OscillatorNode).frequency.value = f
        pitched.push({ param: (src as OscillatorNode).frequency, base: f })
      }
      if (layer.filter) {
        filter = c.createBiquadFilter()
        filter.type = layer.filter.type
        filter.frequency.value = layer.filter.freq
        if (layer.filter.q) filter.Q.value = layer.filter.q
        if (layer.type === 'noise') pitched.push({ param: filter.frequency, base: layer.filter.freq })
        node.connect(filter)
        node = filter
      }
      node.connect(g)
      g.connect(out)
      if (layer.lfo) {
        const target =
          layer.lfo.target === 'gain'
            ? g.gain
            : layer.lfo.target === 'cutoff' && filter
              ? filter.frequency
              : layer.type !== 'noise'
                ? (src as OscillatorNode).frequency
                : null
        if (target) {
          const lfo = c.createOscillator()
          const depth = c.createGain()
          lfo.frequency.value = layer.lfo.rate
          depth.gain.value = layer.lfo.depth
          lfo.connect(depth)
          depth.connect(target)
          lfo.start(t0)
          nodes.push(lfo)
          lfos.push(lfo)
        }
      }
      src.start(t0)
      nodes.push(src)
    }
    let stopped = false
    const handle: LoopHandle = {
      set: (param, value, rampSec = 0.05) => {
        if (stopped || !(value > 0)) return
        try {
          const t = c.currentTime + Math.max(0.01, rampSec)
          if (param === 'gain') out.gain.linearRampToValueAtTime(Math.min(1, value), t)
          else if (param === 'pitch') for (const p of pitched) p.param.linearRampToValueAtTime(p.base * value, t)
          else for (const l of lfos) l.frequency.linearRampToValueAtTime(value, t)
        } catch {
          // 무시
        }
      },
      stop: (fadeSec = 0.08) => {
        if (stopped) return
        stopped = true
        loops.delete(handle)
        try {
          const t = c.currentTime
          out.gain.setValueAtTime(out.gain.value || 1, t)
          out.gain.linearRampToValueAtTime(0.0001, t + fadeSec)
          for (const n of nodes) n.stop(t + fadeSec + 0.02)
        } catch {
          // 무시
        }
      },
    }
    loops.add(handle)
    return handle
  } catch {
    return NOOP_LOOP
  }
}

/** 울리는 소리·예약된 소리·이어지는 소리를 모두 끈다(화면 이탈·백그라운드·소리 끔) */
export function stopAllSounds(): void {
  for (const l of [...loops]) l.stop(0.02)
  loops.clear()
  for (const x of live) {
    try {
      x.node.stop()
    } catch {
      // 이미 끝난 소스
    }
  }
  live = []
  soundEnds = []
}

export function isSoundEnabled(): boolean {
  return enabled
}

export function setSoundEnabled(on: boolean): void {
  if (!on) stopAllSounds()
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
  noiseBuf = null
  live = []
  soundEnds = []
  lastPlayed.clear()
  loops.clear()
  enabled = true
  if (f) factory = f
}
