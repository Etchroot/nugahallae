// 데모 웹 빌드 전용: @toss/tds-mobile-ait의 Provider 대체. 감싸기만 한다.
import type { ReactNode } from 'react'

export function TDSMobileAITProvider({ children }: { children: ReactNode; brandPrimaryColor?: string }) {
  return <>{children}</>
}
