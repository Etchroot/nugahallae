import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..')

function cssFiles(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...cssFiles(full))
    else if (name.endsWith('.css')) out.push(full)
  }
  return out
}

/** 선택자에 쓰인 클래스 이름들(주석·선언부 제외) */
function classesIn(file: string): Set<string> {
  const text = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const selectors = [...text.matchAll(/([^{}]+)\{/g)].map((m) => m[1])
  const set = new Set<string>()
  for (const sel of selectors) {
    if (sel.trim().startsWith('@')) continue
    for (const m of sel.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) set.add(m[1])
  }
  return set
}

const files = cssFiles(srcDir)

// 의도된 문맥 덮어쓰기: screens.css의 `.play-game .rl-root`가 돌림판 루트의 위치만 조정한다.
const ALLOWED_SHARED = new Set(['rl-root'])

describe('css class collisions', () => {
  test('css 파일을 찾는다', () => {
    expect(files.length).toBeGreaterThan(5)
  })

  test('같은 클래스 이름을 서로 다른 css 파일이 정의하지 않는다', () => {
    const owner = new Map<string, string>()
    const dup: string[] = []
    for (const f of files) {
      for (const c of classesIn(f)) {
        if (ALLOWED_SHARED.has(c)) continue
        const prev = owner.get(c)
        if (prev && prev !== f) dup.push(`.${c}: ${relative(srcDir, prev)} / ${relative(srcDir, f)}`)
        else owner.set(c, f)
      }
    }
    expect(dup).toEqual([])
  })

  test('web 데모 shim의 클래스는 모두 wb- 접두어', () => {
    const web = files.filter((f) => relative(srcDir, f).split(sep).join('/').startsWith('web/'))
    expect(web.length).toBeGreaterThan(0)
    for (const f of web) {
      const bad = [...classesIn(f)].filter((c) => !c.startsWith('wb-'))
      expect(bad).toEqual([])
    }
  })
})
