# Claude Agentic Implementation Command — Kids English Player

## 0. 역할

당신은 `kids-english-player` 프로젝트의 **주 개발 에이전트**다.

이 작업의 목표는 계획 문서만 만드는 것이 아니라, 현재 폴더의 PRD와 Mockup을 기준으로 **실행 가능한 MVP를 최대한 한 번에 구현하고 검증까지 완료하는 것**이다.

사용자에게 중간 확인을 반복해서 요청하지 말고, 합리적인 범위 안에서는 스스로 판단하여 진행한다.

---

# 1. 작업 위치

현재 작업 디렉터리는 다음 프로젝트 루트라고 가정한다.

```text
kids-english-player/
```

먼저 프로젝트 루트의 파일 구조를 확인한다.

최소한 다음 두 파일을 찾아서 반드시 읽는다.

```text
PRD.md
kids-english-player-mockup.html
```

파일명이 약간 다르다면 같은 목적의 PRD와 HTML Mockup 파일을 찾아 사용한다.

---

# 2. 최종 목표

다음 사용자 흐름이 실제로 동작하는 로컬 웹 애플리케이션을 완성한다.

```text
부모가 YouTube 영상 등록
        ↓
영상 순서 지정
        ↓
아이가 Home 접속
        ↓
현재 학습 영상 표시
        ↓
영상 재생
        ↓
시청 진행률 자동 저장
        ↓
완료 기준 충족
        ↓
COMPLETED 처리
        ↓
다음 영상 자동 선택
        ↓
학습 기록 저장
        ↓
부모 Dashboard에서 확인
```

단순 Mockup이 아니라 실제 데이터 저장과 동작이 가능한 MVP여야 한다.

---

# 3. 핵심 개발 원칙

아래 원칙을 반드시 지킨다.

## 3.1 구현 우선

문서만 작성하고 종료하지 않는다.

다음 순서로 실제 코드를 완성한다.

```text
분석
→ 최소 설계
→ 구현
→ 테스트
→ 실행 검증
→ 수정
→ 결과 문서화
```

---

## 3.2 질문보다 자율 판단

사소한 선택에 대해 사용자에게 확인하지 않는다.

예:

- 디렉터리 구조
- 함수명
- 컴포넌트명
- UI 세부 간격
- 내부 API 구조
- SQLite ORM 선택
- 테스트 도구 선택

합리적인 기본값을 스스로 선택하고 진행한다.

다만 아래와 같은 경우에는 임의로 파괴적인 행동을 하지 않는다.

- 기존 사용자 데이터 삭제
- 대규모 unrelated 파일 삭제
- 외부 서비스에 실제 결제 발생
- 실제 production 배포
- 비밀키 생성 후 외부 노출

---

## 3.3 범위 확대 금지

PRD에 없는 큰 기능을 추가하지 않는다.

특히 다음은 구현하지 않는다.

- AI 영어 평가
- 음성 인식
- 발음 평가
- 자체 영상 다운로드
- YouTube 영상 저장
- 사용자 다중 계정
- Google Login
- 클라우드 배포
- Recommendation AI
- 모바일 Native App
- 복잡한 학습 알고리즘

MVP 핵심 흐름 완성이 최우선이다.

---

# 4. 권장 기술 방향

PRD에 별도 충돌이 없다면 다음 구성을 우선 검토한다.

```text
Next.js
TypeScript
SQLite
Prisma
YouTube IFrame Player API
```

가능하면 Frontend와 Backend를 하나의 프로젝트로 유지한다.

다만 현재 프로젝트 상태를 확인한 뒤 더 단순하고 안정적인 구성이 이미 존재한다면 기존 구조를 존중한다.

기술 스택 변경 자체를 목표로 하지 않는다.

---

# 5. 구현 요구사항

다음 기능을 MVP에서 실제 동작하게 만든다.

---

## 5.1 Child Home

기본 경로:

```text
/
```

표시:

- 오늘 날짜
- 오늘 시청한 영상 수
- 오늘 누적 시청 시간
- 전체 완료 수 / 전체 활성 영상 수
- 현재 학습할 영상
- IN_PROGRESS 영상이 있으면 이어보기
- 없으면 첫 NOT_STARTED 영상 표시
- 모든 영상이 완료되었다면 완료 상태 표시

Mockup의 전체적인 UX를 참고하되 픽셀 단위 복제는 필요 없다.

7세 아이가 사용할 수 있도록:

- 큰 제목
- 큰 버튼
- 선택지 최소화
- 관리 메뉴 노출 최소화
- 주요 행동 하나를 강조

---

## 5.2 Player

경로 예:

```text
/watch/[videoId]
```

YouTube IFrame Player API를 이용한다.

최소한 다음을 처리한다.

```text
PLAYING
PAUSED
BUFFERING
ENDED
현재 위치
영상 길이
```

요구사항:

- 웹페이지 내부에서 YouTube 재생
- 현재 진행률 표시
- 마지막 재생 위치 저장
- 일정 주기로 진행 상태 저장
- 새로고침 후 이어보기 가능
- 처음부터 보기 가능
- 영상 완료 상태 표시
- 다음 영상으로 이동 가능

---

## 5.3 시청시간 기록

seek만으로 학습 시간이 부풀려지지 않도록 한다.

잘못된 예:

```text
1분 위치
→ seek
→ 9분 위치

watch_seconds += 8분
```

이 방식은 금지한다.

가능한 구현:

```text
Player 상태가 PLAYING인 동안
실제 경과 시간을 누적
```

브라우저 이벤트와 서버 저장 오차를 감안하여 완벽한 초 단위 정확성보다 일관성을 우선한다.

---

## 5.4 진행 상태

다음 상태를 사용한다.

```text
NOT_STARTED
IN_PROGRESS
COMPLETED
```

기본 전환:

```text
NOT_STARTED
→ IN_PROGRESS
→ COMPLETED
```

COMPLETED 상태는 일반 재생으로 자동 해제하지 않는다.

---

## 5.5 완료 기준

기본값:

```text
90%
```

다음 둘 중 하나면 완료 처리한다.

```text
progress >= completionThreshold
OR
YouTube ENDED event
```

완료 기준은 하드코딩된 magic number가 아니라 Settings 또는 명확한 설정 상수로 관리한다.

---

## 5.6 다음 영상 선택

우선순위:

```text
1. IN_PROGRESS
2. NOT_STARTED
3. 모든 영상 완료
```

동일 상태에서는 sequence가 가장 빠른 영상을 선택한다.

비활성 영상은 제외한다.

---

## 5.7 Parent Dashboard

경로:

```text
/admin
```

최소 표시:

- 전체 활성 영상 수
- 완료 영상 수
- 전체 진행률
- 현재 학습 영상
- 오늘 시청 시간
- 오늘 시청 영상 수
- 최근 학습 기록

복잡한 Chart 라이브러리는 필요 없다.

---

## 5.8 Parent PIN

`/admin` 접근 시 간단한 PIN 보호를 제공한다.

조건:

- 평문 저장 금지
- 너무 복잡한 인증 시스템 금지
- Local Home 환경에 적합한 단순 보호

개발 초기값이 필요하면 `.env.example`에 예시를 제공한다.

실제 비밀값을 repository에 하드코딩하지 않는다.

---

## 5.9 Video Management

경로:

```text
/admin/videos
```

기능:

- YouTube URL 등록
- title
- thumbnail
- sequence
- enabled
- 삭제 또는 비활성화
- 상태 확인
- 순서 변경

MVP에서는 Drag & Drop이 필수는 아니다.

다음 정도면 충분하다.

```text
위로
아래로
```

---

## 5.10 YouTube metadata

영상 URL 등록 시 가능한 범위에서 다음을 자동 추출한다.

```text
videoId
title
thumbnail
```

YouTube Data API Key가 없어도 MVP가 동작해야 한다.

따라서 다음 전략을 우선 검토한다.

```text
URL → videoId 추출
thumbnail → 정형 URL 사용
title → oEmbed 또는 입력 fallback
```

외부 API가 실패하면 부모가 제목을 직접 수정할 수 있도록 한다.

---

# 6. 데이터 모델

PRD를 우선한다.

최소 다음 개념이 필요하다.

## Video

```text
id
youtubeVideoId
youtubeUrl
title
thumbnailUrl
durationSeconds
sequence
enabled
createdAt
updatedAt
```

## VideoProgress

```text
id
videoId
status
lastPositionSeconds
durationSeconds
progressPercent
watchSeconds
startedAt
lastWatchedAt
completedAt
createdAt
updatedAt
```

## WatchSession

```text
id
videoId
startedAt
endedAt
startPositionSeconds
endPositionSeconds
watchSeconds
createdAt
```

## Settings

```text
key
value
```

필요하면 실제 ORM 특성에 맞게 field 이름이나 관계를 조정해도 된다.

하지만 의미는 유지한다.

---

# 7. SQLite 운영

SQLite를 시스템의 Local SSOT로 사용한다.

조건:

- 개발 환경에서 바로 생성 가능
- migration 제공
- seed 가능
- DB 파일 위치가 명확
- Git에 실데이터 DB를 무조건 commit하지 않음
- `.gitignore` 적절히 설정
- 백업 방법 문서화

---

# 8. Seed Data

실행 직후 UI와 흐름을 확인할 수 있도록 개발용 seed를 제공한다.

예:

```text
Alphablocks Episode 01
Alphablocks Episode 02
Alphablocks Episode 03
...
```

단, 존재하지 않는 실제 YouTube ID를 production 데이터처럼 가장하지 않는다.

테스트용 placeholder 또는 개발용 sample임을 분명히 한다.

가능하면 사용자가 직접 URL을 추가하지 않아도 화면 구조를 확인할 수 있도록 최소 sample 데이터를 제공한다.

---

# 9. Mockup 반영

`kids-english-player-mockup.html`의 화면 구조와 UX를 참고한다.

최소 화면:

```text
Child Home
Player
Parent Dashboard
Video Management
```

중요:

Mockup은 요구사항 이해를 위한 기준이다.

다음을 피한다.

- Mockup HTML을 그대로 iframe으로 삽입
- 정적 화면만 복사
- 버튼이 실제로 동작하지 않는 fake UI
- 데이터가 hardcoded되어 실제 DB와 연결되지 않는 구현

모든 핵심 UI는 실제 데이터와 연결한다.

---

# 10. 반응형

같은 Wi-Fi의 다음 기기에서 사용할 수 있어야 한다.

- Mac
- 태블릿
- 스마트폰

최소 기준:

```text
Desktop
Tablet
Mobile
```

아이용 Player는 태블릿 사용성을 우선한다.

---

# 11. LAN 실행

Mac mini가 서버가 된다.

개발 및 실행 시 localhost뿐 아니라 LAN 접근을 고려한다.
접속은 비번없이 ssh 접속 가능 
- ssh peterseo@<mac-mini-host>
docker로 기동하도록 한다.
mini의 작업폴더: /Users/peterseo/workspace/kids-english-player
외부적속을 위한 Portforwar 설정을 해둔 상태이다.
- <mac-mini-host>:3200
README에 LAN 접근 방법을 설명한다.

---

# 12. 구현 방식

작업을 다음 Phase로 나누되, 사용자 승인 없이 가능한 데까지 계속 진행한다.

---

## Phase 1 — Repository 분석

확인:

- 현재 파일 구조
- package manager
- 기존 framework
- PRD
- Mockup
- 기존 코드 존재 여부

필요한 경우 새 프로젝트 초기화.

---

## Phase 2 — Architecture

간단한 구조 결정.

문서 생성:

```text
docs/ARCHITECTURE.md
```

포함:

- 기술 스택
- 구조
- 데이터 흐름
- 주요 페이지
- API/Server Action 구조
- YouTube Player 연동
- DB 구조
- LAN 실행

이 문서를 작성한 후 **멈추지 말고 구현을 계속한다.**

---

## Phase 3 — Database

구현:

- SQLite
- Prisma 또는 선택한 DB Layer
- Schema
- Migration
- Seed
- Settings

실행 검증.

---

## Phase 4 — Backend / Data Layer

구현:

- Video CRUD
- Progress 저장
- WatchSession 저장
- 오늘 학습 통계
- 현재 영상 조회
- 다음 영상 조회
- 완료 판정

---

## Phase 5 — Parent 기능

구현:

```text
/admin
/admin/videos
```

- PIN
- Dashboard
- 영상 추가
- 영상 수정
- 영상 순서
- 활성/비활성
- 삭제 또는 안전한 제거

---

## Phase 6 — Child 기능

구현:

```text
/
/watch/[videoId]
```

- 현재 영상
- 이어보기
- Player
- 진행률 저장
- 완료 처리
- 다음 영상

---

## Phase 7 — UI 정리

Mockup을 참고하여:

- Typography
- spacing
- cards
- buttons
- progress
- responsive

을 정리한다.

UI polish 때문에 기능을 희생하지 않는다.

---

## Phase 8 — Test & Validation

실제로 다음을 수행한다.

가능한 범위에서:

```text
lint
typecheck
unit test
integration test
build
migration
seed
local run
```

모두 실행한다.

실패하면 가능한 범위에서 수정하고 다시 실행한다.

---

# 13. 테스트 필수 항목

최소 다음 로직은 자동 테스트 또는 명확한 검증 코드가 있어야 한다.

## Video ID parsing

다음 형태를 고려한다.

```text
youtube.com/watch?v=
youtu.be/
youtube.com/shorts/
youtube.com/embed/
```

---

## Next Video selection

검증:

```text
IN_PROGRESS 우선
NOT_STARTED 차선
sequence 적용
disabled 제외
모두 완료 처리
```

---

## Completion

검증:

```text
89% → IN_PROGRESS
90% → COMPLETED
ENDED → COMPLETED
COMPLETED → 자동 회귀 금지
```

---

## Watch time

seek가 watchSeconds에 그대로 더해지지 않는지 검증한다.

---

# 14. 오류 처리

최소 다음을 사용자에게 이해 가능한 형태로 보여준다.

- 잘못된 YouTube URL
- 중복 등록
- metadata 조회 실패
- 영상 없음
- 비활성 영상
- DB 오류
- Player load 실패

서버 stack trace를 아이 화면에 그대로 노출하지 않는다.

---

# 15. 코드 품질

다음을 따른다.

- TypeScript strict 가능하면 활성화
- 불필요한 `any` 최소화
- 핵심 로직은 UI에서 분리
- 함수 이름으로 의도 표현
- giant component 피하기
- magic number 최소화
- API 입력 검증
- dead code 제거
- console debug 로그 정리

과도한 Clean Architecture나 패턴 도입은 하지 않는다.

---

# 16. 보안 최소 기준

Local MVP지만 다음은 지킨다.

- PIN 평문 저장 금지
- `.env` commit 금지
- `.env.example` 제공
- 서버 입력 validation
- SQL injection 위험 없는 DB layer
- 민감 정보 client bundle 노출 금지

---

# 17. 문서

최종적으로 최소 다음 파일이 있어야 한다.

```text
README.md
docs/ARCHITECTURE.md
docs/IMPLEMENTATION_RESULT.md
```

README 포함 내용:

```text
프로젝트 소개
요구 환경
설치
환경 변수
DB 초기화
Seed
개발 실행
Production build
Mac mini 실행
LAN 접속
데이터 백업
주요 URL
```

---

# 18. 결과 문서

작업 완료 후 반드시 작성:

```text
docs/IMPLEMENTATION_RESULT.md
```

형식:

```markdown
# Implementation Result

## Status
COMPLETE / PARTIAL

## Implemented
- ...

## Architecture
- ...

## Changed Files
- ...

## Database
- ...

## Validation
- npm test ...
- npm run lint ...
- npm run build ...

## Manual Verification
- ...

## Known Limitations
- ...

## Next Recommended Step
- ...
```

---

# 19. 최종 응답 형식

모든 작업을 수행한 뒤 터미널 응답은 길게 설명하지 않는다.

다음 형식으로 요약한다.

```text
1. Status: COMPLETE / PARTIAL
2. 구현한 핵심 기능:
3. 주요 변경 파일:
4. DB migration/seed 결과:
5. test 결과:
6. lint/typecheck 결과:
7. build 결과:
8. 실행 방법:
9. 남은 limitation:
10. 결과 문서: docs/IMPLEMENTATION_RESULT.md
```

---

# 20. 실패 시 행동

일부 테스트나 기능에서 문제가 발생해도 즉시 전체 작업을 중단하지 않는다.

다음 원칙을 따른다.

```text
문제 발견
→ 원인 분석
→ 수정 시도
→ 재검증
→ 다른 독립 작업 계속
```

한 부분이 막혀도 가능한 나머지 MVP를 최대한 완성한다.

---

# 21. 금지 사항

다음을 하지 않는다.

```text
PRD를 다시 써달라고 사용자에게 요청
구현 전 사소한 기술 선택 확인 요청
Architecture 문서만 작성하고 종료
Implementation Plan만 작성하고 종료
Mockup만 다시 디자인하고 종료
실행하지 않은 테스트를 PASS라고 기록
실행하지 않은 build를 성공했다고 기록
존재하지 않는 기능을 구현했다고 주장
```

검증하지 못한 항목은 반드시 다음처럼 적는다.

```text
NOT VERIFIED
```

---

# 22. 완료 조건

다음 조건을 충족하면 MVP COMPLETE로 판단한다.

```text
[ ] 프로젝트가 설치된다.
[ ] DB migration이 실행된다.
[ ] Seed가 실행된다.
[ ] Child Home이 실제 DB 데이터를 보여준다.
[ ] Parent Dashboard가 실제 DB 데이터를 보여준다.
[ ] YouTube URL 등록이 된다.
[ ] 영상 순서를 관리할 수 있다.
[ ] Player가 실제 YouTube 영상을 재생한다.
[ ] progress가 저장된다.
[ ] 이어보기가 된다.
[ ] 완료 판정이 된다.
[ ] 다음 영상이 선택된다.
[ ] 오늘 학습 기록을 확인할 수 있다.
[ ] lint 또는 typecheck가 통과한다.
[ ] test가 통과한다.
[ ] production build가 통과한다.
[ ] README가 실행 방법을 설명한다.
[ ] IMPLEMENTATION_RESULT가 존재한다.
```

---

# 23. 시작 명령

이제 다음 순서로 바로 작업을 시작한다.

```text
1. 현재 repository 구조 확인
2. PRD.md 읽기
3. kids-english-player-mockup.html 읽기
4. 필요한 기술적 결정
5. docs/ARCHITECTURE.md 작성
6. 즉시 구현 시작
7. DB / Backend / Parent / Child / Player 순으로 완성
8. test / lint / typecheck / build 실행
9. 실패 수정 및 재검증
10. docs/IMPLEMENTATION_RESULT.md 작성
11. 최종 결과 요약
```

**중간 승인 없이 가능한 범위까지 끝까지 진행하라.**
