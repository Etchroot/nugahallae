import { useEffect, useRef, useState } from 'react'
import { attachBanner } from '../platform/ads'

// 화면 맨 위에 흐름대로(고정 위치로 덮지 않고) 놓이는 배너 자리.
// 광고가 없거나 실패하면 빈 칸이 남지 않도록 자리를 접는다. SDK가 "Ad" 표기와 디자인을 그린다.
export function TopBanner() {
  const ref = useRef<HTMLDivElement>(null)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    return attachBanner(el, () => setUnavailable(true))
  }, [])

  return <div ref={ref} className="ad-top" data-silent data-testid="top-banner" hidden={unavailable} />
}
