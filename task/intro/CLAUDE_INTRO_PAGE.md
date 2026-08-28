# Claude Command — Intro Page Integration

`kids-english-player` 프로젝트에 첨부한 `INTRO_PAGE.html` 디자인을 참고하여 Intro 페이지를 연결한다.

## 목표

서비스에 처음 방문한 부모가 이 웹의 목적과 사용 방법을 짧게 이해할 수 있도록 한다.

## 작업

1. `INTRO_PAGE.html`을 디자인 참고용으로 읽는다.
2. 기존 Next.js UI 스타일과 컴포넌트를 최대한 재사용하여 `/intro` 페이지를 구현한다.
3. Intro의 핵심 내용은 유지한다.
   - 부모가 영어 영상을 관리하는 서비스
   - 아이별 Level과 진행률 관리
   - 영상 순차 재생 및 이어보기
   - 부모가 학습 기록 확인
   - 사용 흐름: 부모 로그인 → 아이 선택 → 영상 시청 → 진행 확인
4. HTML을 그대로 iframe으로 넣지 말고 실제 Next.js 페이지/컴포넌트로 옮긴다.
5. CTA 연결:
   - `로그인` → `/login`
   - `시작하기` → `/signup`
6. 기존 인증 흐름을 확인하여 `/` routing을 정리한다.
   - 비로그인 사용자의 첫 진입은 `/intro`가 자연스럽게 보이도록 한다.
   - 로그인 사용자는 기존 child-select 또는 admin/dashboard 흐름을 유지한다.
   - 이미 로그인한 사용자를 불필요하게 Intro에 강제하지 않는다.
7. 기존 기능과 인증/Household/Child 로직은 수정하지 않는다.
8. 모바일/태블릿/데스크톱 반응형을 유지한다.
9. 구현 후 lint, typecheck, build를 실행하고 실패하면 수정한다.

## 완료 보고

다음만 간단히 보고한다.

```text
1. 변경 route
2. 변경 파일
3. 비로그인 / 로그인 진입 흐름
4. lint
5. typecheck
6. build
```

중간 확인 없이 구현과 검증까지 완료한다.
