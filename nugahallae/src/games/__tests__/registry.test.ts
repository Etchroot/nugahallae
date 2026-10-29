import { test, expect, describe } from 'vitest'
import { GAMES, findGame } from '../registry'
import { collectDefinitions } from '../collect'
import type { GameDefinition } from '../types'

const stub = (id: string): GameDefinition => ({
  id,
  icon: '🎲',
  title: id,
  summary: 's',
  rule: 'r',
  tint: '#fff',
  Component: () => null,
})

describe('collectDefinitions', () => {
  test('빈 glob 결과도 처리한다', () => {
    expect(collectDefinitions({})).toEqual([])
  })
  test('id 알파벳순으로 정렬한다', () => {
    const out = collectDefinitions({
      './zeta/definition.ts': { default: stub('zeta') },
      './alpha/definition.ts': { default: stub('alpha') },
    })
    expect(out.map((g) => g.id)).toEqual(['alpha', 'zeta'])
  })
  test('order가 작은 게임이 먼저, order가 없으면 맨 뒤에 id순으로 놓는다', () => {
    const out = collectDefinitions({
      './zeta/definition.ts': { default: { ...stub('zeta'), order: 1 } },
      './beta/definition.ts': { default: stub('beta') },
      './alpha/definition.ts': { default: stub('alpha') },
      './mid/definition.ts': { default: { ...stub('mid'), order: 2 } },
    })
    expect(out.map((g) => g.id)).toEqual(['zeta', 'mid', 'alpha', 'beta'])
  })
  test('default export가 없는 모듈은 건너뛴다', () => {
    expect(collectDefinitions({ './x/definition.ts': {} as { default: GameDefinition } })).toEqual([])
  })
})

describe('registry', () => {
  test('게임 30종이 모두 자동 등록되고 홈 목록은 돌림판부터 시작한다', () => {
    expect(GAMES).toHaveLength(30)
    expect(GAMES.slice(0, 4).map((g) => g.id)).toEqual(['roulette', 'pour', 'ladder', 'croc'])
  })
  test('id가 중복되지 않는다', () => {
    const ids = GAMES.map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  test('모든 게임이 필수 필드를 갖고 summary는 30자 이하', () => {
    for (const g of GAMES) {
      expect(g.id, g.id).toBeTruthy()
      expect(g.icon, g.id).toBeTruthy()
      expect(g.title, g.id).toBeTruthy()
      expect(g.summary, g.id).toBeTruthy()
      expect(g.rule, g.id).toBeTruthy()
      expect(g.tint, g.id).toBeTruthy()
      expect(g.Component, g.id).toBeTruthy()
      expect(g.summary.length, g.id).toBeLessThanOrEqual(30)
    }
  })
  test('findGame은 GAMES의 모든 게임을 찾는다', () => {
    for (const g of GAMES) expect(findGame(g.id)).toBe(g)
    expect(findGame('없는게임')).toBeUndefined()
  })
})
