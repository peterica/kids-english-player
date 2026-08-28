# Implementation Result — Kids English Player V2

작성일: 2026-08-28
SSOT: `KIDS_ENGLISH_PLAYER_V2_CONCEPT.md`, `KIDS_ENGLISH_PLAYER_V2_MOCKUP.html`, `CLAUDE_V2_USER_EXPERIENCE.md`
브랜치: `feature/v2-rebuild` (fresh workspace 에서 새로 구현. 과거 구현/커밋은 참조하지 않음)

## Status

COMPLETE — 완료 조건 항목을 모두 구현하고 단위/통합 테스트, lint, typecheck, production build,
Docker 기동, 실제 브라우저 E2E 까지 검증했다.
실제 YouTube **영상 재생**만 이 환경의 네트워크 제약으로 확인하지 못했다(아래 Known Limitations).

---

## Implemented

### 계정 / 가정 / 아이
- `/signup` — User + Household + HouseholdMember(OWNER) 를 한 트랜잭션으로 생성, 첫 아이 이름도 함께 등록
- `/login`, 로그아웃 — scrypt 해시 검증 + HMAC 서명 세션 쿠키(httpOnly, sameSite=lax, 30일, secure 옵션)
- 이메일 소문자 정규화·형식 검사, 비밀번호 8자 이상, 중복 가입 차단, 실패 사유 비노출
- 아이 다중 등록(최대 10), 이름 변경, 비활성화(삭제 없음)

### Content Library
- Channel 6개(Caillou / Alphablocks / Pocoyo / Peppa Pig / Daniel Tiger / Caitie's Classroom), 영상 31편 seed
- Video 속성: `level(1~5)`, `category(STORY·PHONICS·SONG·DAILY_LIFE·FEELINGS·SCHOOL·FAMILY)`, `channelId`, `enabled`
- `/library` — Channel 카드, Level/Channel/Category 필터 + 제목 검색, 아이를 골라 Collection에 담기
- 공용 Library 원본은 부모가 수정하지 않는다

### My Collection
- 아이별 Collection 자동 생성, Library 영상 담기 / 숨기기 / 다시 보이기 / 빼기 / 순서 변경
- `/collections` 에서 YouTube 주소 직접 등록 (videoId 파싱 → 썸네일 생성 → oEmbed 제목 조회 → 실패 시 입력값/기본값)
- 직접 등록 영상은 `Video.householdId` 로 그 가정에만 노출

### Child Preference
- 아이별 허용 Level 범위(min~max) + 선호 Channel(복수, 미지정 시 전체 허용)
- 추천 / Browse / Auto Play 기본값으로 사용

### 아이 화면
- `/kids` 아이 선택, `/kids/[childId]` Home — 이어보기 카드, 오늘 추천 4편, 좋아하는 Channel, 계속 틀어놓기
- `/kids/[childId]/browse` — 허용 범위 안의 Level·Channel 탭, 상태 배지(새 영상 / 진행률 / 봤어요)
- `/kids/[childId]/watch/[videoId]` — YouTube IFrame 재생, 진행률·처음부터 보기·다음 추천
- 허용 범위 밖 영상은 재생하지 않고 안내 화면을 보여준다

### Player / Progress
- 10초 heartbeat + 일시정지/종료/이탈(sendBeacon) 저장, 이어보기(start 위치 복원)
- 완료: `progressPercent >= completion_threshold(기본 90)` 또는 ENDED, COMPLETED 회귀 금지
- 시청 시간은 PLAYING 경과 시간만 누적, heartbeat 당 30초 상한
- 재생하지 않고 화면만 열었다 나가면 기록을 만들지 않음

### Auto Play
- 설정: Channel / Level 범위 / 순차·랜덤 / 이미 본 영상 포함 여부 / 재생 시간(15·30·60·제한 없음)
- 첫 재생은 사용자 클릭 1회, 이후 ENDED 시 같은 플레이어에서 다음 영상 자동 전환
- 남은 시간 카운트다운, 다음 영상 미리보기, 즉시 다음/종료 버튼
- 조건에 맞는 영상이 없으면 시작하지 않고 안내
- Auto Play 재생도 동일한 VideoProgress / WatchSession 에 기록

### 부모 Dashboard
- `/admin` — 아이 수, 오늘 학습 시간, 이번 주 완료, Collection 수, 아이별 진행률/허용 Level/선호 Channel,
  최근 시청(Household), 완료 기준 설정
- `/admin/children/[childId]` — 진행률, 오늘 학습, 최근 시청, Collection, 볼 수 있는 영상 전체 목록

### Intro
- `/intro` — 서비스 목적, 부모/아이 역할, Library → Collection → Browse → Progress 흐름, 로그인/회원가입 CTA

---

## Architecture

- Next.js 16 App Router 단일 프로젝트, TypeScript strict, Prisma 6 + SQLite, Vitest, Docker
- 순수 규칙(`catalog.ts`, `recommendation.ts`, `autoplay-rules.ts`, `progress-rules.ts`)을 DB·UI와 분리
- 아이가 볼 수 있는 영상은 `resolveChildCatalog()` 한 곳에서 결정 → 화면·재생·Auto Play가 항상 일치
- 상세: `docs/ARCHITECTURE.md`

---

## Household Isolation

`authorizeChild` / `authorizeCollection` / `authorizeAutoPlaySession` 을 모든 접근 경로에서 강제한다.

| 경로 | 처리 |
|---|---|
| `/kids/[childId]`, `/kids/[childId]/**`, `/admin/children/[childId]` | 남의 아이면 `/kids` 로 redirect |
| `POST /api/progress`, `/api/sessions` | 세션 → Household → child 소유 확인, 실패 시 400 |
| `POST /api/autoplay/next`, `/stop` | 세션의 Household 로 AutoPlaySession 조회, 실패 시 400 |
| Collection Server Action | `authorizeCollection` 실패 시 오류 |
| WatchSession 갱신 | 세션의 childId/videoId 일치까지 재확인 |

브라우저 검증 결과(가정 A 로그인 상태에서 가정 B 자원 접근):

```text
/kids/<B child>              → /kids 로 redirect
/admin/children/<B child>    → /kids 로 redirect
POST /api/progress {childId: B}  → 400 "아이를 찾을 수 없습니다." (B 기록 0건 유지)
POST /api/sessions {childId: B}  → 400 "아이를 찾을 수 없습니다."
B 계정 → A 의 autoplay session   → 400 "Auto Play 세션을 찾을 수 없습니다."
비로그인 POST /api/progress      → 400 "로그인이 필요합니다."
비로그인 /kids/<child>           → /login
```

---

## Tests

`npm test` → **8 files / 92 tests PASS**

| 파일 | 내용 |
|---|---|
| `tests/youtube.test.ts` | watch/youtu.be/shorts/embed/live/m./nocookie/videoId 파싱 + 실패 케이스 |
| `tests/progress-rules.test.ts` | 89%→IN_PROGRESS, 90%→COMPLETED, ENDED, 완료기준 주입, 회귀 금지, seek 미반영, pause 미누적, heartbeat 상한, shouldRecordTick |
| `tests/catalog.test.ts` | Level 범위·선호 Channel·비활성 제외, Collection 담기(범위 밖 허용)·숨기기(우선), 정렬, Level/Channel/Category/검색 필터 |
| `tests/recommendation.test.ts` | 이어보기 선택, IN_PROGRESS→선호 Channel→새 영상→본 영상 순, 현재 영상 제외, limit |
| `tests/autoplay-rules.test.ts` | Channel/Level/replayCompleted/비활성 후보 규칙, SEQUENTIAL 순환, RANDOM 즉시 반복 방지, 후보 1편, maxMinutes 만료·남은 시간 |
| `tests/auth.test.ts` | 비밀번호 해시·검증, 이메일 정규화·검증, 세션 서명/위조/userId 치환/만료 |
| `tests/integration/household.test.ts` (27) | 가입/중복/로그인, 아이·Collection·카탈로그·AutoPlay 격리, Library 필터, 비활성 제외, 타 가정 직접등록 영상 비노출, Preference, Collection 담기/숨기기/빼기/순서/직접등록, 진행 기록 분리·세션 도용 차단·빈 heartbeat |
| `tests/integration/autoplay.test.ts` (13) | 세션 시작·설정 저장, SEQUENTIAL 진행·순환, 남은 시간, maxMinutes 만료, 새 세션 시작 시 이전 종료, 후보 없음, replayCompleted true/false, Auto Play 기록이 동일 테이블에 남음, 종료 세션 재진행, Level 범위 검증 |

통합 테스트는 임시 SQLite DB(`prisma db push`)를 만들어 실행하므로 개발 DB에 영향을 주지 않는다.

---

## Lint

`npm run lint` → PASS (0 error / 0 warning)

## Typecheck

`npm run typecheck` (tsc --noEmit, strict) → PASS

## Build

`npm run build` → PASS. 21개 route 생성 (`/intro`, `/login`, `/signup`, `/admin`, `/admin/children`,
`/admin/children/[childId]`, `/library`, `/collections`, `/kids`, `/kids/[childId]`,
`/kids/[childId]/browse`, `/kids/[childId]/watch/[videoId]`, `/kids/[childId]/autoplay`, API 4개 등)

## Docker

- `docker build` PASS (multi-stage, Next standalone)
- 빈 볼륨으로 컨테이너 기동 → `prisma migrate deploy` + Content Library seed 자동 실행 확인
  (channels=6, videos=31)
- 컨테이너(:3201)에서 회원가입 → `/admin` 이동 → Library 6 Channel / 31편 렌더 → `/kids` 아이 선택 화면 확인

---

## Runtime / Browser E2E

로컬 production 서버(`next start`, :3200)에 대해 Playwright + Google Chrome 으로 전체 흐름을 실행했다.

| # | 검증 | 결과 |
|---|---|---|
| 1 | `/intro` 렌더 및 CTA | PASS |
| 2 | 회원가입 → User/Household/OWNER/Child/Collection 생성 | PASS |
| 3 | 아이 추가(2명) | PASS |
| 4 | 아이별 Preference 저장 (민준 L3–4 Caillou / 서준 L1–2 Alphablocks) | PASS (DB 확인) |
| 5 | Library 필터 — 전체 31편, Level 3 → 8편, Alphablocks → 6편, PHONICS+"word" → 3편 | PASS |
| 6 | Collection 담기 (허용 범위 밖 Level 2 영상) | PASS |
| 7 | Collection 숨기기 → enabled=0, 되돌리기 → enabled=1 | PASS |
| 8 | YouTube 주소 직접 등록 → `householdId` 붙은 영상 생성 | PASS |
| 9 | 아이 선택 화면 (민준/서준/아이 추가) | PASS |
| 10 | Child Home — 추천 4편(담은 영상·직접등록 포함), 좋아하는 Channel 버튼 | PASS |
| 11 | Browse — 허용 Level 탭(2·3·4)과 Channel 탭(Alphablocks·Caillou)만 노출, Level 3 → 7편 | PASS |
| 12 | 허용 범위 밖 영상 직접 접근 → "지금은 볼 수 없는 영상이에요" | PASS |
| 13 | Player 진입 + 세션 시작 + 진행률 저장 (20% IN_PROGRESS → 93% COMPLETED), 다른 아이 기록 0건 | PASS |
| 14 | 홈 통계 반영 (오늘 1편 · 20초) | PASS |
| 15 | Auto Play — 조건 없음 안내, RANDOM 세션 시작, 현재 영상 표시, next API 로 다음 영상 전환(played 1→2, 남은 시간 898초) | PASS |
| 16 | 가정 간 격리 (페이지 redirect / API 400 / 타 가정 autoplay 조작 차단) | PASS |
| 17 | 비로그인 API 400, 아이 화면 → `/login` | PASS |
| 18 | Dashboard 집계 (아이 2명 · 오늘 20초 · 이번 주 1편 · Collection 2개) | PASS |
| 19 | 반응형 — mobile(390px)·tablet(820px) 의 Home/Browse/Dashboard 가로 오버플로 0px | PASS |

---

## Known Limitations

- **NOT VERIFIED — 실제 YouTube 영상 재생**: 검증 시점 이 개발 머신의 네트워크에서 `www.youtube.com`
  이 차단되어(github/google 은 정상, youtube 는 타임아웃) IFrame Player 의 실제 재생·ENDED 이벤트·
  Auto Play 자동 전환의 "영상이 실제로 끝나서 넘어가는" 부분을 눈으로 확인하지 못했다.
  플레이어 로드 실패 시 앱은 "YouTube 플레이어를 불러오지 못했습니다" 안내를 정상 표시했고,
  진행률 저장·완료 판정·Auto Play 다음 영상 전환은 같은 API 를 실제 호출해 검증했다.
  YouTube 접속이 가능한 네트워크에서 1회 재확인이 필요하다.
- **NOT VERIFIED — 실기기 확인**: 반응형은 데스크톱 Chrome 의 모바일/태블릿 뷰포트로만 확인했다.
- seed 의 YouTube 영상 ID 는 2026-08-28 에 oEmbed 로 존재를 확인한 실제 공개 영상이지만, 위 네트워크
  제약으로 이번 실행 시점에는 재확인하지 못했다. 영상이 내려가면 부모가 Collection 에서 숨기거나
  seed 를 갱신해야 한다.
- 오늘 학습 시간/오늘 본 영상 수는 `WatchSession` 기준이다. 세션 생성이 실패하면 진행률은 저장되지만
  오늘 통계에는 반영되지 않는다.
- 운영자용 Content Admin(Channel/Video CRUD, 승인 워크플로)은 이번 범위에서 제외했다.
  공용 Library 는 seed 로만 관리한다.
- 부모 공동 관리(초대), 비밀번호 재설정, 아이 아바타 이미지, 자동 Level 승급은 구현하지 않았다.
- SQLite 유지. PostgreSQL 전환 지점은 `docs/ARCHITECTURE.md` 10절에 기록했다.

---

## Next Recommended Step

1. YouTube 접속이 가능한 네트워크에서 아이 화면으로 영상 1편을 실제 재생해
   진행률 저장 → 완료 → Auto Play 자동 전환을 눈으로 확인한다.
2. `.env` 의 `SESSION_SECRET` 을 실제 값으로 바꾸고 `docker compose up -d --build` 로 상시 기동한다.
3. 아이가 쓸 기기에서 `/kids` 를 즐겨찾기하고, 실제 사용 로그를 보며 Level 범위와 Collection 을 조정한다.
4. Content Library 확장(채널·영상 추가)은 `prisma/seed-content.ts` 에 항목을 넣고 `npm run db:seed` 로 반영한다.
