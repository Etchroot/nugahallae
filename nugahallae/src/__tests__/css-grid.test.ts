import { test, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * `grid-template-columns: 1fr 1fr`의 1fr은 최소 폭이 내용 크기(min-content)라서,
 * 안에 SVG나 긴 글자가 있으면 칸이 벌어져 화면 밖으로 넘친다(전선 자르기에서 실제로 발생).
 * 최소 폭을 0으로 주는 `minmax(0, 1fr)`만 허용한다. 최소 폭이 명시된 `minmax(64px, 1fr)`도 허용.
 */
function cssFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return name === 'node_modules' ? [] : cssFiles(p)
    return name.endsWith('.css') ? [p] : []
  })
}

test('grid-template-columns에 맨 1fr을 쓰지 않는다(minmax(0, 1fr) 사용)', () => {
  const bad: string[] = []
  for (const file of cssFiles(join(__dirname, '..'))) {
    const css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    for (const m of css.matchAll(/grid-template-columns:\s*([^;}]*)/g)) {
      const value = m[1].replace(/minmax\([^)]*\)/g, '')
      if (/\b1fr\b/.test(value)) bad.push(`${file}: ${m[0].trim()}`)
    }
  }
  expect(bad).toEqual([])
})
