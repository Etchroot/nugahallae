# 누가할래

폰 하나를 돌려가며 각자 동물을 고르고, 미니게임으로 당번·벌칙 걸릴 사람을 정하는 앱인토스(Apps in Toss) WebView 미니앱입니다. 로그인 없이 바로 쓰고, 결과는 기다림 없이 바로 보여 줍니다.

## 기능

- 홈에서 미니게임 30종 중 고르기(검색 가능, 최근 한 게임 표시)
- 인원수 2~10명 선택 → 동물 카드가 한꺼번에 나타나고, 한 명씩 자기 동물을 골라 기억하기(고른 순서 = 차례)
- 게임 진행(돌림판, 잔 채우기, 사다리 타기, 라이어 게임 등) — 게임마다 규칙이 화면 위에 한 줄로 나옴
- 결과는 바로 표시하고 `한 판 더` / `다른 게임`
- 효과음(코드로 합성, 파일 없음)과 홈의 소리 켜기/끄기
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

- **토스 앱 번들**: `npm run build` → `nugahallae/build/nugahallae-v<버전>.ait`. 버전은 `nugahallae/ait-version.txt`에 적고(큰 변화는 정수, 작은 패치는 소수점 뒤), 같은 버전이 이미 있으면 빌드를 거부해 덮어쓰지 않습니다.
  토스 디자인 시스템(TDS)을 쓰며, 앱인토스(토스 앱 안)에서 실행됩니다.
  `ait build`를 쓰므로 앱인토스 콘솔의 앱 등록(appName `nugahallae`)이 맞아야 하고, 배포(`npm run deploy`)에는 콘솔 로그인/API 키가 필요합니다.
- **데모 웹 빌드**: `npm run build:pages` → `nugahallae/dist-pages/` (로컬 확인은 `npm run dev:web`).
  TDS는 앱인토스 밖에서 실행되지 않으므로, 이 빌드에서만 `src/web/`의 대체 부품으로 바꿔 끼웁니다(`vite.config.ts`의 `--mode web`). 게임 로직과 화면 흐름은 토스 앱 번들과 같습니다.

## 배너 광고

- 홈·준비·결과 화면 맨 위에 배너 광고 한 줄이 흐름대로 놓입니다(게임 진행 화면에는 두지 않습니다 — 비게임 출시 기준 "스크롤 가능한 화면에만", 광고 정책 "게임 플레이 영역과 인접 배치 금지").
- 광고 그룹 ID는 빌드할 때 `VITE_AD_GROUP_ID`로 넣습니다. 제출용 값은 `nugahallae/.env.production`에 콘솔에서 발급받은 ID를 적고, 비어 있으면 광고를 쓰지 않습니다.
- 토스 앱 5.241.0 미만이거나 웹 데모처럼 지원하지 않는 환경에서는 배너 자리가 생기지 않습니다. 샌드박스 앱은 인앱 광고를 지원하지 않으므로, 콘솔의 QR로 테스트합니다.
- 콘솔 QR 테스트용 빌드(테스트 광고 ID): `AD_TEST=1 npm run build` → `build/nugahallae-v<버전>-adtest.ait`. 제출용으로 쓰지 마세요.

`main` 브랜치에 push하면 `.github/workflows/pages.yml`이 데모 웹 빌드를 GitHub Pages에 배포합니다.

## 데모 주소

https://etchroot.github.io/nugahallae/ (휴대폰 브라우저로 여는 것을 권장합니다)

## 문서

- [설계 문서](docs/superpowers/specs/2026-10-28-nugahallae-design.md)
- [구현 계획](docs/superpowers/plans/2026-10-28-nugahallae-skeleton.md)
- [AI 활용 과정 기록](docs/ai-usage.md) — 작업 방식, 사용한 스킬·도구, AI 실수를 잡아 고친 사례, 프롬프트 변경 기록
- [사용자 테스트·지표 측정 계획](docs/test-plan.md) — 지표 정의, 시나리오, 기록 양식
- 데일리 스크럼: [1일차 (10/28)](docs/daily-scrum/2026-10-28.md)
- 발표자료(웹, 클릭으로 넘김·PDF 포함): [서비스 소개](docs/deck/index.html), [앱인토스 출시 과정](docs/deck-launch/index.html), 대본은 [script.md](docs/deck-launch/script.md)
- 앱인토스 등록용 이미지·문구: [docs/store-assets](docs/store-assets/listing.md)

## 폴더 구조

```
.github/workflows/pages.yml   GitHub Pages 배포
nugahallae/
  src/
    app/        화면 전환 흐름(flow)
    domain/     동물(pieces), 난수(rng), 설정(settings), 기록(history)
    platform/   토스 SDK 래퍼(실패 시 기본값), 효과음(sound.ts)
    screens/    홈 · 준비 · 플레이 · 결과 화면
    components/ 공통 컴포넌트
    games/      미니게임 30종 (registry.ts, types.ts, <id>/)
    web/        데모 웹 빌드 전용 TDS 대체 부품
    __tests__/  앱 테스트, 금지어 가드(copy-guard)
```

## 게임 추가 방법

1. `nugahallae/src/games/<id>/` 폴더를 만들고 게임 컴포넌트를 작성합니다.
2. `nugahallae/src/games/<id>/definition.ts`에서 `GameDefinition`(`games/types.ts`)을 `export default` 하면 목록에 자동으로 나타납니다. 자세한 방법은 [games/README.md](nugahallae/src/games/README.md)를 보세요.

모든 게임(30종)이 이 방식으로 등록돼 있고, 홈 목록 순서는 `definition.ts`의 `order` 값(작은 수가 먼저)으로 정합니다.

문구는 `copy-guard` 테스트가 검사하는 금지어를 피해야 합니다. 결과는 "걸렸다", "차례", "통과", "벌칙"으로 표현합니다.
