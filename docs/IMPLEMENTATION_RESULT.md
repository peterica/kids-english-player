# Implementation Result

작성일: 2026-08-28

## Status

COMPLETE — MVP 핵심 플로우 구현 완료, 실제 브라우저(Chrome) E2E 검증까지 통과.

- 2026-08-28 1차: 구현 + 단위 테스트 + HTTP/API 검증 (P1 MVP IMPLEMENTATION COMPLETE)
- 2026-08-28 2차: 실제 브라우저 E2E 검증 및 발견 버그 수정 (P1 REAL-BROWSER VALIDATION DONE)

모든 서비스 포트는 `docker-compose.yml` 기준 **3200** 으로 통일한다.

---

## Implemented

### 아이 기능
- `/` Child Home — 오늘 날짜, 오늘 본 영상 수, 오늘 학습 시간, 전체 완료/활성 영상 수, 현재 학습 영상 1개와 큰 버튼 하나, 최근 학습 기록
- `IN_PROGRESS` 가 있으면 이어보기, 없으면 sequence 가 가장 빠른 `NOT_STARTED`, 모두 끝나면 완료 화면
- `/watch/[videoId]` Player — YouTube IFrame Player API 내부 재생, 진행률/재생시간 표시, 처음부터 보기, 다음 영상 이동, 완료 안내
- 진행 상태 자동 저장: 재생 중 10초 주기 + 일시정지/종료 + 탭 종료(sendBeacon)
- 새로고침 후 마지막 위치에서 이어보기 (`start` 파라미터로 복원)

### 부모 기능
- `/parent` PIN 로그인 (scrypt 해시 검증, 실패 메시지 노출)
- `/admin` Dashboard — 전체 진행률, 완료/활성 수, 오늘 학습 시간·영상 수·완료 수, 현재 학습 영상, 최근 학습 기록, 완료 기준(%)·PIN 변경
- `/admin/videos` — YouTube URL 등록(제목 자동 조회), 제목 수정, 위/아래 순서 변경, 활성/비활성, 진행 초기화, 삭제
- `/admin/*` 는 서명된 httpOnly 쿠키 세션(12시간)으로 보호, 미인증 시 `/parent` 로 redirect

### 로직
- YouTube URL 파싱: `watch?v=`, `youtu.be/`, `/shorts/`, `/embed/`, `/live/`, `m.`/`nocookie`, videoId 직접 입력
- 썸네일: `i.ytimg.com` 정형 URL / 제목: oEmbed(API Key 불필요), 실패 시 부모 입력
- 완료 판정: `progressPercent >= completion_threshold`(Setting, 기본 90) 또는 YouTube ENDED
- `COMPLETED` 자동 회귀 금지 (부모의 "진행 초기화"로만 해제)
- 시청 시간: PLAYING 상태 경과 시간만 누적 + heartbeat 당 최대 30초 상한 → seek 로 부풀지 않음
- 오늘 통계: KST 기준 하루 범위로 `WatchSession` 집계
- 오류 메시지: 잘못된 URL, 중복 등록, 영상 없음, 비활성 영상, 플레이어 로드 실패를 사용자 문구로 노출(stack trace 미노출)

---

## Architecture

- Next.js 16 App Router + TypeScript(strict) 단일 프로젝트 (Frontend + Backend)
- 데이터 접근은 Prisma 6 + SQLite (`data/app.db`)
- 순수 로직(`src/lib/progress-rules.ts`, `src/lib/video-selection.ts`)을 DB/UI 와 분리하여 단위 테스트
- 조회는 Server Component, 부모 기능은 Server Action, Player 저장 경로만 Route Handler(`/api/progress`, `/api/sessions`)
- 상세: `docs/ARCHITECTURE.md`

---

## Changed Files

신규 생성 (기존 코드 없음, 프로젝트 초기화부터 수행):

```text
package.json / tsconfig.json / next.config.ts / eslint.config.mjs / vitest.config.mts
.env.example / .gitignore / .dockerignore / Dockerfile / docker-compose.yml / docker-entrypoint.sh
prisma/schema.prisma, prisma/migrations/20260828044052_init/migration.sql, prisma/seed.ts
src/app/layout.tsx, globals.css, page.tsx, not-found.tsx, error.tsx
src/app/watch/[videoId]/page.tsx
src/app/parent/{page.tsx, PinForm.tsx, actions.ts}
src/app/admin/{layout.tsx, page.tsx, SettingsForm.tsx, actions.ts}
src/app/admin/videos/{page.tsx, VideoManager.tsx}
src/app/api/{progress,sessions}/route.ts
src/components/{WatchPlayer.tsx, ProgressBar.tsx, StatusBadge.tsx}
src/lib/{constants,day,db,errors,format,learning,pin,progress-rules,progress-service,
         request,session,settings,video-selection,videos,youtube,youtube-iframe,action-state}.ts
tests/{youtube,video-selection,progress-rules,pin-session,format}.test.ts
README.md, docs/ARCHITECTURE.md, docs/IMPLEMENTATION_RESULT.md
```

---

## Database

- SQLite. 위치: `data/app.db` (`DATABASE_URL="file:../data/app.db"`, Docker 는 `/app/data/app.db` 볼륨)
- Migration: `20260828044052_init` — Video / VideoProgress / WatchSession / Setting
- Seed: 완료 기준(90), PARENT_PIN 해시, 개발용 샘플 영상 3건(제목 `[샘플]` 접두, 실제 학습 콘텐츠 아님)
- `data/` 는 `.gitignore` 처리 — 실데이터 DB 를 커밋하지 않음
- 백업: `sqlite3 data/app.db ".backup ..."` 또는 서비스 중지 후 파일 복사 (README 참고)

---

## Validation

실제로 실행한 결과다.

| 명령 | 결과 |
|---|---|
| `npm test` (Vitest) | PASS — 5 files / 38 tests |
| `npm run lint` (ESLint 9 flat config) | PASS — 0 error 0 warning |
| `npm run typecheck` (tsc --noEmit, strict) | PASS |
| `npm run build` (Next 16 production build) | PASS — 8 라우트 생성 |
| `npx prisma migrate dev` | PASS — init migration 적용 |
| `npm run db:seed` | PASS — 설정/PIN/샘플 3건 생성 |
| `docker build` / `docker compose up -d` | PASS — 3200 포트로 기동, `prisma migrate deploy` 자동 적용 |

테스트 커버 항목:
- YouTube URL 파싱 6종 + 실패 케이스
- 다음 영상 선택 (IN_PROGRESS 우선 / NOT_STARTED 차선 / sequence / disabled 제외 / 전부 완료)
- 완료 판정 (89% → IN_PROGRESS, 90% → COMPLETED, ENDED → COMPLETED, 기준값 주입, COMPLETED 회귀 금지)
- 시청 시간 (seek 미반영, heartbeat 상한, 일시정지 시 미증가, startedAt 유지)
- PIN 해시/검증, 세션 토큰 서명·만료·변조
- 시간 표기, KST 하루 경계
- 재생하지 않고 페이지만 열었다 나간 경우 진행 기록을 만들지 않음 (`shouldRecordTick`)

---

## Manual Verification

### A. HTTP / API 검증 (production build, 3200)

1. `GET /` 200 — 현재 영상/오늘 통계/최근 기록이 DB 값으로 렌더링됨
2. `GET /watch/<id>` 200, 없는 id 404, 비활성 영상은 안내 화면
3. `POST /api/sessions` → sessionId 발급, WatchSession 생성
4. `POST /api/progress` 시퀀스
   - 178/200초(89%) → `IN_PROGRESS`, watchSeconds 10
   - 위치를 앞으로 크게 이동 + 실제 재생 10초 → watchSeconds 20 (seek 만큼 증가하지 않음)
   - `watchDeltaSeconds: 600` 전송 → watchSeconds 30 (상한 30초만 인정)
   - `ended: true` → `COMPLETED`, 100%
   - 완료 후 처음부터 재생 tick → `COMPLETED` 유지, completedAt 유지
   - 존재하지 않는 videoId → 400 + "영상을 찾을 수 없습니다."
5. 부모 인증: 쿠키 없음/변조 → `/parent` 307, 유효 쿠키 → `/admin` 200
6. 빈 DB 로 기동한 임시 컨테이너에서 PIN 로그인 폼 POST — 틀린 PIN 거부, 맞는 PIN 로그인 성공
   (`PARENT_PIN` 환경변수로 해시가 자동 생성되는 경로 확인). 이후 정식 기동은 compose(3200)로 전환.
7. 영상 관리 서비스 직접 검증 — 등록/중복/잘못된 URL/순서 변경/비활성/삭제

### B. 실제 브라우저 E2E (Playwright + Google Chrome, http://localhost:3200)

`data/app.db` 를 직접 조회하며 UI·DB 를 함께 확인했다. 샘플 1번 영상(19초)으로 전체 플로우를 1회 완주했다.

| # | 검증 항목 | 결과 |
|---|---|---|
| 1 | 아이 홈에서 현재 영상 표시 + "시작하기" | PASS |
| 2 | YouTube IFrame 실제 재생 시작 | PASS (0:00 → 재생, 시간/진행률 실시간 갱신) |
| 3 | 10초 주기 자동 저장 | PASS (UI 0:11/61% 시점 DB `IN_PROGRESS pct=52 pos=10 watch=11`) |
| 4 | 일시정지 중 시청시간 정지 | PASS (6초 대기 후 `watch=12` 동일) |
| 5 | 새로고침 후 이어보기 | PASS ("지난번 0:12까지 봤어요", iframe `start=12`) |
| 6 | 끝까지 재생 → 완료 판정 | PASS (`COMPLETED pct=100 watch=19`, "잘 봤어요!" 배너) |
| 7 | "다음 영상 보기" 전환 | PASS (`/watch/6` → `/watch/7`, 다음 순서 영상) |
| 8 | 재생 없이 페이지만 열고 이탈 | PASS (진행 기록 생성 안 됨 — 아래 버그 수정 후) |
| 9 | 홈/통계 반영 | PASS (오늘 본 영상 1개 / 학습 시간 19초 / 완료 1 / 3, 최근 학습에 완료 기록) |
| 10 | 부모 PIN 로그인 | PASS (미인증 → `/parent`, 틀린 PIN 거부, 정상 PIN → `/admin`) |
| 11 | 대시보드 반영 | PASS (전체 진행률 33%, 오늘 19초, 현재 학습 영상) |
| 12 | 영상 등록/중복 차단 | PASS (oEmbed 제목 자동 조회, 동일 URL 재등록 차단) |
| 13 | 순서 ↑↓ / 제목 수정 | PASS |
| 14 | 진행 초기화 (confirm) | PASS (`COMPLETED` → 기록 삭제) |
| 15 | 비활성화 시 아이 홈에서 제외 | PASS (다음 순서 영상으로 대체) |
| 16 | 삭제 (confirm) | PASS |
| 17 | 부모 모드 종료 후 재접근 차단 | PASS (`/admin` → `/parent`) |
| 18 | 반응형 | PASS — mobile(390px) / tablet(820px) 홈·플레이어 가로 오버플로 0px |

### C. 검증 중 발견하여 수정한 문제

1. **재생하지 않은 영상에 0% 진행 기록이 생성됨** (실제 버그)
   - 증상: 영상 페이지를 열었다가 재생 없이 나가면 `pagehide` 시 저장 요청이 나가 해당 영상이
     `IN_PROGRESS 0%` 로 기록되고, 부모 대시보드 "최근 학습 기록"에 0% 항목이 남았다.
     앞 순서 영상이 남아 있어도 이 영상이 `IN_PROGRESS` 로 잡혀 현재 학습 영상 선택이 바뀔 수 있었다.
   - 수정: 클라이언트는 실제 재생 시간이 0이고 종료 이벤트도 아니면 저장 요청을 보내지 않는다.
     서버도 `shouldRecordTick()` 으로 동일하게 방어하고, 회귀 테스트 4건을 추가했다.
   - 재검증: 페이지 24초 방치 + 이탈 후에도 `VideoProgress`/`WatchSession` 0건 확인.
2. **대시보드 문구 개선**: 아직 시작하지 않은 현재 영상에 "0% 시청 중" 이 표시되던 것을 "아직 시작 전" 으로 변경.

## Deployment

2026-08-28, Mac mini 에 배포 완료.

- 노트북 → Mac mini `rsync`(`node_modules` / `.next` / `data` / `.env` 제외) 후 `docker compose up -d --build`
- Mac mini 의 `.env` 는 서버에서 별도로 생성한다. `SESSION_SECRET` 은 `openssl rand -hex 48`, 파일 권한 600
- 컨테이너: `kids-english-player`, `0.0.0.0:3200`, `restart: unless-stopped`, 기동 시 `prisma migrate deploy` 자동 적용
- 검증: Mac mini 의 `localhost:3200` / LAN IP / 공유기 포트포워딩(3200) 외부 주소 모두 200,
  외부 주소에서 부모 PIN 로그인 폼 POST → 틀린 PIN 거부, 정상 PIN 로그인 후 `/admin`·`/admin/videos` 200
- 배포 시점의 서버 DB 는 비어 있다(샘플 데이터 미이관). 부모가 `/admin/videos` 에서 실제 영상을 등록한다.

---

## Known Limitations

- **NOT VERIFIED — 실기기 확인**: 반응형은 데스크톱 Chrome 의 모바일/태블릿 뷰포트(390px / 820px)로만 확인했다. 실제 아이패드·스마트폰 단말에서의 터치 조작과 전체화면 동작은 확인하지 못했다.
- **NOT VERIFIED — 장시간 운용**: 수십 분 길이 영상, 네트워크 끊김, 여러 기기 동시 접속 상황은 검증하지 않았다. E2E 는 19초 샘플 영상 1편 기준이다.
- 일부 YouTube 영상은 소유자 설정으로 외부 사이트 임베드가 제한될 수 있다. 이 경우 플레이어에 안내 메시지가 표시된다.
- 영상 길이(`durationSeconds`)는 등록 시점이 아니라 최초 재생 시 Player 로부터 받아 저장한다. 재생 전에는 관리 목록에 길이가 표시되지 않는다.
- 아이 화면에는 인증이 없다. LAN 안에서 누구나 접근할 수 있으며, `/admin` 만 PIN 으로 보호된다.
- 단일 아이 기준이다. 여러 아이 계정, 재학습(REVIEW), 캘린더, Playlist Import 는 PRD 의 Phase 2/3 범위로 구현하지 않았다.
- Seed 샘플 영상은 공개 영상이지만 영어 학습 콘텐츠가 아니다. 실제 사용 전 부모가 교체해야 한다.

---

## Next Recommended Step

1. `.env` 의 `PARENT_PIN`, `SESSION_SECRET` 을 실제 값으로 교체하고 컨테이너를 재기동한다.
2. 샘플 영상을 지우고 실제 학습 영상(Alphablocks 등)을 `/admin/videos` 에서 순서대로 등록한다.
3. 아이가 쓸 태블릿에서 10분 이상 영상 1편을 실제로 시청해 장시간 저장/완료 동작을 한 번 확인한다.
4. `data/app.db` 주간 백업을 cron 등으로 자동화한다.
