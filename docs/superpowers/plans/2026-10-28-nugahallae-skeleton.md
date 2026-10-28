# 누가할래 뼈대 + 탈락식 돌림판 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈(인원수·벌칙) → 말 뽑기 → 탈락식 돌림판 → 결과 공개 → 한 판 더/다른 게임, 한 바퀴가 끝까지 도는 앱인토스 WebView 미니앱 뼈대를 만든다.

**Architecture:** `/ait:new`(create-ait-app, `--tds`)로 만든 React 18 + Vite 프로젝트. 화면 전환은 `App.tsx`의 단일 상태(판별 유니온)로 관리하고 라우터는 쓰지 않는다. 순수 로직(말 뽑기, 돌림판 각도·탈락, 설정 검증, 뒤로가기 판단)은 `src/domain`·`src/games/*/logic.ts`에 두고 Vitest로 TDD, 화면은 브라우저(devtools mock)로 확인한다. 토스 SDK 호출은 `src/platform/sdk.ts` 한 곳에서 감싸 토스 밖(GitHub Pages)에서도 동작하게 한다.

**Tech Stack:** React 18, TypeScript, Vite, `@toss/tds-mobile`(+`-ait`), `@apps-in-toss/web-framework`, `@apps-in-toss/devtools`(mock), Vitest + @testing-library/react(jsdom), Tossface.

**Spec:** `docs/superpowers/specs/2026-10-28-nugahallae-design.md`

**일정:** 1일차(오늘) Task 1~4, 2일차 Task 5~8 → 2일차 중간 점검 "첫 버전이 돌아가는가" 충족.

## Global Constraints

- 앱 안 모든 문구·이미지에 금지: `내기`, `밥값`, `돈`, `쏘`, `당첨`, `복불복`, `베팅`, `💸`, 카지노 칩 모양. 결과는 "걸렸다", "차례", "통과", "벌칙"으로 표현한다.
- 예능 프로그램 이름·연예인·캐릭터를 쓰지 않는다.
- 이름 입력 없음. 인원수 2~10명만 고른다.
- 게임 목록은 탭 없이 한 목록.
- 플레이 화면(③)은 TDS 대신 자체 디자인. 홈·준비·결과의 버튼/리스트는 TDS.
- `eval` 금지, 토스 도메인 밖 이동·iframe 금지, SSR 금지.
- 세로 모드, Safe Area(Dynamic Island 포함) 침범 금지, 진입 즉시 바텀시트 금지.
- 햅틱은 필요한 순간에만 1회 호출(루프·타이머 반복 호출 금지).
- 사운드 없음.
- SDK 호출 실패 시 앱은 기본값으로 계속 동작해야 한다(토스 밖 GitHub Pages 빌드).
- appName: `nugahallae` (콘솔 등록 시 맞춤).
- 결과 문구 고정: `{emoji} {colorName} {animalName} 걸렸다!`, 벌칙 줄 `벌칙: {penalty}`, 버튼 `한 판 더` / `다른 게임`.
- 돌림판 규칙 문구 고정: `걸리면 통과! 마지막까지 남으면 벌칙` — 준비 화면과 플레이 화면 상단에 항상 보인다.

## Review Focus

1. **빠른 연타**: 돌리는 중 `돌리기`를 또 누르거나, 말 뽑기에서 연속 탭 → 한 번만 처리돼야 한다. (Task 2, Task 6 테스트)
2. **돌림판 칸 경계**: 회전 결과가 정확히 칸 경계(0°, 360°, 360/n의 배수)에 멈춤 → 항상 유효한 칸 하나, 범위 밖 인덱스 없음. (Task 3 테스트)
3. **저장값 손상 / SDK 없음**: Storage에 깨진 JSON, 범위 밖 인원(1, 99), SDK import 실패 → 기본값(인원 4, 벌칙 빈칸)으로 시작. (Task 4 테스트)
4. **벌칙 입력 이상값**: 공백만, 매우 긴 글, 앞뒤 공백 → trim, 최대 20자, 비면 결과에 벌칙 줄 없음. (Task 4, Task 7 테스트)
5. **게임 중 뒤로가기/화면 이탈**: 돌리는 도중 뒤로가기 → "그만할까요?" 확인, 확인 시 홈으로 가고 남은 타이머가 결과를 띄우지 않는다. (Task 5, Task 6 테스트)

---

### Task 1: 프로젝트 뼈대 + 테스트 환경 + git

**Files:**
- Create (CLI 생성): `nugahallae/` 전체
- Modify: `nugahallae/package.json` (test 스크립트, devDeps)
- Create: `nugahallae/vitest.config.ts`, `nugahallae/src/test/setup.ts`
- Create: `nugahallae/src/domain/__tests__/smoke.test.ts`
- Create: `.gitignore`(project1 루트)

**Interfaces:**
- Produces: `npm test`(vitest run), `npm run dev`, `npm run build`(끝이 `ait build`).

- [ ] **Step 1:** `C:\Users\user\강의 실습\project1`에서 `/ait:new nugahallae --tds` 실행(ait new-miniapp 스킬 지시대로, `--pm npm`). 디자인 가이드·Tossface·devtools는 기본값 그대로(`--no-*` 붙이지 않음).
- [ ] **Step 2:** 확인: `nugahallae/apps-in-toss.config.ts` 존재, `cd nugahallae && npm run dev` 후 브라우저에서 TDS 기본 홈이 뜸. 생성된 `CLAUDE.md`/`docs/design-guide.md`를 읽고 이후 화면 작업에 그 규칙을 따른다.
- [ ] **Step 3:** `npm i -D vitest @testing-library/react @testing-library/jest-dom jsdom`, `package.json`에 `"test": "vitest run"`. `vitest.config.ts`: environment `jsdom`, setupFiles `src/test/setup.ts`(jest-dom import), `@apps-in-toss/web-framework`는 테스트에서 `vi.mock`으로 대체 가능하게 둔다.
- [ ] **Step 4:** smoke 테스트 `expect(1 + 1).toBe(2)` 작성 → `npm test` PASS.
- [ ] **Step 5:** project1 루트에서 `git init`, 루트 `.gitignore`에 `node_modules/`, `dist/`, `*.ait` 추가. 커밋:

```bash
git add -A
git commit -m "chore: scaffold nugahallae mini-app with ait (tds) and vitest"
```

---

### Task 2: 말(Piece) 목록과 말 뽑기 로직

**Files:**
- Create: `nugahallae/src/domain/rng.ts`
- Create: `nugahallae/src/domain/pieces.ts`
- Test: `nugahallae/src/domain/__tests__/pieces.test.ts`

**Interfaces:**
- Produces:
  - `type Rng = () => number` (0 이상 1 미만), `defaultRng: Rng = Math.random`
  - `interface Piece { id: string; emoji: string; animalName: string; colorName: string; color: string }`
  - `PIECES: readonly Piece[]` (정확히 10개)
  - `drawPieces(count: number, rng?: Rng): Piece[]` — PIECES에서 중복 없이 `count`개를 무작위 순서로 반환. 반환 순서 = 뽑는 순서 = 게임 차례.
  - `pieceLabel(p: Piece): string` → `` `${p.emoji} ${p.colorName} ${p.animalName}` ``

PIECES (Claude의 판단 — 색·동물 모두 서로 다름):

| id | emoji | colorName | animalName | color |
|---|---|---|---|---|
| fox | 🦊 | 주황 | 여우 | #FF7A1A |
| penguin | 🐧 | 파란 | 펭귄 | #3182F6 |
| frog | 🐸 | 초록 | 개구리 | #03B26C |
| chick | 🐥 | 노란 | 병아리 | #FFC342 |
| pig | 🐷 | 분홍 | 돼지 | #F472B6 |
| bear | 🐻 | 갈색 | 곰 | #A0643C |
| rabbit | 🐰 | 하늘 | 토끼 | #38BDF8 |
| tiger | 🐯 | 빨간 | 호랑이 | #F04452 |
| unicorn | 🦄 | 보라 | 유니콘 | #8B5CF6 |
| panda | 🐼 | 회색 | 판다 | #6B7684 |

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
test('PIECES는 10개이고 id·color·animalName·colorName이 모두 서로 다르다', ...)
test('drawPieces(4)는 서로 다른 말 4개를 반환한다', () => { expect(new Set(drawPieces(4).map(p => p.id)).size).toBe(4) })
test('drawPieces는 rng가 같으면 같은 순서를 낸다', ...) // 고정 시퀀스 rng 두 개로 비교
test('drawPieces(10)은 10개 전부를 포함한다', ...)
test('drawPieces는 2 미만·10 초과·정수 아님에 RangeError', () => { expect(() => drawPieces(1)).toThrow(RangeError); expect(() => drawPieces(11)).toThrow(RangeError); expect(() => drawPieces(2.5)).toThrow(RangeError) })
test('pieceLabel', () => { expect(pieceLabel(PIECES[0])).toBe('🦊 주황 여우') })
```

- [ ] **Step 2:** `npm test -- pieces` → FAIL(모듈 없음).
- [ ] **Step 3:** `rng.ts`, `pieces.ts` 구현. `drawPieces`는 Fisher–Yates 셔플 후 앞에서 `count`개.
- [ ] **Step 4:** `npm test -- pieces` → PASS.
- [ ] **Step 5:** 커밋 `feat: add pieces and random draw`.

---

### Task 3: 게임 부품 규격 + 탈락식 돌림판 로직

**Files:**
- Create: `nugahallae/src/games/types.ts`
- Create: `nugahallae/src/games/roulette/logic.ts`
- Test: `nugahallae/src/games/roulette/__tests__/logic.test.ts`

**Interfaces:**
- Consumes: `Piece`, `Rng` (Task 2)
- Produces (`types.ts`):
  - `interface GameProps { order: Piece[]; onFinish: (loser: Piece) => void }`
  - `interface GameDefinition { id: string; icon: string; title: string; summary: string; rule: string; Component: React.ComponentType<GameProps> }`
- Produces (`logic.ts`):
  - `segmentAtPointer(rotationDeg: number, count: number): number` — 칸 0은 12시 방향에서 시계방향으로 시작, 포인터는 12시 고정. 휠이 시계방향으로 `rotationDeg`만큼 돌았을 때 포인터가 가리키는 칸. 항상 `0..count-1`.
  - `planSpin(currentRotation: number, count: number, rng: Rng, isFinal: boolean): { targetRotation: number; landedIndex: number; durationMs: number }` — `targetRotation = currentRotation + 360*turns + offset`, turns는 일반 6, 마지막(`isFinal`) 9. offset은 칸 경계에서 칸 폭의 15% 이상 떨어지도록 선택. `durationMs` 일반 4500, 마지막 7000. `landedIndex = segmentAtPointer(targetRotation, count)`.
  - `interface RouletteState { remaining: Piece[]; spinnerTurn: number; phase: 'idle' | 'spinning' | 'done'; lastPassed: Piece | null; loser: Piece | null }`
  - `initRoulette(order: Piece[]): RouletteState`
  - `startSpin(s: RouletteState): RouletteState` — `idle`일 때만 `spinning`, 그 외 그대로 반환(연타 방지).
  - `resolveSpin(s: RouletteState, landedIndex: number): RouletteState` — `remaining[landedIndex]`를 통과시켜 제거, `lastPassed` 설정, `spinnerTurn + 1`. 남은 게 1개면 `phase: 'done'`, `loser = 그 말`. 아니면 `idle`. `spinning`이 아니면 그대로 반환.
  - `currentSpinner(s: RouletteState, order: Piece[]): Piece` → `order[s.spinnerTurn % order.length]` (통과한 말의 주인도 계속 돌린다 — Claude의 판단)

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
test('segmentAtPointer: 회전 0이면 칸 0', () => expect(segmentAtPointer(0, 4)).toBe(0))
test('segmentAtPointer: 시계방향 90° 회전(4칸)이면 포인터는 칸 3', () => expect(segmentAtPointer(90, 4)).toBe(3))
test('segmentAtPointer: 경계값 360, 720, 360/n 배수, 음수, 큰 값에서도 0..n-1', () => {
  for (const n of [2, 3, 7, 10]) for (const r of [0, 360, 720, 360 / n, 2 * 360 / n, -45, 1e6 + 0.5])
    { const i = segmentAtPointer(r, n); expect(i).toBeGreaterThanOrEqual(0); expect(i).toBeLessThan(n) }
})
test('planSpin: 착지 칸이 경계에서 칸 폭 15% 이상 떨어져 있다', ...) // rng 0, 0.5, 0.999…
test('planSpin: isFinal이면 durationMs 7000, 아니면 4500', ...)
test('resolveSpin: 4명 → 통과 3번 후 done, loser는 남은 1명', ...)
test('resolveSpin: 2명 남았을 때 하나 통과하면 나머지가 loser', ...)
test('startSpin 연타: spinning 중 startSpin은 상태를 바꾸지 않는다', ...)
test('resolveSpin은 idle 상태에서 무시된다', ...)
test('currentSpinner는 order를 순환한다', ...)
```

- [ ] **Step 2:** `npm test -- roulette` → FAIL.
- [ ] **Step 3:** `types.ts`, `logic.ts` 구현. 각도 정규화는 `((x % 360) + 360) % 360`, 포인터 상대각 `a = (360 - norm(rotation)) % 360`, `index = Math.min(count - 1, Math.floor(a / (360 / count)))`.
- [ ] **Step 4:** `npm test -- roulette` → PASS.
- [ ] **Step 5:** 커밋 `feat: add game contract and elimination roulette logic`.

---

### Task 4: SDK 래퍼 + 설정 저장/검증

**Files:**
- Create: `nugahallae/src/platform/sdk.ts`
- Create: `nugahallae/src/domain/settings.ts`
- Test: `nugahallae/src/domain/__tests__/settings.test.ts`, `nugahallae/src/platform/__tests__/sdk.test.ts`

**Interfaces:**
- Produces (`sdk.ts`) — 모든 함수는 throw하지 않는다:
  - `haptic(type: 'tap' | 'success' | 'error'): Promise<void>` — `generateHapticFeedback({ type })`, 실패 무시.
  - `storageGet(key: string): Promise<string | null>` / `storageSet(key: string, value: string): Promise<void>` — SDK `Storage` 우선, 실패 시 `localStorage`, 그것도 실패하면 null/무시.
  - `onBack(handler: () => void): () => void` — `graniteEvent.addEventListener('backEvent', ...)` 구독, 해제 함수 반환. SDK 없으면 no-op 해제 함수. (정확한 시그니처는 apps-in-toss-docs MCP의 "이벤트 제어하기" 문서로 확인)
  - `closeApp(): void` — `closeView()`, 실패 무시.
- Produces (`settings.ts`):
  - `interface Settings { playerCount: number; penalty: string }`
  - `DEFAULT_SETTINGS: Settings = { playerCount: 4, penalty: '' }`, `PENALTY_MAX = 20`
  - `normalizePenalty(raw: string): string` — trim 후 앞 20자.
  - `parseSettings(raw: string | null): Settings` — 깨진 JSON/누락/범위 밖(2~10 정수 아님)은 해당 필드 기본값.
  - `loadSettings(): Promise<Settings>` / `saveSettings(s: Settings): Promise<void>` — 키 `nugahallae:settings`.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
test('parseSettings(null) → DEFAULT_SETTINGS', ...)
test('parseSettings("{깨진") → DEFAULT_SETTINGS', ...)
test('parseSettings 인원 1, 99, 3.5, "4" → 기본 4', ...)
test('parseSettings 정상값 유지', () => expect(parseSettings('{"playerCount":7,"penalty":"커피 사기"}')).toEqual({ playerCount: 7, penalty: '커피 사기' }))
test('normalizePenalty: "   " → "", "  설거지 " → "설거지", 30자 → 앞 20자', ...)
test('storageGet: SDK가 throw하면 localStorage 값을 쓴다', ...) // vi.mock('@apps-in-toss/web-framework')
test('storageGet: SDK·localStorage 모두 throw해도 null을 반환하고 throw하지 않는다', ...)
test('haptic: SDK가 reject해도 throw하지 않는다', ...)
```

- [ ] **Step 2:** `npm test -- settings sdk` → FAIL.
- [ ] **Step 3:** 구현.
- [ ] **Step 4:** `npm test` → 전체 PASS.
- [ ] **Step 5:** 커밋 `feat: add sdk wrapper and settings persistence`.

---

### Task 5: 화면 흐름 상태 + 뒤로가기 규칙 + App 셸

**Files:**
- Create: `nugahallae/src/app/flow.ts`
- Test: `nugahallae/src/app/__tests__/flow.test.ts`
- Create: `nugahallae/src/games/registry.ts`
- Modify: `nugahallae/src/App.tsx` (TDS 샘플 홈 제거, 셸로 교체)
- Create: `nugahallae/src/components/ConfirmDialog.tsx`

**Interfaces:**
- Consumes: `Piece`, `GameDefinition`, `Settings`, `onBack`, `closeApp`
- Produces (`flow.ts`):
  - `type Screen = { name: 'home' } | { name: 'prepare'; gameId: string } | { name: 'play'; gameId: string; order: Piece[] } | { name: 'result'; gameId: string; loser: Piece }`
  - `type BackAction = { kind: 'confirmClose' } | { kind: 'goto'; screen: Screen } | { kind: 'confirmQuitGame' }`
  - `backActionFor(s: Screen): BackAction` — home→confirmClose, prepare→goto home, play→confirmQuitGame, result→goto home.
- Produces (`registry.ts`): `GAMES: GameDefinition[]`, `findGame(id: string): GameDefinition | undefined` (이 Task에서는 빈 배열, Task 6에서 돌림판 등록)
- `App.tsx`: `Screen` 상태 하나, `onBack` 구독(언마운트 시 해제), 확인 다이얼로그 문구 — 종료: `누가할래를 닫을까요?` [닫기]/[취소], 게임 중: `게임을 그만할까요?` [그만하기]/[계속하기]. 화면 컴포넌트 자리는 Task 6·7에서 채움.

- [ ] **Step 1:** `backActionFor` 4가지 경우 테스트 작성 → FAIL.
- [ ] **Step 2:** `flow.ts` 구현 → PASS.
- [ ] **Step 3:** App 렌더 테스트: `render(<App />)` 후 홈 placeholder가 보이고, mock `onBack` 핸들러 호출 시 `누가할래를 닫을까요?`가 보인다. → 구현 → PASS.
- [ ] **Step 4:** `npm run dev`로 브라우저 확인, 콘솔 에러 없음.
- [ ] **Step 5:** 커밋 `feat: add screen flow and back handling shell`.

---

### Task 6: 탈락식 돌림판 화면 + 등록

**Files:**
- Create: `nugahallae/src/games/roulette/RouletteGame.tsx`, `nugahallae/src/games/roulette/roulette.css`
- Modify: `nugahallae/src/games/registry.ts`
- Test: `nugahallae/src/games/roulette/__tests__/RouletteGame.test.tsx`

**Interfaces:**
- Consumes: Task 3 전부, `pieceLabel`, `haptic`, `GameProps`
- Produces: `GAMES[0] = { id: 'roulette', icon: '🎡', title: '돌림판', summary: '걸리면 통과, 끝까지 남으면 벌칙', rule: '차례대로 돌림판을 돌려요. 화살표가 가리킨 말은 통과! 마지막까지 남은 말이 벌칙이에요.', Component: RouletteGame }`

화면 구성(자체 디자인, 풀스크린):
- 상단 고정 띠: `걸리면 통과! 마지막까지 남으면 벌칙` + `남은 말 {n}개`
- `👉 {pieceLabel(currentSpinner)} 차례예요` 
- 휠(canvas 또는 SVG, 남은 말 수만큼 칸, 칸 색 = piece.color, 칸에 emoji), 12시 포인터
- 버튼 `돌리기` (spinning 중 disabled)
- 착지 후 오버레이 `{pieceLabel} 통과!` 1.2초 → 휠을 남은 말로 다시 그림(회전값은 `% 360`으로 접어 튀지 않게)
- `done`이 되면 1초 뒤 `onFinish(loser)`; 햅틱은 통과 시 `tap` 1회
- 언마운트 시 모든 타이머 정리(onFinish가 이후 호출되지 않음)
- 1일차 `index.html` 돌림판(캔버스 그리기, CSS transform 회전)을 참고

- [ ] **Step 1: 실패하는 테스트 작성** (fake timers, rng 고정 주입 위해 `RouletteGame`은 선택 prop `rng?: Rng` 허용)

```tsx
test('규칙 문구와 남은 말 수가 보인다', ...) // '걸리면 통과! 마지막까지 남으면 벌칙', '남은 말 3개'
test('돌리기 연타해도 한 번만 돈다', ...) // 두 번 클릭 → 시간 진행 → '남은 말 2개'
test('3명이면 통과 2번 후 onFinish가 남은 말로 1번 호출된다', ...)
test('돌리는 중 언마운트하면 onFinish가 호출되지 않는다', ...)
```

- [ ] **Step 2:** FAIL 확인 → **Step 3:** 구현 → **Step 4:** PASS, 브라우저에서 2명·10명으로 끝까지 돌려 보기(경계 시각 확인).
- [ ] **Step 5:** 커밋 `feat: add elimination roulette game`.

---

### Task 7: 홈 · 말 뽑기 · 결과 화면 연결

**Files:**
- Create: `nugahallae/src/screens/HomeScreen.tsx`, `PrepareScreen.tsx`, `PlayScreen.tsx`, `ResultScreen.tsx`
- Modify: `nugahallae/src/App.tsx`
- Test: `nugahallae/src/screens/__tests__/flow.integration.test.tsx`

**Interfaces:**
- Consumes: 앞 Task 전부
- `HomeScreen({ settings, onChange(Settings), onPickGame(gameId) })` — 인원수 스테퍼(2~10, TDS), 벌칙 입력(placeholder `벌칙 (선택) 예: 커피 사기`, `normalizePenalty` 적용, 20자 제한), 게임 목록(TDS ListRow, 탭 없음). 변경 시 `saveSettings`.
- `PrepareScreen({ game, playerCount, onStart(order: Piece[]), onBack })` — 규칙 문단, 말 뽑기:
  - 진입 시 `drawPieces(playerCount)`로 순서 고정
  - 대기 상태: `{i}번째 사람, 화면을 눌러 말을 뽑으세요` (전체 영역 탭)
  - 공개 상태: 큰 말 + `{pieceLabel} — 내 말을 기억하세요` + 버튼 `확인했어요` (누르면 가려지고 다음 사람 대기 상태). 공개 중 영역 탭은 무시(연타 방지).
  - 모두 뽑으면 TDS BottomCTA `시작하기` → `onStart(order)`
- `PlayScreen({ game, order, onFinish })` — `game.Component` 렌더, 상단에 게임 제목.
- `ResultScreen({ loser, penalty, onAgain, onOtherGame })` — 뜸 들이기 1.5초(`두구두구…`) → `{pieceLabel} 걸렸다!` + `haptic('success')` 1회 + 화면 효과, 벌칙이 있으면 `벌칙: {penalty}`, 버튼 `한 판 더`(같은 게임 prepare로) / `다른 게임`(home).

- [ ] **Step 1: 실패하는 통합 테스트 작성** (fake timers, Math.random 고정)

```tsx
test('홈 → 돌림판 → 3명 말 뽑기 → 시작 → 끝까지 → 결과에 "걸렸다!"와 "벌칙: 커피 사기"', ...)
test('벌칙이 공백이면 결과에 "벌칙:" 줄이 없다', ...)
test('말 공개 중 연속 탭해도 다음 말로 넘어가지 않는다', ...)
test('한 판 더 → 같은 게임 준비 화면, 다른 게임 → 홈', ...)
test('인원수는 2 아래/10 위로 못 간다', ...)
```

- [ ] **Step 2:** FAIL → **Step 3:** 구현 → **Step 4:** `npm test` 전체 PASS + 브라우저에서 한 바퀴(2명, 10명) 수동 확인, 모바일 폭 375px에서 깨짐 없음.
- [ ] **Step 5:** 커밋 `feat: connect home, piece draw, play and result screens`.

---

### Task 8: 금지어 가드 · Pages 빌드 · README

**Files:**
- Test: `nugahallae/src/__tests__/copy-guard.test.ts`
- Modify: `nugahallae/package.json` (`build:pages`)
- Create: `.github/workflows/pages.yml` (project1 루트)
- Create: `README.md` (project1 루트)

**Interfaces:**
- Consumes: 없음(정적 검사)

- [ ] **Step 1:** `copy-guard.test.ts` 작성: `src/**/*.{ts,tsx,css}`(테스트 파일 제외)와 `index.html`을 읽어 Global Constraints 금지어(`내기`, `밥값`, `당첨`, `복불복`, `베팅`, `💸`, `쏘기`, `쏜다`, `돈을`, `돈이`, `돈 내`, `돈내`)가 없음을 검사. (`돈` 한 글자는 "돈다"와 겹치므로 구 단위로만 검사) 실행 → PASS여야 함(실패 시 해당 문구 수정).
- [ ] **Step 2:** `"build:pages": "vite build --base=./ --outDir dist-pages"` 추가, 실행 후 `npx vite preview --outDir dist-pages`로 SDK 없는 환경에서 한 바퀴 동작 확인(콘솔에 uncaught 에러 없음). `.gitignore`에 `dist-pages/`.
- [ ] **Step 3:** `pages.yml`: push to main → `nugahallae`에서 `npm ci && npm run build:pages` → `actions/upload-pages-artifact`(path `nugahallae/dist-pages`) → `actions/deploy-pages`.
- [ ] **Step 4:** `npm run build`(ait build) 성공해 `.ait` 산출물 생성 확인.
- [ ] **Step 5:** README: 한 줄 소개, 실행 방법(`cd nugahallae && npm install && npm run dev`, `npm test`), 배포 주소 자리, 폴더 구조, 게임 추가 방법(`src/games/<id>/` + `registry.ts` 한 줄).
- [ ] **Step 6:** 커밋 `chore: add copy guard, pages build and readme`. (GitHub 저장소 생성과 push는 사용자가 진행하거나 사용자 확인 후 진행)
