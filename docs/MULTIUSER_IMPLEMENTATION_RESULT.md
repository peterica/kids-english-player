# Multi-user Implementation Result

작성일: 2026-08-28
대상 지시서: `task/multi-home/CLAUDE_MULTIUSER_PLAYLIST.md`

## Status

COMPLETE — P2(멀티 가정/멀티 아이) + P3(플레이리스트/레벨) 구현 및 검증 완료.
단, 실제 YouTube 재생은 이번 검증 환경의 네트워크 제약으로 확인하지 못했다(아래 Known Limitations 참고).

---

## Implemented

### 계정 / 가정
- `/signup` — User + Household + HouseholdMember(OWNER) 를 한 트랜잭션으로 생성, 첫 아이 이름도 함께 등록 가능
- `/login`, 로그아웃 — scrypt 해시 검증 + HMAC 서명 세션 쿠키(httpOnly, sameSite=lax, 30일)
- 이메일 소문자 정규화 / 형식 검사 / 비밀번호 8자 이상 / 중복 가입 차단
- 로그인 실패 사유를 이메일·비밀번호로 구분해 알려주지 않음
- 기존 `/parent` PIN 화면은 `/login` 리다이렉트로 대체, `PARENT_PIN` 환경변수 의존 제거

### 아이 관리
- `/admin/children` — 아이 추가, 이름 수정, 활성/비활성(하드 삭제 없음), 학습 과정 지정
- `/admin/children/[childId]` — 아이 상세(진행률/오늘 학습/현재 영상/최근 기록/영상별 진행), 과정 변경, 과정별 기록 초기화
- `/kids` 아이 선택(1명이면 자동 이동), `/kids/[childId]` 아이 홈, `/kids/[childId]/watch/[videoId]` 플레이어

### 학습 과정 (Playlist)
- `Playlist` / `PlaylistVideo` / `ChildPlaylist` 모델 추가
- Level 1~4 커리큘럼 48편을 seed 로 등록 (문서 sequence 유지, `youtubeVideoId` 기준 영상 재사용)
- 아이별 현재 과정에서만 현재/다음 영상을 선택. 과정을 바꿔도 이전 기록은 보존
- `/admin/playlists` 읽기 전용 커리큘럼 화면

### 기존 MVP 보존
- Player, 10초 heartbeat, 시청시간 상한, 90%/ENDED 완료 판정, COMPLETED 회귀 금지, 다음 영상 선택 규칙,
  WatchSession, 오늘 통계, YouTube metadata(oEmbed) 로직은 v1 코드를 그대로 사용하고 입력 범위만 아이/과정으로 좁혔다.

---

## Migration

`prisma/migrations/20260828060356_multiuser_playlist/migration.sql`

1. 새 테이블 생성 (User / Household / HouseholdMember / Child / Playlist / PlaylistVideo / ChildPlaylist)
2. 기존 `VideoProgress`·`WatchSession` 행이 있으면 "우리 가족 (이전 데이터)" Household + "우리 아이" Child 생성
3. 기존 행을 그 아이에게 연결하며 테이블 재구성 (데이터 삭제 없음)
4. 사용하지 않는 `parent_pin_hash` 설정 삭제

이 Household 는 구성원이 없으므로 최초 회원가입자가 OWNER 로 인계받는다(`signupUser()`).

**실제 v1 DB 로 검증함**: 영상 3편 + 진행 1건 + 세션 1건이 있는 v1 DB 사본에 `prisma migrate deploy` 실행 →
`우리 가족 (이전 데이터)` / `우리 아이` 생성, 진행(COMPLETED 100%, 175초)과 세션이 childId=1 로 이관,
영상 3편 유지, `parent_pin_hash` 삭제 확인. 이어서 회원가입 시 `adoptedLegacyHousehold=true` 로 인계되어
새 계정에서 기존 아이와 기록에 접근되는 것까지 확인했다.

---

## Auth

| 항목 | 구현 |
|---|---|
| 비밀번호 | scrypt(salt) 해시, 평문 저장·비교 없음 |
| 세션 | `"<userId>.<만료시각>.<HMAC-SHA256>"` 쿠키, httpOnly / sameSite=lax / 30일 |
| secure 쿠키 | `COOKIE_SECURE=true` + production 일 때만 (LAN HTTP 운영을 막지 않기 위해) |
| householdId | 클라이언트가 결정 불가. 서버가 `userId → HouseholdMember` 로 해석 |
| 위조 방지 | 서명 불일치·만료·userId 치환 모두 거부 (테스트 있음) |

---

## Household Isolation

`authorizeChild(householdId, childId)` 를 모든 아이 접근 경로에서 강제한다.

- 페이지: `requirePageChild()` — 남의 아이면 `/kids` 로 redirect
- API: `requireSessionUser()` → `authorizeChild()` → 실패 시 400
- Server Action: 아이 수정/과정 변경/기록 초기화 전부 동일 검증
- WatchSession 갱신 시 세션의 childId/videoId 일치까지 재확인

브라우저 검증 결과(가정 A 로그인 상태에서 가정 B 리소스 접근):

```text
/kids/<B의 childId>            → /kids 로 redirect
/admin/children/<B의 childId>  → /kids 로 redirect
POST /api/progress {childId: B} → 400 "아이를 찾을 수 없습니다." (B 진행 행 0건 유지)
POST /api/sessions {childId: B} → 400 "아이를 찾을 수 없습니다."
비로그인 POST /api/progress     → 400 "로그인이 필요합니다."
비로그인 /kids/<childId>        → /login
```

---

## Child Management

- 최대 10명, 이름 20자 제한, 비활성화(soft) 지원 — 하드 삭제 없음
- 아이별 학습 과정 선택 시 다른 진행 중 과정은 대기로 내리고 선택 과정만 IN_PROGRESS
- 아이 상세에서 과정별 기록 초기화(그 아이의 VideoProgress/WatchSession 만 삭제)

---

## Playlist

- Level 1: 12편 / Level 2: 12편 / Level 3: 12편 / Level 4: 12편 (총 48편)
- 과정별 sequence 는 문서 권장값(10 단위) 그대로
- 현재/다음 영상 선택은 "현재 과정 ∩ 활성 영상" 범위에서만 수행
- 플레이어는 아이의 현재 과정에 없는 영상이면 안내 화면을 보여준다

---

## Seed

`prisma/playlist-data.ts` (문서에서 생성한 정적 데이터) + `prisma/seed.ts`

- 런타임에 마크다운을 파싱하지 않는다
- 외부 API 호출 없음 → 네트워크가 없어도 seed 가 실패하지 않는다 (문서 제목을 사용)
- `youtubeVideoId` 기준 upsert 로 기존 영상 재사용, 제목 덮어쓰기 없음
- 반복 실행 안전(idempotent). Docker 기동 시 자동 실행

---

## Changed Files

```text
신규
  prisma/migrations/20260828060356_multiuser_playlist/migration.sql
  prisma/playlist-data.ts
  src/lib/auth.ts, guard.ts, children.ts, playlists.ts, password.ts(구 pin.ts)
  src/app/actions/auth.ts
  src/app/login/page.tsx, src/app/signup/page.tsx, src/components/AuthForm.tsx
  src/app/kids/page.tsx, src/app/kids/[childId]/page.tsx,
  src/app/kids/[childId]/watch/[videoId]/page.tsx
  src/app/admin/children/{page.tsx,ChildManager.tsx}
  src/app/admin/children/[childId]/{page.tsx,ChildPlaylistControls.tsx}
  src/app/admin/playlists/page.tsx
  tests/auth.test.ts, tests/integration/{setup-db.ts,household-isolation.test.ts}
  docs/ARCHITECTURE_V2.md, docs/MULTIUSER_IMPLEMENTATION_RESULT.md

수정
  prisma/schema.prisma, prisma/seed.ts
  src/lib/constants.ts, session.ts, learning.ts, progress-service.ts
  src/app/page.tsx, src/app/parent/page.tsx(리다이렉트만), src/app/admin/*
  src/app/api/{progress,sessions}/route.ts, src/components/WatchPlayer.tsx
  Dockerfile, docker-entrypoint.sh, docker-compose.yml, .env.example, README.md, package.json

삭제
  src/lib/pin.ts (→ password.ts), src/app/parent/PinForm.tsx, src/app/parent/actions.ts
  src/app/watch/[videoId]/page.tsx (→ /kids/[childId]/watch/[videoId])
  tests/pin-session.test.ts (→ auth.test.ts)
```

---

## Tests

`npm test` → **6 files / 58 tests PASS**

| 파일 | 내용 |
|---|---|
| `tests/youtube.test.ts` | URL 파싱 6종 + 실패 케이스 (v1 유지) |
| `tests/video-selection.test.ts` | IN_PROGRESS/NOT_STARTED/sequence/disabled/전부완료 (v1 유지) |
| `tests/progress-rules.test.ts` | 89%→IN_PROGRESS, 90%→COMPLETED, ENDED, 회귀 금지, seek 미반영, heartbeat 상한 (v1 유지) |
| `tests/format.test.ts` | 시간 표기, KST 하루 경계 (v1 유지) |
| `tests/auth.test.ts` | 비밀번호 해시/검증, 이메일 정규화·검증, 세션 서명/위조/userId 치환/만료 |
| `tests/integration/household-isolation.test.ts` | 임시 SQLite DB 로 실행하는 통합 테스트 17건 |

통합 테스트 항목: 회원가입 시 OWNER 생성·이메일 정규화 저장, 중복 이메일 거부, 짧은 비밀번호 거부,
로그인 실패/성공, 다른 가정 아이 조회·수정·과정변경 거부, 존재하지 않는 childId 거부,
대시보드가 자기 가정만 조회, 아이별 진행 독립, 남의 sessionId 도용 차단,
현재 과정 기반 선택·과정 변경 시 기록 보존·비활성 영상 제외·아이별 과정 독립, 레거시 가정 인계.

---

## Lint

`npm run lint` → PASS (0 error / 0 warning)

## Typecheck

`npm run typecheck` (tsc --noEmit, strict) → PASS

## Build

`npm run build` → PASS. 15개 라우트 생성.

## Docker

- `docker build` PASS
- 빈 볼륨으로 컨테이너 기동 → `prisma migrate deploy` + 커리큘럼 seed 자동 실행 확인
  (playlists=4, videos=48, playlistVideos=48)
- 컨테이너에서 회원가입 → 아이 등록 → Level 1 지정 → 아이 홈에 `[L1] How Are You Feeling?` 표시까지 확인
- `docker-compose.yml` 에서 `PARENT_PIN` 제거, `SESSION_SECRET` 만 주입

---

## Manual Verification

실제 브라우저(Playwright + Google Chrome)로 production build(:3200)에서 수행한 결과다.

| # | 검증 | 결과 |
|---|---|---|
| 1 | 회원가입 → User/Household/OWNER/Child 생성 | PASS |
| 2 | 로그인 상태에서 `/signup` 접근 → 아이 화면으로 리다이렉트 | PASS |
| 3 | 아이 2명 등록, 각각 Level 1 / Level 2 지정 | PASS (`민준:Level 1:IN_PROGRESS`, `서준:Level 2:IN_PROGRESS`) |
| 4 | 아이 선택 화면에 두 아이 표시 | PASS |
| 5 | 아이 홈이 자기 과정의 첫 영상 표시 | PASS (`[L1] How Are You Feeling?`) |
| 6 | 플레이어 진입 및 화면 렌더 | PASS |
| 7 | 진행률 저장 (로그인 세션의 `/api/progress`) | PASS (30% IN_PROGRESS → 95% COMPLETED) |
| 8 | 완료 후 다음 영상 자동 전환 | PASS (`[L1] What's Your Favorite Color?`) |
| 9 | 다른 아이에 기록이 반영되지 않음 | PASS (서준 진행 0건) |
| 10 | 세션 API + 오늘 통계 | PASS (WatchSession 생성, 홈 "오늘 본 영상 1개 / 10초") |
| 11 | 존재하지 않는 sessionId 사용 | PASS (세션 갱신 없이 진행만 저장) |
| 12 | 가정 간 격리 (페이지/API/비로그인) | PASS (위 Household Isolation 표) |
| 13 | 부모 대시보드 아이별 요약 | PASS (`Level 1 · 1/12 완료`, `Level 2 · 0/12 완료`) |
| 14 | 아이 상세 / 학습 과정 화면 | PASS (Level 1~4 각 12편) |
| 15 | 로그아웃 후 `/admin` 접근 | PASS (`/login`) |
| 16 | 모바일 뷰(390px) 가로 오버플로 | PASS (0px) |
| 17 | v1 DB 마이그레이션 + 인계 | PASS (위 Migration 절) |

---

## Known Limitations

- **NOT VERIFIED — 실제 YouTube 재생**: 검증 시점에 이 개발 머신의 네트워크에서 `www.youtube.com` 이
  차단되어(github/google 은 정상, youtube 는 타임아웃) IFrame Player 재생을 확인하지 못했다.
  앱은 이 상황에서 "YouTube 플레이어를 불러오지 못했습니다" 안내를 정상 표시했다.
  Player 코드 자체는 v1에서 실제 재생·일시정지·ENDED·이어보기까지 검증됐고, v2 변경은
  childId 전달과 URL 경로뿐이다. YouTube 접속이 되는 네트워크에서 1회 재확인이 필요하다.
- 오늘 학습 시간/오늘 본 영상 수는 `WatchSession` 기준이다. 플레이어가 세션 생성에 실패하면
  진행률은 저장되지만 오늘 통계에는 잡히지 않는다.
- `Video` / `Playlist` 는 모든 가정이 공유하는 공용 카탈로그다. 한 부모가 `/admin/videos` 에서
  영상을 수정·삭제하면 다른 가정에도 영향을 준다(현재는 단일 가정 운영 전제).
- 부모 공동 관리(초대), 자동 Level 승급, 아이 아바타, 비밀번호 재설정은 구현하지 않았다.
- SQLite 유지. PostgreSQL 이전 검토 시점은 `docs/ARCHITECTURE_V2.md` 8절에 기록했다.

---

## Next Recommended Step

1. YouTube 접속이 가능한 네트워크(예: Mac mini)에서 아이 화면으로 영상 1편을 실제 재생해
   진행률 저장 → 완료 → 다음 영상 전환을 눈으로 확인한다.
2. Mac mini 재배포: `rsync` 후 `docker compose up -d --build`.
   기존 48편 카탈로그는 그대로 유지되고 커리큘럼(Playlist)만 새로 연결된다.
   배포 후 부모 계정을 만들면 v1 데이터가 자동 인계된다.
3. 아이별 실제 사용 로그를 보며 Level 승급 기준(자동/수동)을 정한다.
