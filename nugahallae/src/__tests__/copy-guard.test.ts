import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const srcDir = join(here, '..')
const rootDir = join(srcDir, '..')

// '돈' 한 글자는 "돈다"와 겹치므로 구 단위로만 검사한다.
const FORBIDDEN = [
  '내기',
  '밥값',
  '당첨',
  '복불복',
  '베팅',
  '💸',
  '쏘기',
  '쏜다',
  '돈을',
  '돈이',
  '돈 내',
  '돈내',
]

function collect(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      if (name === '__tests__') continue
      out.push(...collect(full))
    } else if (/\.(ts|tsx|css)$/.test(name) && !/\.test\./.test(name)) {
      out.push(full)
    }
  }
  return out
}

const files = [...collect(srcDir), join(rootDir, 'index.html')]

describe('copy guard', () => {
  test('검사 대상 파일을 찾는다', () => {
    expect(files.length).toBeGreaterThan(5)
  })

  test.each(files.map((f) => [relative(rootDir, f), f]))('%s에 금지어가 없다', (_name, file) => {
    const text = readFileSync(file, 'utf8')
    const hits = FORBIDDEN.filter((w) => text.includes(w))
    expect(hits).toEqual([])
  })
})
