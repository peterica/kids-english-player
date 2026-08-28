# Claude Agentic Command — Kids English Player V2 Fresh Rebuild

## 0. Mission

현재 Git repository의 과거 구현은 모두 `concept-v1` tag와 `main` branch에 보존되어 있다.

현재 작업 브랜치는 V2를 새로 구축하기 위한 fresh workspace다.

이 작업의 목표는 **과거 v1 코드를 분석하거나 재사용하지 않고**, 현재 root에 있는 아래 3개 파일만 SSOT로 사용하여 Kids English Player V2를 처음부터 구현하는 것이다.

```text
KIDS_ENGLISH_PLAYER_V2_CONCEPT.md
KIDS_ENGLISH_PLAYER_V2_MOCKUP.html
CLAUDE_V2_USER_EXPERIENCE.md
```

이 3개 파일 외의 과거 구현, tag, branch, commit은 참조하지 않는다.

---

# 1. 절대 금지 사항

이번 작업에서 다음을 하지 않는다.

```text
concept-v1 checkout
main branch checkout
과거 commit 열람
git show로 v1 코드 분석
git diff로 v1 구현 비교
과거 source code 복원
과거 Prisma schema 복원
과거 테스트 복원
과거 README / docs 복원
v1 구조에 맞춰 V2를 설계
```

또한 다음도 금지한다.

```text
기존 프로젝트를 억지로 재사용하려고 시도
과거 구조를 추측해서 재현
중간 승인 요청
Architecture 문서만 작성하고 종료
Plan만 작성하고 종료
Mockup만 정적 복사하고 종료
```

현재 V2는 새로운 제품으로 설계한다.

---

# 2. SSOT

반드시 다음 순서로 읽는다.

```text
1. KIDS_ENGLISH_PLAYER_V2_CONCEPT.md
2. KIDS_ENGLISH_PLAYER_V2_MOCKUP.html
3. CLAUDE_V2_USER_EXPERIENCE.md
```

역할:

```text
KIDS_ENGLISH_PLAYER_V2_CONCEPT.md
→ WHY / WHAT
→ 제품 철학, 핵심 개념, 기능 방향

KIDS_ENGLISH_PLAYER_V2_MOCKUP.html
→ UX / IA
→ 화면 구조, 정보 배치, 사용자 흐름

CLAUDE_V2_USER_EXPERIENCE.md
→ HOW
→ 구현 원칙, 범위, 완료 조건
```

충돌이 있다면 우선순위:

```text
Concept
→ Mockup
→ Implementation Command
```

단, 보안이나 기술적 제약 때문에 조정이 필요하면 합리적으로 판단하고 문서화한다.

---

# 3. 제품 정의

Kids English Player V2는 다음 제품이다.

> 부모가 검증된 영어 영상 Content Library에서 아이에게 맞는 Level과 Channel을 선택하고,
> 아이는 추천·자유 탐색·Auto Play를 통해 영어 콘텐츠를 접하며,
> 부모는 아이별 학습 이력과 선호를 관리하는 영어 콘텐츠 플랫폼.

---

# 4. V2 핵심 구조

기존 Playlist 중심 사고를 사용하지 않는다.

기본 정보 구조:

```text
Content Library
    ↓
Channel
    ↓
Video
    ↕
Level / Category

Parent
    ↓
My Collection
    ↓
Child Preference

Child
 ├─ Continue Watching
 ├─ Recommendation
 ├─ Browse
 └─ Auto Play
```

---

# 5. 핵심 개념

## 5.1 Content Library

서비스가 기본 제공하는 공용 콘텐츠 집합이다.

초기 Channel 후보:

```text
Caillou
Pocoyo
Alphablocks
Peppa Pig
Daniel Tiger
Bluey
```

실제 seed는 현재 Concept과 Mockup에 충분한 샘플만 넣어도 된다.

운영자용 Content Admin은 이번 범위가 아니다.

---

## 5.2 Channel

Channel은 서비스 내부 콘텐츠 그룹이다.

필수 속성 예:

```text
id
slug
name
description
enabled
createdAt
updatedAt
```

---

## 5.3 Video

필수 속성 예:

```text
id
youtubeVideoId
youtubeUrl
title
thumbnailUrl
channelId
level
category
durationSeconds
enabled
createdAt
updatedAt
```

Level:

```text
1
2
3
4
5
```

Category 예:

```text
STORY
PHONICS
SONG
DAILY_LIFE
FEELINGS
SCHOOL
FAMILY
```

---

# 6. Level의 역할

Level은 Playlist가 아니다.

반드시 다음 개념으로 구현한다.

```text
Level = 영상의 난이도 속성
```

따라서 다음 조합이 가능해야 한다.

```text
Level 2 + Alphablocks
Level 3 + Caillou
Level 4 + Peppa Pig
```

Level은 필터다.

---

# 7. Playlist / Collection의 역할

Playlist는 핵심 탐색 단위가 아니다.

필요하다면 다음 용도로만 사용한다.

```text
Curated Collection
Learning Path
추천 순서
```

이번 구현의 핵심은 `My Collection`이다.

---

# 8. Parent / Household / Child

여러 부모가 사용하는 서비스 구조를 전제로 한다.

최소 구조:

```text
User
  ↓
Household
  ↓
Child
```

권장 모델:

## User

```text
id
email
passwordHash
displayName
createdAt
updatedAt
```

## Household

```text
id
name
createdAt
updatedAt
```

## HouseholdMember

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

현재 회원가입 사용자는 OWNER.

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

불필요한 아동 개인정보는 수집하지 않는다.

이번 범위에서 받지 않는다:

```text
학교
주소
성별
상세 생년월일
```

---

# 9. Authentication

부모는 다음 방식으로 로그인한다.

```text
email
password
```

회원가입:

```text
email
password
displayName
```

회원가입 시 transaction으로 생성:

```text
User
Household
HouseholdMember(OWNER)
```

조건:

```text
password 평문 저장 금지
httpOnly cookie
sameSite 설정
production secure
session expiration
server-side authorization
email normalization
```

---

# 10. Household Isolation

가장 중요한 보안 요구사항이다.

다른 Household의 Child, Collection, Progress, WatchSession, AutoPlaySession에 접근할 수 없어야 한다.

잘못된 방식:

```text
findChild(childId)
```

반드시 다음 의미의 검증이 있어야 한다.

```text
session user
→ household membership
→ child household
→ ownership verified
```

URL의 childId를 신뢰하지 않는다.

IDOR 방지 테스트를 반드시 작성한다.

---

# 11. Child Preference

아이별 콘텐츠 허용 범위와 선호를 저장한다.

최소:

```text
childId
minLevel
maxLevel
preferredChannels
```

예:

```text
민준
Level 3~4
Caillou
Peppa Pig
```

이 설정은:

```text
추천
Browse 기본 필터
Auto Play 기본 설정
```

에 사용한다.

---

# 12. Parent Dashboard

Mockup 기준으로 구현한다.

최소 정보:

```text
아이 목록
아이별 허용 Level
아이별 선호 Channel
오늘 학습 시간
최근 시청
완료 영상 수
My Collection
```

아이별 상세로 이동 가능해야 한다.

---

# 13. Content Library — Parent User View

운영자 Admin이 아니라 부모 사용자용 화면이다.

최소 기능:

```text
Channel 목록
Level filter
Channel filter
Category filter
검색
영상 목록
My Collection에 추가
```

공용 Library 원본은 부모가 직접 수정하지 않는다.

---

# 14. My Collection

부모가 공용 Library에서 콘텐츠를 가져와 자기 가정/아이에 맞게 구성한다.

필수 기능:

```text
Library 영상 추가
Collection에서 제외
순서 변경
YouTube URL 직접 추가
```

공용 Library 원본과 개인화 데이터는 분리한다.

권장 모델:

## Collection

```text
id
householdId
childId nullable
title
createdAt
updatedAt
```

## CollectionVideo

```text
id
collectionId
videoId
sequence
enabled
```

---

# 15. 직접 YouTube 등록

부모가 직접 URL을 등록하는 기능도 유지한다.

필수:

```text
YouTube URL 입력
videoId 파싱
thumbnail 생성
title 자동 조회 가능하면 조회
실패 시 manual title fallback
```

YouTube Data API Key 없이도 MVP가 동작해야 한다.

가능하면 oEmbed를 사용한다.

---

# 16. Child Select

아이 로그인은 만들지 않는다.

부모 로그인 상태에서:

```text
누가 영어를 볼까요?

[ 민준 ]
[ 서준 ]
```

아이 선택 후 Child Home으로 이동한다.

---

# 17. Child Home

Mockup 기준 최소 구성:

```text
아이 이름

[ 이어서 보기 ]

오늘 추천

좋아하는 Channel

[ 원하는 영상 찾기 ]

[ 계속 틀어놓기 ]
```

기존처럼 다음 영상 하나만 강제하지 않는다.

---

# 18. Browse

V2 핵심 기능이다.

아이가 직접:

```text
Level
Channel
```

을 선택할 수 있어야 한다.

결과 목록에는:

```text
thumbnail
title
channel
level
category
watch status
progress
```

표시.

상태:

```text
새 영상
진행 중
봤어요
```

아이의 허용 범위를 벗어난 Level/Channel은 노출하지 않거나 비활성 처리한다.

---

# 19. Recommendation

AI 추천은 구현하지 않는다.

초기 추천 규칙:

```text
IN_PROGRESS 우선
+
Child allowed level
+
preferred channel
+
enabled video
+
NOT_STARTED 우선
```

추천과 Browse는 역할을 분리한다.

```text
추천
→ 시스템이 먼저 제안

Browse
→ 아이가 직접 선택
```

---

# 20. Player

YouTube IFrame Player API를 사용한다.

필수:

```text
재생
일시정지
ENDED
현재 위치
영상 길이
진행률
이어보기
처음부터 보기
다음 추천
```

YouTube 영상 다운로드는 하지 않는다.

---

# 21. VideoProgress

아이별 영상 진행상태를 저장한다.

권장 모델:

```text
id
childId
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

unique:

```text
childId + videoId
```

status:

```text
NOT_STARTED
IN_PROGRESS
COMPLETED
```

상태 전환:

```text
NOT_STARTED
→ IN_PROGRESS
→ COMPLETED
```

COMPLETED는 자동 회귀하지 않는다.

---

# 22. Completion

기본 완료 기준:

```text
90%
```

완료 조건:

```text
progress >= completionThreshold
OR
YouTube ENDED
```

magic number로 흩어놓지 않는다.

설정 또는 명확한 상수로 관리한다.

---

# 23. Watch Time

seek로 시청시간이 부풀려지면 안 된다.

잘못된 방식:

```text
1분
→ seek
→ 9분

watchSeconds += 8분
```

금지.

실제 Player 상태가 PLAYING인 동안의 경과 시간만 누적한다.

heartbeat 기반이라면 비정상 delta 상한을 둔다.

---

# 24. WatchSession

권장 모델:

```text
id
childId
videoId
startedAt
endedAt
startPositionSeconds
endPositionSeconds
watchSeconds
createdAt
```

오늘 학습 시간과 최근 시청 기록 계산에 사용한다.

---

# 25. Auto Play Mode

V2의 중요한 핵심 기능이다.

목적:

> 아이가 매번 영상을 고르지 않아도 부모가 선택한 영어 Channel을 집에서 일정 시간 계속 노출한다.

진입:

```text
Child Home
Browse
```

버튼:

```text
계속 틀어놓기
Auto Play
```

---

# 26. Auto Play 설정

최소 설정:

```text
Channel
minLevel
maxLevel
playMode
replayCompleted
maxMinutes
```

playMode:

```text
SEQUENTIAL
RANDOM
```

예:

```text
Channel: Caillou
Level: 3~4
재생 순서: RANDOM
이미 본 영상: 포함
재생 시간: 30분
```

---

# 27. AutoPlaySession

권장 모델:

```text
id
childId
channelId
minLevel
maxLevel
playMode
replayCompleted
maxMinutes
startedAt
endedAt
currentVideoId nullable
playedVideoCount
```

Auto Play도 일반 재생과 동일하게:

```text
VideoProgress
WatchSession
```

에 기록한다.

별도 progress 체계를 만들지 않는다.

---

# 28. Auto Play 동작

브라우저 autoplay 제한을 고려한다.

최초:

```text
[ Auto Play 시작 ]
```

버튼을 한 번 누르게 한다.

그 후 같은 세션에서 영상 종료 시 다음 영상으로 자동 전환한다.

SEQUENTIAL:

```text
조건에 맞는 영상 안정적 순서
```

RANDOM:

```text
조건 안에서 무작위
```

조건:

```text
Channel
Level range
enabled
replayCompleted
```

현재 영상이 즉시 다시 선택되지 않도록 한다.

---

# 29. Intro

`/intro` 페이지를 제공한다.

내용:

```text
서비스 목적
부모 역할
아이 역할
Library
Collection
Browse
Progress
Auto Play
```

CTA:

```text
로그인
회원가입
```

---

# 30. Route 권장

현재는 fresh project이므로 명확한 route를 구성한다.

권장:

## Public

```text
/intro
/login
/signup
```

## Parent

```text
/admin
/admin/children
/admin/children/[childId]
/library
/collections
```

## Child

```text
/kids
/kids/[childId]
/kids/[childId]/browse
/kids/[childId]/watch/[videoId]
/kids/[childId]/autoplay
```

더 나은 구조가 있으면 조정 가능하지만 역할은 유지한다.

---

# 31. 기술 스택

fresh rebuild 기본 권장:

```text
Next.js
TypeScript
Prisma
SQLite
Vitest
```

가능하면:

```text
Next.js App Router
TypeScript strict
Prisma
SQLite
Server Components
Server Actions
Route Handlers
```

를 사용한다.

Frontend와 Backend는 하나의 프로젝트로 유지한다.

---

# 32. SQLite

현재 단계에서는 SQLite를 사용한다.

조건:

```text
migration
seed
명확한 DB 위치
gitignore
backup 가능
```

실데이터 DB는 commit하지 않는다.

향후 PostgreSQL 전환 가능성을 Architecture 문서에 기록한다.

---

# 33. Seed

fresh rebuild이므로 실행 직후 화면을 확인할 수 있는 seed를 제공한다.

최소:

```text
Channel
Video
Level
Category
```

Mockup과 Concept에 등장하는 대표 콘텐츠를 사용한다.

예:

```text
Caillou
Alphablocks
Pocoyo
Peppa Pig
```

영상 URL/ID가 확실하지 않으면 placeholder임을 명확히 한다.

존재하지 않는 실제 영상처럼 가장하지 않는다.

seed는 외부 네트워크 실패로 전체 실패하지 않도록 한다.

---

# 34. UI

`KIDS_ENGLISH_PLAYER_V2_MOCKUP.html`을 정보구조와 디자인 참고로 사용한다.

금지:

```text
Mockup iframe 삽입
정적 HTML 그대로 복사
hardcoded fake 화면만 구현
```

실제 Next.js 컴포넌트와 DB 데이터를 연결한다.

최소 화면:

```text
Intro
Parent Dashboard
Content Library
My Collection
Child Select
Child Home
Browse
Player
Auto Play
```

---

# 35. Responsive

최소:

```text
Desktop
Tablet
Mobile
```

Child Home / Browse / Player / Auto Play는 태블릿 사용성을 우선한다.

---

# 36. Admin Content — 이번 범위 제외

이번 fresh rebuild에서 운영자용 Content Admin은 구현하지 않는다.

제외:

```text
Channel CRUD Admin
Video CRUD Admin
Library moderation
Content approval workflow
운영자 권한 체계
```

초기 Content Library는 seed로 제공한다.

부모의 My Collection과 직접 URL 등록은 구현한다.

---

# 37. 테스트 필수

## Auth

```text
signup
duplicate email
login success
wrong password
logout
session tampering
```

## Household Isolation

```text
Parent A → Child A PASS
Parent A → Child B DENY

Parent A → Child B Progress DENY
Parent A → Child B WatchSession DENY
Parent A → Child B Collection DENY
Parent A → Child B AutoPlaySession DENY
```

## Library

```text
Level filter
Channel filter
Category filter
disabled 제외
```

## Child Preference

```text
허용 Level 적용
선호 Channel 적용
아이별 독립
```

## Collection

```text
Library Video 추가
Collection에서 제외
순서 변경
원본 Library 불변
Household isolation
```

## Browse

```text
Level + Channel
progress 표시
COMPLETED 표시
허용 범위 밖 제외
```

## Progress

```text
89% → IN_PROGRESS
90% → COMPLETED
ENDED → COMPLETED
COMPLETED 회귀 금지
```

## Watch Time

```text
seek 미반영
PLAYING만 누적
pause 미누적
비정상 heartbeat 상한
```

## Auto Play

```text
SEQUENTIAL next
RANDOM candidate
Channel 조건
Level 범위
replayCompleted false
replayCompleted true
현재 영상 즉시 반복 방지
maxMinutes 종료
```

---

# 38. Browser Validation

가능하면 browser automation 또는 실제 browser로 검증한다.

최소 E2E:

```text
Signup
→ Login
→ Child 생성
→ Child Preference 설정
→ Library
→ Collection 추가
→ Child 선택
→ Browse
→ 영상 선택
→ Player
→ Progress 저장
```

Auto Play:

```text
Child Home
→ Auto Play
→ Channel + Level 설정
→ Start
→ 첫 영상
→ Next 자동 선택
```

실제 YouTube 재생 검증이 불가능하면:

```text
NOT VERIFIED
```

로 명확히 기록하고 서버/통합 테스트로 대체한다.

---

# 39. 문서

최종적으로 반드시 생성:

```text
README.md
docs/ARCHITECTURE.md
docs/IMPLEMENTATION_RESULT.md
```

README:

```text
프로젝트 소개
기술 스택
설치
환경 변수
DB migration
seed
개발 실행
production build
Docker 또는 Mac mini 실행
LAN 접속
DB backup
주요 route
```

Architecture:

```text
User
Household
HouseholdMember
Child
ChildPreference
Channel
Video
Collection
CollectionVideo
VideoProgress
WatchSession
AutoPlaySession
```

관계도와 데이터 흐름 포함.

---

# 40. 구현 순서

중간 승인 없이 다음 순서로 끝까지 진행한다.

```text
Phase 1
3개 SSOT 분석

Phase 2
Architecture 결정

Phase 3
Next.js project initialization

Phase 4
Prisma / SQLite schema

Phase 5
Auth / Household / Child

Phase 6
Content Library / Channel / Video

Phase 7
Child Preference

Phase 8
My Collection

Phase 9
Parent Dashboard

Phase 10
Child Select / Child Home

Phase 11
Browse

Phase 12
Player / Progress / WatchSession

Phase 13
Recommendation

Phase 14
Auto Play

Phase 15
Authorization

Phase 16
Tests

Phase 17
lint / typecheck / build

Phase 18
runtime validation

Phase 19
README / Architecture / Result

Phase 20
Git final check
```

---

# 41. 실패 시 행동

일부 기능이 막혀도 전체 작업을 중단하지 않는다.

```text
문제 발견
→ 원인 분석
→ 수정
→ 재검증
→ 독립 작업 계속
```

실행하지 않은 항목은 PASS라고 쓰지 않는다.

검증하지 못하면:

```text
NOT VERIFIED
```

로 적는다.

---

# 42. 완료 조건

다음을 만족하면 COMPLETE다.

```text
[ ] 프로젝트 신규 초기화
[ ] signup/login/logout
[ ] Household 생성
[ ] Child 2명 이상 등록 가능
[ ] Household isolation
[ ] Channel
[ ] Video level/category
[ ] Content Library
[ ] Level filter
[ ] Channel filter
[ ] Category filter
[ ] My Collection
[ ] Library Video 가져오기
[ ] 직접 YouTube URL 추가
[ ] Child Preference
[ ] Child Select
[ ] Child Home
[ ] Continue Watching
[ ] Recommendation
[ ] Browse
[ ] 자유 선택 시청
[ ] YouTube Player
[ ] Progress
[ ] WatchSession
[ ] 이어보기
[ ] 완료 판정
[ ] Auto Play 설정
[ ] Auto Play 연속 재생
[ ] Auto Play Progress 기록
[ ] Auth tests
[ ] Household isolation tests
[ ] Library tests
[ ] Browse tests
[ ] Progress tests
[ ] Auto Play tests
[ ] lint PASS
[ ] typecheck PASS
[ ] build PASS
[ ] runtime 검증
[ ] README
[ ] ARCHITECTURE
[ ] IMPLEMENTATION_RESULT
```

---

# 43. Git

현재 branch와 working tree를 먼저 확인한다.

```text
git status
git branch --show-current
```

과거 tag/branch는 분석하지 않는다.

현재 fresh workspace에서만 개발한다.

작업 완료 후:

```text
git status
git diff --stat
```

를 확인한다.

사용자가 별도로 금지하지 않았다면 모든 검증 완료 후 하나의 명확한 commit으로 정리해도 된다.

권장:

```text
feat: build kids english player v2
```

---

# 44. 최종 보고 형식

최종 응답은 다음 형식으로 작성한다.

```text
1. Status:
2. Architecture:
3. Auth / Household / Child:
4. Content Library:
5. My Collection:
6. Child Preference:
7. Child Home:
8. Browse:
9. Player / Progress:
10. Auto Play:
11. Household isolation:
12. Tests:
13. lint/typecheck:
14. build:
15. Runtime:
16. Browser E2E:
17. Known limitations:
18. Result document:
19. Git status / commit:
```

---

# 45. Start

이제 아래 3개 파일만 읽고 바로 작업을 시작한다.

```text
KIDS_ENGLISH_PLAYER_V2_CONCEPT.md
KIDS_ENGLISH_PLAYER_V2_MOCKUP.html
CLAUDE_V2_USER_EXPERIENCE.md
```

과거 v1 코드, tag, branch, commit은 절대 열지 않는다.

```text
Concept
→ Mockup
→ Architecture
→ Fresh Project Initialization
→ Database
→ Auth
→ Household / Child
→ Content Library
→ Collection
→ Child Preference
→ Parent UI
→ Child UI
→ Browse
→ Player
→ Progress
→ Recommendation
→ Auto Play
→ Authorization
→ Tests
→ Build
→ Runtime Validation
→ Documentation
→ Git Final Check
```

**중간 승인 없이 가능한 범위까지 끝까지 구현하라.**
