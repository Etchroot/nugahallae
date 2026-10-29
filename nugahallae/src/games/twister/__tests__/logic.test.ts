import { test, expect, describe } from 'vitest'
import { drawPieces } from '../../../domain/pieces'
import { settleWorst } from '../../shared/settle'
import {
  SENTENCES, WRONG_SCORE, makeRecord, pickSentence, recordText, scoreOf, whyText,
} from '../logic'

const [a, b, c] = drawPieces(3, () => 0.5)

describe('문장 목록', () => {
  test('지시서의 10문장만 있다', () => {
    expect(SENTENCES).toHaveLength(10)
    expect(SENTENCES[0]).toBe('간장 공장 공장장은 강 공장장이고 된장 공장 공장장은 공 공장장이다.')
    expect(SENTENCES[3]).toBe('철수 책상 철 책상, 영희 책상 철 책상.')
    expect(SENTENCES[8]).toBe('한국관광공사 곽진관 관광과장.')
    expect(SENTENCES[9]).toBe(
      '안 촉촉한 초코칩 나라에 살던 안 촉촉한 초코칩은 촉촉한 초코칩 나라의 촉촉한 초코칩을 부러워했다.',
    )
    expect(new Set(SENTENCES).size).toBe(10)
  })
})

describe('pickSentence', () => {
  test('rng로 한 문장을 고른다(경계 포함)', () => {
    expect(pickSentence(() => 0)).toBe(SENTENCES[0])
    expect(pickSentence(() => 0.5)).toBe(SENTENCES[5])
    expect(pickSentence(() => 0.9999999)).toBe(SENTENCES[9])
    expect(pickSentence(() => 1)).toBe(SENTENCES[9])
  })
  test('같은 rng면 같은 문장', () => {
    expect(pickSentence(() => 0.33)).toBe(pickSentence(() => 0.33))
  })
})

describe('기록·점수', () => {
  test('성공은 걸린 시간(초), 틀림은 1000', () => {
    expect(scoreOf(makeRecord(a, true, 4.2))).toBe(4.2)
    expect(scoreOf(makeRecord(a, false, 1.1))).toBe(WRONG_SCORE)
    expect(WRONG_SCORE).toBe(1000)
  })
  test('시간은 소수 둘째 자리까지', () => {
    expect(makeRecord(a, true, 4.2349).timeSec).toBe(4.23)
    expect(recordText(makeRecord(a, true, 4.2))).toBe('4.20초')
    expect(recordText(makeRecord(a, false, 4.2))).toBe('틀림')
  })
  test('연출 문구', () => {
    expect(whyText(makeRecord(a, false, 3))).toBe('틀렸어요')
    expect(whyText(makeRecord(a, true, 7.5))).toBe('7.50초로 가장 느렸어요')
  })
  test('틀린 사람이 가장 나쁘고, 모두 맞히면 가장 느린 사람', () => {
    const rows = [makeRecord(a, true, 9), makeRecord(b, false, 1), makeRecord(c, true, 3)]
    expect(settleWorst(rows, scoreOf, 'higher', () => 0.5).loser.piece).toBe(b)
    const ok = [makeRecord(a, true, 9), makeRecord(b, true, 5), makeRecord(c, true, 3)]
    expect(settleWorst(ok, scoreOf, 'higher', () => 0.5).loser.piece).toBe(a)
  })
  test('틀린 사람이 둘이면 동점(rng)', () => {
    const rows = [makeRecord(a, false, 1), makeRecord(b, false, 2), makeRecord(c, true, 3)]
    const s = settleWorst(rows, scoreOf, 'higher', () => 0)
    expect(s.tie).toBe(true)
    expect(s.loser.piece).toBe(a)
  })
})
