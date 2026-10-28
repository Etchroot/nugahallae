# 누가할래

폰 하나를 돌려가며 각자 말(동물)을 뽑고, 미니게임으로 벌칙 걸릴 사람을 정하는 앱인토스(Apps in Toss) WebView 미니앱입니다.

## 기능

- 인원수 2~10명 선택, 벌칙 문구 입력(선택)
- 폰을 돌려가며 한 명씩 자기 말(이모지 동물 + 색)을 뽑기
- 미니게임으로 진행 (현재: 돌림판 — 걸리면 통과, 마지막까지 남으면 벌칙)
- 결과 화면에서 `한 판 더` / `다른 게임`
- 토스 앱 밖(일반 브라우저)에서는 SDK 호출이 실패해도 기본값으로 계속 동작

## 실행 방법

Node.js 20 이상이 필요합니다.

```bash
cd nugahallae
npm install
npm run dev
```

브라우저에서 터미널에 표시된 주소(기본 http://localhost:5173)를 엽니다.

## 테스트

```bash
cd nugahallae
npm test
npx tsc -b   # 타입 검사
```

## 빌드

이 앱은 빌드가 두 가지입니다.

- **토스 앱 번들**: `npm run build` → `nugahallae/nugahallae.ait`.
  토스 디자인 시스템(TDS)을 쓰며, 앱인토스(토스 앱 안)에서 실행됩니다.
  `ait build`를 쓰므로 앱인토스 콘솔의 앱 등록(appName `nugahallae`)이 맞아야 하고, 배포(`npm run deploy`)에는 콘솔 로그인/API 키가 필요합니다.
- **데모 웹 빌드**: `npm run build:pages` → `nugahallae/dist-pages/` (로컬 확인은 `npm run dev:web`).
  TDS는 앱인토스 밖에서 실행되지 않으므로, 이 빌드에서만 `src/web/`의 대체 부품으로 바꿔 끼웁니다(`vite.config.ts`의 `--mode web`). 게임 로직과 화면 흐름은 토스 앱 번들과 같습니다.

`main` 브랜치에 push하면 `.github/workflows/pages.yml`이 데모 웹 빌드를 GitHub Pages에 배포합니다.

## 데모 주소

https://etchroot.github.io/nugahallae/ (휴대폰 브라우저로 여는 것을 권장합니다)

## 문서

- [설계 문서](docs/superpowers/specs/2026-10-28-nugahallae-design.md)
- [구현 계획](docs/superpowers/plans/2026-10-28-nugahallae-skeleton.md)
- [AI 활용 과정 기록](docs/ai-usage.md) — 작업 방식, 사용한 스킬·도구, AI 실수를 잡아 고친 사례, 프롬프트 변경 기록

## 폴더 구조

```
.github/workflows/pages.yml   GitHub Pages 배포
nugahallae/
  src/
    app/        화면 전환 흐름(flow)
    domain/     말(pieces), 난수(rng), 설정(settings)
    platform/   토스 SDK 래퍼(실패 시 기본값)
    screens/    홈 · 준비 · 플레이 · 결과 화면
    components/ 공통 컴포넌트
    games/      미니게임 (registry.ts, types.ts, <id>/)
    web/        데모 웹 빌드 전용 TDS 대체 부품
    __tests__/  앱 테스트, 금지어 가드(copy-guard)
```

## 게임 추가 방법

1. `nugahallae/src/games/<id>/` 폴더를 만들고 `GameDefinition`(`games/types.ts`)에 맞는 게임 컴포넌트를 작성합니다. 기존 `roulette/`를 참고하세요.
2. `nugahallae/src/games/registry.ts`의 `GAMES` 배열에 한 줄(항목 하나)을 추가합니다.

```ts
{ id: '<id>', icon: '🎲', title: '이름', summary: '한 줄 설명', rule: '규칙 설명', Component: MyGame },
```

문구는 `copy-guard` 테스트가 검사하는 금지어를 피해야 합니다. 결과는 "걸렸다", "차례", "통과", "벌칙"으로 표현합니다.
