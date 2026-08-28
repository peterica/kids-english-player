# Claude Agentic Command — Multi-user + Multi-child + Playlist Upgrade

## 0. Mission

현재 `kids-english-player` MVP를 기반으로 다음 단계까지 한 번에 확장한다.

```text
P1 Single Child MVP
→
P2 Multi-user / Household / Multi-child
→
P3 Playlist / Level Curriculum
```

목표는 새 프로젝트를 다시 만드는 것이 아니라,
**기존 기능을 최대한 유지하면서 여러 부모와 여러 아이가 사용할 수 있는 구조로 안전하게 확장하는 것**이다.

중간 승인 요청 없이 가능한 범위까지 분석 → 설계 → 구현 → migration → 테스트 → build → 문서화까지 진행한다.

---

# 1. 먼저 읽을 것

프로젝트 루트에서 최소 다음을 확인한다.

```text
PRD.md
README.md
docs/ARCHITECTURE.md
docs/IMPLEMENTATION_RESULT.md
```

그리고 존재한다면 다음 Playlist 문서도 모두 읽는다.

```text
LEVEL_1_PLAYLIST.md
LEVEL_2_PLAYLIST.md
LEVEL_3_PLAYLIST.md
LEVEL_4_PLAYLIST.md
```

현재 코드 전체 구조도 분석한다.

특히 다음을 우선 확인한다.

```text
prisma/schema.prisma
src/lib/progress-service.ts
src/lib/video-selection.ts
src/lib/learning.ts
src/lib/session.ts
src/lib/pin.ts
src/app/page.tsx
src/app/watch/
src/app/admin/
src/app/parent/
src/app/api/
```

기존 테스트도 모두 읽는다.

---

# 2. 절대 원칙

## 2.1 기존 MVP를 가능한 한 보존

현재 검증된 다음 기능은 최대한 재사용한다.

```text
YouTube Player
진행률 저장
10초 heartbeat
시청시간 계산
90% 완료 판정
COMPLETED 회귀 금지
다음 영상 선택
WatchSession
오늘 통계
YouTube metadata
```

구조를 바꾸기 위해 불필요하게 전면 재작성하지 않는다.

---

## 2.2 Single Household 구조에서 Multi Household 구조로 확장

기존 구조를 다음 개념으로 확장한다.

```text
User
  ↓
Household
  ↓
Child
  ↓
Progress / WatchSession
```

서비스의 핵심 보안 경계는 `Household`이다.

---

## 2.3 가장 중요한 보안 규칙

다른 Household의 Child / Progress / WatchSession / PlaylistProgress를 절대 조회하거나 수정할 수 없어야 한다.

금지:

```ts
findChild(childId)
```

권장:

```ts
findChild({
  childId,
  householdId: session.householdId
})
```

또는 동등한 server-side authorization을 모든 조회/수정 경로에 강제한다.

URL의 `childId`를 신뢰하지 않는다.

---

# 3. 목표 사용자 흐름

## Parent Signup

```text
회원가입
↓
email
password
displayName
↓
Household 자동 생성
↓
첫 아이 등록
↓
Parent Dashboard
```

---

## Parent Login

```text
로그인
↓
email
password
↓
session
↓
/admin
```

---

## Child Select

로그인한 Household 안의 아이 목록을 보여준다.

```text
누가 영어를 볼까요?

[ 민준 ]
[ 서준 ]
```

아이 계정 자체의 로그인은 만들지 않는다.

---

## Child Home

예:

```text
/kids/[childId]
```

또는 더 나은 route 구조가 있다면 선택 가능.

표시:

```text
아이 이름
현재 Level
오늘 학습 시간
오늘 본 영상
현재 영상
이어보기
최근 기록
```

---

## Parent Dashboard

```text
/admin
```

예:

```text
우리 가족

민준
Level 3
32 / 48
오늘 24분

서준
Level 1
8 / 48
오늘 12분
```

아이를 클릭하면 해당 아이 상세 진도 화면으로 이동한다.

---

# 4. 데이터 모델

현재 Prisma schema를 분석한 후 아래 개념을 구현한다.

필드 이름은 기존 naming convention에 맞게 조정 가능하다.

---

## User

```text
id
email
passwordHash
displayName
createdAt
updatedAt
```

조건:

- email unique
- password 평문 저장 금지
- 현재 scrypt 구현 재사용 가능하면 우선 재사용
- 비밀번호 검증은 server-side

---

## Household

```text
id
name
createdAt
updatedAt
```

---

## HouseholdMember

향후 부모 공동 관리 확장을 위해 처음부터 별도 모델 권장.

```text
id
householdId
userId
role
createdAt
```

role:

```text
OWNER
PARENT
```

현재 MVP에서는 회원가입한 사용자를 OWNER로 생성한다.

---

## Child

```text
id
householdId
name
avatarKey nullable
enabled
createdAt
updatedAt
```

MVP에서 다음 개인정보는 받지 않는다.

```text
학교
성별
주소
생년월일
```

필요하다면 추후 추가한다.

---

# 5. 기존 데이터 모델 변경

## VideoProgress

현재:

```text
VideoProgress
→ Video
```

변경:

```text
VideoProgress
→ Child
→ Video
```

unique constraint는 최소 다음 의미를 가져야 한다.

```text
childId + videoId
```

---

## WatchSession

추가:

```text
childId
```

모든 통계는 child 기준으로 분리한다.

---

# 6. Playlist 모델

Level 1~4 문서를 실제 시스템 커리큘럼으로 만든다.

---

## Playlist

```text
id
slug
title
level
description
enabled
createdAt
updatedAt
```

예:

```text
level-1
Level 1
1
```

---

## PlaylistVideo

```text
id
playlistId
videoId
sequence
```

unique:

```text
playlistId + videoId
```

---

## ChildPlaylist

아이별 현재 커리큘럼 상태.

```text
id
childId
playlistId
status
startedAt
completedAt
createdAt
updatedAt
```

status:

```text
NOT_STARTED
IN_PROGRESS
COMPLETED
```

한 아이가 여러 Level 기록을 가질 수 있다.

---

# 7. Playlist Seed

프로젝트에 다음 파일이 있다면 반드시 참고한다.

```text
LEVEL_1_PLAYLIST.md
LEVEL_2_PLAYLIST.md
LEVEL_3_PLAYLIST.md
LEVEL_4_PLAYLIST.md
```

이 문서의:

```text
Title
URL
Channel
Category
Difficulty
Sequence
```

를 기반으로 DB seed를 만든다.

중요:

- 영상 중복은 `youtubeVideoId` 기준으로 재사용
- Playlist별 sequence는 문서 기준 유지
- Level 1~4를 Playlist로 생성
- 영상 URL이 seed 단계에서 외부 조회 실패하더라도 seed 전체가 실패하지 않도록 처리
- 문서의 title을 fallback으로 사용 가능

문서를 런타임마다 파싱하는 구조는 만들지 않아도 된다.

seed 코드에 명확한 구조로 반영하면 된다.

---

# 8. Child별 현재 영상 선택

기존 `video-selection.ts` 로직을 확장한다.

기존:

```text
IN_PROGRESS
→ NOT_STARTED
→ 완료
```

이 원칙은 유지한다.

단, 검색 범위는 다음으로 제한한다.

```text
현재 Child
+
현재 ChildPlaylist
+
해당 Playlist의 활성 Video
```

즉:

```text
Child
→ current active Playlist
→ PlaylistVideo sequence
→ Child VideoProgress
```

---

# 9. Level 진행

초기 MVP에서는 자동 Level 승급을 과도하게 구현하지 않는다.

기본:

```text
부모가 아이에게 Level 선택
```

Parent UI:

```text
현재 학습 과정

Level 1
Level 2
Level 3
Level 4
```

부모가 선택하면:

```text
ChildPlaylist.status = IN_PROGRESS
```

기존 진행 기록은 삭제하지 않는다.

---

# 10. Login / Session

현재 Parent PIN 인증은 부모 계정 로그인으로 대체한다.

기본 UI:

```text
/login
/signup
/logout
```

회원가입:

```text
email
password
displayName
```

로그인:

```text
email
password
```

조건:

- password hash
- httpOnly cookie
- secure는 production
- sameSite 설정
- session expiry
- session tampering 방지
- client가 householdId를 결정하지 못하게 함

기존 signed cookie/session 코드 재사용 가능하면 재사용한다.

---

# 11. 기존 PIN 기능

기존 `/parent` PIN 방식은 제거 또는 deprecated 처리한다.

단, 바로 삭제해 기존 코드가 깨질 가능성이 있다면 migration 기간 동안 redirect 가능.

예:

```text
/parent
→ /login
```

기존 `PARENT_PIN` 환경변수 의존은 제거한다.

---

# 12. Signup 후 초기화

회원가입 시 transaction을 이용해 최소 다음을 함께 생성한다.

```text
User
Household
HouseholdMember(OWNER)
```

Household 기본 이름 예:

```text
{displayName}'s Family
```

UI에서는 수정 가능하게 해도 좋다.

---

# 13. Child Management

Parent Dashboard에서 다음을 구현한다.

```text
아이 추가
아이 이름 수정
아이 활성/비활성
아이 선택
현재 Level 선택
```

실수로 기록을 잃지 않도록 Child hard delete는 MVP에서 피한다.

가능하면:

```text
enabled = false
```

형태로 비활성화한다.

---

# 14. Parent UI

최소 route:

```text
/admin
/admin/children
/admin/children/[childId]
/admin/videos
/admin/playlists
```

기존 `/admin/videos` 기능은 유지한다.

---

## /admin

Household 전체 요약:

```text
아이 수
오늘 전체 학습 시간
아이별 현재 Level
아이별 완료율
```

---

## /admin/children/[childId]

표시:

```text
아이 이름
현재 Playlist / Level
전체 진도
오늘 학습
최근 시청 기록
완료한 영상
현재 영상
```

---

## /admin/playlists

초기에는 read-only 중심으로 충분하다.

표시:

```text
Level 1
12 videos

Level 2
12 videos

Level 3
12 videos

Level 4
12 videos
```

Playlist 영상 목록과 sequence 확인 가능.

---

# 15. Child UI

기존 `/` 화면은 Child 선택 화면 또는 parent 상태에 따라 redirect하도록 변경한다.

권장 흐름:

```text
/
↓
로그인 안 됨
→ /login

로그인 됨 + child 없음
→ /admin/children

로그인 됨 + child 있음
→ child select
```

Child 선택 후:

```text
/kids/[childId]
```

Player:

```text
/kids/[childId]/watch/[videoId]
```

route 구조는 더 단순한 방식이 있으면 조정 가능.

중요한 것은 child context가 항상 server-side 검증되는 것이다.

---

# 16. Authorization 필수

모든 다음 경로에서 authorization 검증한다.

```text
Child 조회
Child 수정
VideoProgress
WatchSession
오늘 통계
Playlist 변경
Player 접근
Progress 저장 API
Session 저장 API
```

예를 들어 Progress API payload에:

```text
childId
videoId
```

가 오더라도 서버는:

```text
session.user
→ HouseholdMember
→ Household
→ Child ownership
```

을 검증한다.

---

# 17. 데이터 Migration

현재 Single Child DB가 이미 존재할 수 있다.

기존 데이터를 무조건 삭제하지 않는다.

Migration 전략을 만든다.

가능한 방식:

```text
Legacy User 생성
Legacy Household 생성
Legacy Child 생성

기존 VideoProgress
→ Legacy Child 연결

기존 WatchSession
→ Legacy Child 연결
```

개발 DB / production-like local DB 모두 고려한다.

기존 데이터가 없으면 정상적으로 migration만 진행.

---

# 18. SQLite 유지

현재 단계에서는 PostgreSQL로 변경하지 않는다.

```text
Next.js
Prisma
SQLite
```

유지.

이유:

- 현재 사용량 작음
- Mac mini 기반
- migration 범위를 줄임

다만 문서에 향후 PostgreSQL migration point를 기록한다.

---

# 19. 테스트

기존 34개 테스트를 모두 유지한다.

깨졌다면 새 구조에 맞게 수정하되 기존 보장사항은 유지한다.

추가 테스트 필수.

---

## Auth

```text
signup
duplicate email
login success
wrong password
session tampering
expired session
logout
```

---

## Household Isolation

가장 중요.

Household A:

```text
Parent A
Child A
```

Household B:

```text
Parent B
Child B
```

필수 테스트:

```text
Parent A → Child A 접근 PASS
Parent A → Child B 접근 DENY

Parent A → Child B progress 조회 DENY
Parent A → Child B progress 수정 DENY

Parent A → Child B session 조회 DENY
```

가능하면 integration test로 작성한다.

---

## Multi Child Progress

```text
Child A + Video 1 = COMPLETED
Child B + Video 1 = NOT_STARTED
```

동일 영상의 상태가 독립적인지 검증한다.

---

## Playlist

```text
Level 1 sequence
Level 2 sequence
disabled video 제외
Child별 Playlist 분리
현재 Playlist에서만 next video 선택
```

---

## Migration

가능하면 test DB를 이용해:

```text
기존 progress
→ Legacy Child 연결
```

이 안전하게 되는지 검증한다.

---

# 20. 보안

최소 기준:

```text
password 평문 금지
httpOnly cookie
session signature
server-side authorization
email normalization
input validation
CSRF 위험 검토
open redirect 금지
Household isolation
```

특히 IDOR 취약점이 발생하지 않도록 주의한다.

```text
/admin/children/123
/kids/123
/api/progress?childId=123
```

등의 ID를 변경해서 다른 가정 데이터에 접근할 수 없어야 한다.

---

# 21. UI 방향

현재 Mockup 스타일을 최대한 유지한다.

새로운 디자인 시스템을 만들지 않는다.

추가 화면:

```text
Login
Signup
Child Select
Child Management
Playlist Overview
```

Child 화면:

- 큰 버튼
- 최소 메뉴

Parent 화면:

- 정보 밀도 조금 높여도 됨

---

# 22. 개발 Phase

중간 승인 없이 순차 진행한다.

```text
Phase 1
현재 코드 / DB 분석

Phase 2
Architecture v2 작성

Phase 3
Prisma schema 확장

Phase 4
Data migration

Phase 5
User / Household Auth

Phase 6
Child management

Phase 7
Progress / Session child-scoping

Phase 8
Playlist / Level 모델

Phase 9
Level 1~4 seed

Phase 10
Child Home / Player route 변경

Phase 11
Parent Dashboard 변경

Phase 12
Authorization test

Phase 13
전체 regression test

Phase 14
lint / typecheck / build

Phase 15
Docker 실행 검증

Phase 16
결과 문서
```

---

# 23. Architecture 문서

업데이트:

```text
docs/ARCHITECTURE.md
```

또는 기존 문서를 보존하고:

```text
docs/ARCHITECTURE_V2.md
```

생성.

반드시 포함:

```text
User
Household
HouseholdMember
Child
Playlist
PlaylistVideo
ChildPlaylist
VideoProgress
WatchSession
```

관계도.

---

# 24. Result 문서

생성:

```text
docs/MULTIUSER_IMPLEMENTATION_RESULT.md
```

형식:

```markdown
# Multi-user Implementation Result

## Status
COMPLETE / PARTIAL

## Implemented

## Migration

## Auth

## Household Isolation

## Child Management

## Playlist

## Seed

## Changed Files

## Tests

## Lint

## Typecheck

## Build

## Docker

## Manual Verification

## Known Limitations

## Next Recommended Step
```

---

# 25. README 수정

README에 다음 추가:

```text
회원가입
로그인
아이 등록
Level 선택
아이 화면 진입
부모 Dashboard
DB migration
기존 Single Child 데이터 migration
Docker 실행
백업
```

---

# 26. 하지 말 것

```text
새 프로젝트 생성 후 기존 코드 폐기
Player 전면 재작성
SQLite → PostgreSQL 즉시 변경
소셜 로그인 추가
Google OAuth 추가
아이 로그인 계정 생성
아이 이메일 수집
학교/주소/성별 등 불필요한 개인정보 수집
부모 초대 기능 구현
결제 기능 구현
클라우드 배포
```

이들은 이후 Phase다.

---

# 27. 완료 조건

다음이 모두 만족되면 COMPLETE.

```text
[ ] 회원가입 가능
[ ] 로그인 가능
[ ] 로그아웃 가능
[ ] Household 자동 생성
[ ] 아이 2명 이상 등록 가능
[ ] 아이별 진행률 독립
[ ] 아이별 WatchSession 독립
[ ] Household 간 데이터 완전 격리
[ ] Level 1~4 Playlist 생성
[ ] 아이별 Level 선택 가능
[ ] Playlist sequence 기반 next video 선택
[ ] 기존 Player 정상 동작
[ ] 기존 완료 판정 정상 동작
[ ] 기존 시청시간 계산 정상 동작
[ ] 기존 Single Child 데이터 migration 전략 존재
[ ] 기존 테스트 regression PASS
[ ] 새 auth test PASS
[ ] 새 household isolation test PASS
[ ] lint PASS
[ ] typecheck PASS
[ ] production build PASS
[ ] Docker 실행 PASS
[ ] README 업데이트
[ ] MULTIUSER_IMPLEMENTATION_RESULT 작성
```

---

# 28. 브라우저 검증

가능하면 실제 브라우저 또는 browser automation 환경이 있으면 다음까지 검증한다.

```text
Signup
→ Login
→ Child 1 추가
→ Child 2 추가
→ Child 1 Level 1 선택
→ Child 2 Level 2 선택
→ Child 1 영상 재생
→ Progress 저장
→ Child 2에 Progress가 반영되지 않음
→ Parent Dashboard 확인
```

브라우저 환경이 없으면:

```text
NOT VERIFIED
```

로 명확히 기록하고 server-side / integration test로 최대한 대체한다.

---

# 29. 최종 응답

터미널 최종 응답은 다음 형식으로 간결하게 작성한다.

```text
1. Status:
2. Auth:
3. Household:
4. Child:
5. Playlist:
6. Migration:
7. Existing regression tests:
8. New tests:
9. Household isolation test:
10. lint/typecheck:
11. build:
12. Docker:
13. Browser E2E:
14. Known limitations:
15. Result document:
```

---

# 30. Start

이제 바로 실행한다.

```text
1. 현재 repository 전체 분석
2. 기존 architecture / implementation result 확인
3. Level 1~4 playlist 문서 확인
4. Architecture v2 결정
5. Prisma migration
6. Auth / Household / Child 구현
7. 기존 Progress / Session child scope 적용
8. Playlist 구현 및 Level 1~4 seed
9. UI 연결
10. authorization 강화
11. regression + 신규 test
12. lint / typecheck / build
13. Docker 검증
14. 문서 업데이트
15. 결과 보고
```

**사소한 구현 결정으로 작업을 멈추거나 사용자 확인을 요청하지 말고, 기존 MVP를 보존하면서 끝까지 완료하라.**
