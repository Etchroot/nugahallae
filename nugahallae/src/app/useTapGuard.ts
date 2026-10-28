import { useCallback, useRef } from 'react'

export const TAP_GUARD_MS = 400

/**
 * 연속 탭 방지: 직전에 받아들인 탭 이후 400ms 안의 탭은 무시한다.
 * 한 화면에서 같은 자리에 다른 버튼이 바뀌어 나타나는 흐름(뽑기 → 확인했어요)에서
 * 더블탭이 다음 단계를 건너뛰지 않게 한다.
 */
export function useTapGuard(now: () => number = () => performance.now()) {
  const last = useRef(Number.NEGATIVE_INFINITY)
  return useCallback(
    (fn: () => void) => () => {
      const t = now()
      if (t - last.current < TAP_GUARD_MS) return
      last.current = t
      fn()
    },
    // now는 보통 고정 함수라 의존성에서 제외한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
}
