import { TossAds } from '@apps-in-toss/web-framework'

// 이 파일이 앱에서 광고 SDK를 만지는 유일한 곳이다. 어떤 함수도 throw하지 않는다.
// 광고 그룹 ID는 빌드할 때 VITE_AD_GROUP_ID로 넣는다(콘솔에서 발급). 비어 있으면 광고를 쓰지 않는다.

/** 고정형 배너 권장 높이(WebView SDK 3.0.5 이상) */
export const BANNER_HEIGHT = 102

export function getAdGroupId(): string {
  const id: unknown = import.meta.env.VITE_AD_GROUP_ID
  return typeof id === 'string' ? id.trim() : ''
}

/** 광고 그룹 ID가 있고, 지금 환경(토스 앱 5.241.0 이상)이 배너 광고를 지원할 때만 true */
export function adsSupported(): boolean {
  try {
    return getAdGroupId() !== '' && TossAds.initialize.isSupported() && TossAds.attachBanner.isSupported()
  } catch {
    return false
  }
}

let initPromise: Promise<boolean> | null = null

/** 광고 SDK를 앱에서 한 번만 초기화한다. 성공하면 true */
export function initAds(): Promise<boolean> {
  if (initPromise) return initPromise
  initPromise = new Promise<boolean>((resolve) => {
    if (!adsSupported()) {
      resolve(false)
      return
    }
    try {
      TossAds.initialize({
        callbacks: {
          onInitialized: () => resolve(true),
          onInitializationFailed: () => resolve(false),
        },
      })
    } catch {
      resolve(false)
    }
  })
  return initPromise
}

/**
 * 배너를 target 요소에 붙인다(요소 안은 비워 둔다). 광고가 없거나 실패하면 onUnavailable을 부른다.
 * 돌려주는 함수를 부르면 배너를 걷어 낸다.
 */
export function attachBanner(target: HTMLElement, onUnavailable: () => void): () => void {
  try {
    const slot = TossAds.attachBanner(getAdGroupId(), target, {
      theme: 'light',
      tone: 'blackAndWhite',
      variant: 'expanded',
      callbacks: {
        onNoFill: onUnavailable,
        onAdFailedToRender: onUnavailable,
      },
    })
    return () => {
      try {
        slot.destroy()
      } catch {
        // 이미 걷힌 배너: 무시
      }
    }
  } catch {
    onUnavailable()
    return () => {}
  }
}

/** 테스트용: 초기화 상태를 처음으로 되돌린다 */
export function resetAdsForTest(): void {
  initPromise = null
}
