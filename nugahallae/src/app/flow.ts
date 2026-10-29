import type { Piece } from '../domain/pieces'

export type Screen =
  | { name: 'home' }
  | { name: 'prepare'; gameId: string }
  | { name: 'play'; gameId: string; order: Piece[] }
  | { name: 'result'; gameId: string; loser: Piece }

export type BackAction =
  | { kind: 'close' }
  | { kind: 'goto'; screen: Screen }
  | { kind: 'confirmQuitGame' }

export function backActionFor(s: Screen): BackAction {
  switch (s.name) {
    case 'home':
      // 비게임 출시 기준: 최초 화면에서 뒤로가기를 누르면 확인 없이 미니앱이 종료된다.
      return { kind: 'close' }
    case 'prepare':
    case 'result':
      return { kind: 'goto', screen: { name: 'home' } }
    case 'play':
      return { kind: 'confirmQuitGame' }
  }
}
