import {
  Storage as TossStorage,
  closeView,
  generateHapticFeedback,
  graniteEvent,
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

export function closeApp(): void {
  try {
    void Promise.resolve(closeView()).catch(() => {})
  } catch {
    // 무시
  }
}
