import {
  Storage as TossStorage,
  closeView,
  generateHapticFeedback,
  graniteEvent,
  User,
} from '@apps-in-toss/web-framework'

// 이 파일이 앱에서 토스 SDK를 만지는 유일한 곳이다. 어떤 함수도 throw하지 않는다.

export async function haptic(type: 'tap' | 'success' | 'error'): Promise<void> {
  try {
    await generateHapticFeedback({ type })
  } catch {
    // 토스 밖이거나 미지원: 무시
  }
}

export async function storageGet(key: string): Promise<string | null> {
  try {
    const v = await TossStorage.getItem(key)
    if (v !== null && v !== undefined) return v
  } catch {
    // fallthrough
  }
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export async function storageSet(key: string, value: string): Promise<void> {
  try {
    await TossStorage.setItem(key, value)
    return
  } catch {
    // fallthrough
  }
  try {
    localStorage.setItem(key, value)
  } catch {
    // 무시
  }
}

export function onBack(handler: () => void): () => void {
  try {
    const unsubscribe = graniteEvent.addEventListener('backEvent', {
      onEvent: handler,
      onError: () => {},
    })
    return () => {
      try {
        unsubscribe()
      } catch {
        // 무시
      }
    }
  } catch {
    return () => {}
  }
}

// 사용자 식별키(익명 해시). 토스 앱 5.232.0 미만·토스 밖·실패면 null. SDK는 한 번만 부른다(재시도 없음).
let userKeyPromise: Promise<string | null> | null = null

export function getUserKey(): Promise<string | null> {
  if (userKeyPromise === null) {
    userKeyPromise = (async () => {
      try {
        const r = await User.getAnonymousKey()
        if (r && typeof r === 'object' && r.type === 'HASH' && typeof r.hash === 'string' && r.hash) return r.hash
      } catch {
        // 미지원 버전·오류: 키 없이 계속 동작
      }
      return null
    })()
  }
  return userKeyPromise
}

export function resetUserKeyForTest(): void {
  userKeyPromise = null
}

export function closeApp(): void {
  try {
    void Promise.resolve(closeView()).catch(() => {})
  } catch {
    // 무시
  }
}
