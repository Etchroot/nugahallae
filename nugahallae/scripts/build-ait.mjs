// 앱인토스 제출용 .ait를 build/ 폴더에 버전을 붙여 만든다. 이미 있는 버전은 덮어쓰지 않는다.
// 버전은 ait-version.txt에 적는다: 큰 변화는 정수(1.0, 2.0), 작은 패치·버그 수정은 소수점 뒤(0.2, 0.3).
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, renameSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const appName = 'nugahallae'
const version = readFileSync(join(root, 'ait-version.txt'), 'utf8').trim()
if (!/^\d+\.\d+$/.test(version)) {
  console.error(`ait-version.txt 형식이 맞지 않아요: "${version}" (예: 0.1, 1.0)`)
  process.exit(1)
}

const outDir = join(root, 'build')
// AD_TEST=1: 콘솔 QR로 광고를 확인하는 테스트용 빌드(테스트 광고 ID 사용). 제출용 빌드에는 쓰지 마세요.
const adTest = process.env.AD_TEST === '1'
const suffix = adTest ? '-adtest' : ''
const target = join(outDir, `${appName}-v${version}${suffix}.ait`)
const rootFile = join(root, `${appName}.ait`)

if (existsSync(target)) {
  console.error(`build/${appName}-v${version}${suffix}.ait 가 이미 있어요. ait-version.txt의 버전을 올린 뒤 다시 실행하세요.`)
  process.exit(1)
}
if (existsSync(rootFile)) {
  console.error(`${appName}.ait 가 프로젝트 맨 위에 남아 있어요(덮어쓰게 돼요). build/ 로 옮기거나 지운 뒤 다시 실행하세요.`)
  process.exit(1)
}

for (const cmd of ['npx vite build', 'npx ait build']) {
  const env = adTest ? { ...process.env, VITE_AD_GROUP_ID: 'ait-ad-test-banner-id' } : process.env
  const r = spawnSync(cmd, { cwd: root, stdio: 'inherit', shell: true, env })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

mkdirSync(outDir, { recursive: true })
renameSync(rootFile, target)
console.log(`\n만들었어요: build/${appName}-v${version}${suffix}.ait`)
