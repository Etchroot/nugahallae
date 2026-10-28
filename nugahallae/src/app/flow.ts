import type { Piece } from '../domain/pieces'

export type Screen =
  | { name: 'home' }
  | { name: 'prepare'; gameId: string }
  | { name: 'play'; gameId: string; order: Piece[] }
  | { name: 'result'; gameId: string; loser: Piece }

export type BackAction =
  | { kind: 'confirmClose' }
  | { kind: 'goto'; screen: Screen }
  | { kind: 'confirmQuitGame' }

export function backActionFor(s: Screen): BackAction {
  switch (s.name) {
    case 'home':
      return { kind: 'confirmClose' }
    case 'prepare':
    case 'result':
      return { kind: 'goto', screen: { name: 'home' } }
    case 'play':
      return { kind: 'confirmQuitGame' }
  }
}
