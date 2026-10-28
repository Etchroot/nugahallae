import { test, expect } from 'vitest'
import { backActionFor } from '../flow'

import { PIECES } from '../../domain/pieces'
const piece = PIECES[0]

test('home -> confirmClose', () => {
  expect(backActionFor({ name: 'home' })).toEqual({ kind: 'confirmClose' })
})
test('prepare -> goto home', () => {
  expect(backActionFor({ name: 'prepare', gameId: 'roulette' })).toEqual({ kind: 'goto', screen: { name: 'home' } })
})
test('play -> confirmQuitGame', () => {
  expect(backActionFor({ name: 'play', gameId: 'roulette', order: [] })).toEqual({ kind: 'confirmQuitGame' })
})
test('result -> goto home', () => {
  expect(backActionFor({ name: 'result', gameId: 'roulette', loser: piece })).toEqual({ kind: 'goto', screen: { name: 'home' } })
})
