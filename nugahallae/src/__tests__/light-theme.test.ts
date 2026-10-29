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

function luminance(hex: string): number {
  let h = hex.slice(1)
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const ch = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}

// 작은 요소(도형·배지·버튼)만 어두운 배경을 허용한다. 큰 면(*-root, *-stage, .play-*, body, html)은 불가.
const ALLOWED_DARK: Record<string, string> = {
  '.cr-mouth': '악어 입 안쪽: 작은 도형이라 짙은 붉은색이 게임 고유 표현',
  '.sc-pick-badge': '말 카드 위의 작은 "내 말" 배지',
  '.wb-btn--dark-fill': '웹 데모용 작은 버튼',
}
const FORBIDDEN_BIG = /(-root|-stage|^\.play-|^body$|^html$)/

interface Hit {
  file: string
  selector: string
  value: string
}

function darkBackgrounds(): Hit[] {
  const hits: Hit[] = []
  for (const f of cssFiles(srcDir)) {
    const text = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    for (const m of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selectors = m[1].split(',').map((s) => s.trim())
      for (const d of m[2].matchAll(/(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/g)) {
        const hexes = d[1].match(/#[0-9a-fA-F]{3,8}\b/g) ?? []
        if (hexes.some((h) => luminance(h) < 0.18)) {
          for (const s of selectors)
            hits.push({ file: relative(srcDir, f).split(sep).join('/'), selector: s, value: d[1].trim() })
        }
      }
    }
  }
  return hits
}

describe('light theme', () => {
  test('어두운 배경색(휘도 < 0.18)은 허용 목록의 작은 요소에만 있다', () => {
    const bad = darkBackgrounds().filter((h) => !(h.selector in ALLOWED_DARK))
    expect(bad.map((h) => `${h.file} ${h.selector}: ${h.value}`)).toEqual([])
  })

  test('허용 목록에 큰 면 선택자가 없다', () => {
    expect(Object.keys(ALLOWED_DARK).filter((s) => FORBIDDEN_BIG.test(s))).toEqual([])
  })

  test('허용 목록은 실제로 쓰이는 선택자만 남긴다', () => {
    const used = new Set(darkBackgrounds().map((h) => h.selector))
    expect(Object.keys(ALLOWED_DARK).filter((s) => !used.has(s))).toEqual([])
  })

  test('공통 테마 토큰 파일이 있고 main에서 불러온다', () => {
    const css = readFileSync(join(srcDir, 'styles/play-theme.css'), 'utf8')
    for (const v of [
      '--pl-bg',
      '--pl-surface',
      '--pl-surface-2',
      '--pl-line',
      '--pl-text',
      '--pl-text-2',
      '--pl-text-3',
      '--pl-primary',
      '--pl-danger',
      '--pl-warn-text',
    ])
      expect(css).toContain(v + ':')
    expect(readFileSync(join(srcDir, 'main.tsx'), 'utf8')).toContain('play-theme.css')
  })
})

test('viewport 확대·축소가 꺼져 있다', () => {
  const html = readFileSync(join(srcDir, '..', 'index.html'), 'utf8')
  expect(html).toMatch(/name="viewport"[^>]*maximum-scale=1/)
  expect(html).toMatch(/name="viewport"[^>]*user-scalable=no/)
})
