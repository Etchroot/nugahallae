import { useCallback, useRef } from 'react'
import { TAP_GUARD_MS } from '../../app/useTapGuard'

/**
 * 한 화면 전체가 공유하는 탭 가드. 시작·멈춤·다음 버튼이 같은 자리에 번갈아 나타나는
 * 게임에서, 직전 탭 직후(400ms)의 더블탭이 다음 단계를 건너뛰지 못하게 한다.
 * guard(fn): 가드를 통과해야 fn 실행(통과하면 시각 기록). prime(): 가드 없이 시각만 기록
 * (즉시 반응해야 하는 탭이나 연타 입력이 뒤따르는 버튼을 보호할 때).
 */
export function useScreenGuard(now: () => number = () => performance.now()) {
  const nowRef = useRef(now)
  nowRef.current = now
  const last = useRef(Number.NEGATIVE_INFINITY)
  const guard = useCallback(
    (fn: () => void) => () => {
      const t = nowRef.current()
      if (t - last.current < TAP_GUARD_MS) return
      last.current = t
      fn()
    },
    [],
  )
  const prime = useCallback(() => {
    last.current = nowRef.current()
  }, [])
  return { guard, prime }
}
