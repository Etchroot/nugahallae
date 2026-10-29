import { lazy } from 'react'
import type { ComponentType } from 'react'
import type { GameProps } from './types'

export type LazyGameComponent = ComponentType<GameProps> & { preload: () => Promise<unknown> }

// 게임 화면 코드는 그 게임을 고를 때만 내려받는다(첫 화면 용량 절감).
// preload()는 준비 화면에서 미리 불러 두어, 게임이 시작될 때 기다리지 않게 한다. import()는 한 번만 받아 재사용된다.
export function lazyGame(load: () => Promise<{ default: ComponentType<GameProps> }>): LazyGameComponent {
  const Component = lazy(load) as unknown as LazyGameComponent
  Component.preload = load
  return Component
}
