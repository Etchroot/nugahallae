import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test, expect } from 'vitest'

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'twister.css'), 'utf8')
const tsx = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'TwisterGame.tsx'), 'utf8')

function rule(selector: string): string {
  const m = css.match(new RegExp(`(^|\\})\\s*${selector.replace(/[.]/g, '\\.')}\\s*\\{([^}]*)\\}`, 'm'))
  return m ? m[2] : ''
}

test('문장 글자 크기는 화면 폭에 맞춰 줄어든다(375px에서 긴 문장이 넘치지 않게)', () => {
  expect(rule('.tw-sentence')).toMatch(/font-size:\s*clamp\(24px,\s*7\.5vw,\s*36px\)/)
})

test('문장 영역은 내용만큼 늘어나 안내 문구·판정 버튼과 겹치지 않는다(넘치면 화면이 스크롤)', () => {
  expect(tsx).toContain('rg-stage tw-field')
  const stage = rule('.tw-field')
  expect(stage).toMatch(/flex:\s*1\s+0\s+auto/)
  expect(stage).not.toMatch(/overflow\s*:\s*hidden/)
  // 안내 문구는 문장 아래 일반 흐름(절대 위치 아님)
  expect(rule('.tw-note')).not.toMatch(/position\s*:\s*absolute/)
})

test('판정 버튼은 높이 72px 이상', () => {
  expect(rule('.tw-judge .tw-big')).toMatch(/min-height:\s*7[2-9]px|min-height:\s*[89]\dpx/)
})
