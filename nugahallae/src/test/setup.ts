import '@testing-library/jest-dom/vitest'

// jsdom에는 matchMedia가 없어 TDS가 실패한다. 테스트용 최소 shim.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}

// jsdom에는 ResizeObserver도 없다(TDS TextField 등이 사용). 테스트용 최소 shim.
if (typeof window !== 'undefined' && !('ResizeObserver' in window)) {
  class ResizeObserverShim {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  ;(window as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverShim
  ;(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverShim
}
