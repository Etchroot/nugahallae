import { useEffect, useRef, useState } from 'react'
import type { Piece } from '../../domain/pieces'
import { pieceLabel } from '../../domain/pieces'
import type { Rng } from '../../domain/rng'
import { haptic } from '../../platform/sdk'
import { settleWorst } from './settle'

export const RANK_MS = 900
export const OVERLAY_MS = 1200
export const TIE_SUFFIX = ' (동점자 중 랜덤)'

interface Options<T extends { piece: Piece }> {
  onFinish: (loser: Piece) => void
  rng: Rng
  score: (r: T) => number
  worse: 'higher' | 'lower'
  /** 연출 문구에서 말 이름 뒤에 붙는 설명 */
  why: (loser: T) => string
}

/**
 * 순서 기록형 게임(타이머·반응속도·연타)의 마무리 흐름.
 * finish(rows) → 순위 목록 → 900ms → 오버레이(+haptic error) → 1200ms → onFinish 1회.
 * 언마운트하면 남은 타이머를 모두 정리한다.
 */
export function useRecordFinish<T extends { piece: Piece }>(opts: Options<T>) {
  const [ranked, setRanked] = useState<T[] | null>(null)
  const [overlay, setOverlay] = useState<string | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const done = useRef(false)
  const optsRef = useRef(opts)
  optsRef.current = opts

  useEffect(() => {
    const list = timers.current
    return () => {
      list.forEach(clearTimeout)
      list.length = 0
    }
  }, [])

  const finish = (rows: T[]) => {
    if (done.current) return
    done.current = true
    const o = optsRef.current
    const s = settleWorst(rows, o.score, o.worse, o.rng)
    setRanked(s.ranked)
    timers.current.push(
      setTimeout(() => {
        void haptic('error')
        setOverlay(`${pieceLabel(s.loser.piece)} ${o.why(s.loser)}${s.tie ? TIE_SUFFIX : ''}`)
        timers.current.push(
          setTimeout(() => optsRef.current.onFinish(s.loser.piece), OVERLAY_MS),
        )
      }, RANK_MS),
    )
  }

  return { ranked, overlay, finish }
}
