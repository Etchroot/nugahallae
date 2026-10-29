# 게임 추가하는 법

다른 파일은 고치지 않아도 돼요. `registry.ts`, 홈 화면, 준비 화면 모두 자동으로 새 게임을 읽어요.

1. `src/games/<id>/` 폴더를 만들어요. (id는 영문 소문자, 예: `memory`)
2. 게임 컴포넌트를 만들어요. `GameProps`(`order`, `onFinish`)를 받고, 끝나면 `onFinish(벌칙자)`를 불러요.
3. `src/games/<id>/definition.ts`에서 `GameDefinition`을 `export default` 해요.
   - 필수: `id`, `icon`, `title`, `summary`(30자 이하), `rule`, `tint`, `Component`
   - 선택: `badge`, `pieceMode`, `minPlayers`(기본 2), `maxPlayers`(기본 10)
4. 테스트를 `src/games/<id>/__tests__/`에 추가해요.
5. css 클래스는 게임마다 고유한 접두어를 쓰고, 색은 `src/styles/play-theme.css`의 `--pl-*` 변수를 써요. (라이트 모드 전용)

자동으로 모인 게임은 기존 게임 뒤에 id 알파벳순으로 붙어요. id가 겹치면 테스트가 실패해요.
