# Architecture — Kids English Player

로컬(가정 내 Mac mini) 환경에서 동작하는 단일 사용자용 영어 학습 플레이어의 구조 문서다.
PRD 범위를 넘는 기능은 포함하지 않는다.

---

## 1. 기술 스택

| 영역 | 선택 | 이유 |
|---|---|---|
| Framework | Next.js 16 (App Router) | Frontend/Backend 를 한 프로젝트로 유지, Server Component + Server Action 으로 API 표면 최소화 |
| Language | TypeScript (strict) | 진행률/상태 전환 로직의 실수를 컴파일 타임에 잡기 위함 |
| DB | SQLite | 로컬 SSOT, 파일 복사만으로 백업 |
| ORM | Prisma 6 | migration/seed 기본 제공, raw SQL 조립이 없어 injection 위험 없음 |
| Player | YouTube IFrame Player API | 페이지 내부 재생 + 재생 상태 이벤트 수신 |
| Test | Vitest | 순수 로직(파싱/선택/완료판정) 단위 테스트 |
| 실행 | Docker Compose (Mac mini) | `docker compose up -d` 한 줄로 상시 기동 |

외부 API Key 는 사용하지 않는다. 제목은 YouTube oEmbed(무인증), 썸네일은 정형 URL을 사용한다.

---

## 2. 디렉터리 구조

```text
src/
  app/
    page.tsx                   Child Home (/)
    watch/[videoId]/page.tsx   Player (/watch/:id)
    parent/                    부모 PIN 로그인 (/parent)
    admin/
      layout.tsx               부모 세션 가드 + 관리 내비게이션
      page.tsx                 Parent Dashboard (/admin)
      videos/                  Video Management (/admin/videos)
      actions.ts               부모 기능 Server Actions
    api/
      sessions/route.ts        POST 시청 세션 시작
      progress/route.ts        POST 진행률 heartbeat
  components/
    WatchPlayer.tsx            YouTube Player + 진행률 저장(클라이언트)
    ProgressBar.tsx, StatusBadge.tsx
  lib/
    constants.ts               상태값/저장주기/기본 완료기준 등 상수
    youtube.ts                 URL 파싱, 썸네일, oEmbed 제목
    youtube-iframe.ts          IFrame API 로더 + 최소 타입
    progress-rules.ts          [순수] 진행률/완료/시청시간 규칙
    video-selection.ts         [순수] 현재/다음 영상 선택 규칙
    progress-service.ts        진행률/세션 DB 반영
    videos.ts                  영상 등록/수정/순서/삭제
    learning.ts                홈·대시보드 조회 (통계, 최근 기록)
    settings.ts                Settings 테이블 접근 (완료 기준 등)
    pin.ts / session.ts        PIN 해시, 부모 세션 쿠키
    day.ts, format.ts          KST 기준 하루 범위, 표시 포맷
    errors.ts, request.ts      사용자 메시지, API 입력 검증
prisma/
  schema.prisma, migrations/, seed.ts
tests/                          Vitest 단위 테스트
```

핵심 판정 로직(`progress-rules.ts`, `video-selection.ts`)은 DB와 UI를 모르는 순수 함수로 분리해
테스트 가능하게 두었다. 나머지 레이어는 이 함수를 호출해 저장만 담당한다.

---

## 3. 데이터 모델

```text
Video 1───1 VideoProgress
  │
  └───* WatchSession

Setting(key, value)
```

- `Video` — youtubeVideoId(unique), url, title, thumbnailUrl, durationSeconds, sequence, enabled
- `VideoProgress` — status, lastPositionSeconds, durationSeconds, progressPercent, watchSeconds,
  startedAt, lastWatchedAt, completedAt (영상당 1행)
- `WatchSession` — 재생 1회 단위 기록. startedAt/endedAt, 시작·종료 위치, 그 세션의 watchSeconds
- `Setting` — `completion_threshold`, `parent_pin_hash`

오늘 통계는 `WatchSession.startedAt` 범위 조회로 계산한다(집계 테이블 없음).

상태 전환:

```text
NOT_STARTED → IN_PROGRESS → COMPLETED
```

`COMPLETED` 는 재생만으로 되돌아가지 않는다. 부모가 `/admin/videos` 에서 "진행 초기화"를 눌렀을 때만
해당 영상의 progress/session 행이 삭제되어 `NOT_STARTED` 로 돌아간다.

---

## 4. 데이터 흐름

### 4.1 재생 → 저장

```text
WatchPlayer(client)
  PLAYING 시작 → POST /api/sessions          → WatchSession 생성
  1초 tick     → PLAYING 경과 시간 누적(로컬)
  10초마다     → POST /api/progress          → recordProgressTick()
  PAUSED/ENDED → POST /api/progress (ended)
  탭 종료      → sendBeacon /api/progress
```

`recordProgressTick()` 은 다음을 수행한다.

1. Settings 에서 완료 기준(%)을 읽는다.
2. `applyProgressTick(현재 상태, tick)` 순수 함수로 다음 상태를 계산한다.
3. `VideoProgress` upsert, `Video.durationSeconds` 갱신, `WatchSession` 종료 위치/시청시간 갱신.

### 4.2 시청 시간 계산 (seek 부풀리기 방지)

클라이언트는 **위치 차이가 아니라 PLAYER_STATE.PLAYING 상태로 흐른 실제 시간**만 `watchDeltaSeconds`
로 보낸다. 서버는 `sanitizeWatchDelta()` 로 heartbeat 1건당 최대 30초(저장주기 10초 × 3)만 인정한다.
따라서 1분 → 9분으로 seek 해도 watchSeconds 는 실제 재생 시간만큼만 증가한다.

### 4.3 완료 판정

```text
progressPercent = floor(position / duration × 100)
completed       = ended(YouTube ENDED) OR progressPercent >= completion_threshold
```

기준값은 상수가 아니라 `Setting.completion_threshold`(기본 90)에서 읽고, `/admin` 에서 변경한다.

### 4.4 현재/다음 영상 선택

`selectCurrentVideo()`: 활성 영상 중 `IN_PROGRESS` → `NOT_STARTED` 순, 같은 상태면 sequence 오름차순.
모두 완료면 `null`(아이 화면은 완료 상태를 표시). `selectNextVideo()` 는 현재 영상을 제외하고 같은 규칙을 적용한다.

---

## 5. 화면

| 경로 | 역할 | 특징 |
|---|---|---|
| `/` | Child Home | 오늘 날짜/오늘 본 영상/학습 시간/전체 완료, 현재 영상 1개와 큰 버튼 하나 |
| `/watch/[videoId]` | Player | IFrame 재생, 진행률, 처음부터 보기, 다음 영상 |
| `/parent` | 부모 PIN 입력 | 실패 메시지만 노출 |
| `/admin` | Parent Dashboard | 전체 진행률, 오늘 학습 시간, 현재 영상, 최근 기록, 완료 기준/PIN 설정 |
| `/admin/videos` | Video Management | 등록, 제목 수정, 위/아래 순서, 활성/비활성, 진행 초기화, 삭제 |

아이 화면(`/`, `/watch`)에는 관리 진입 링크를 두지 않는다. 부모는 `/admin` 을 직접 입력해 들어간다.

---

## 6. 부모 모드 보호

- PIN 은 `scrypt(salt)` 해시로 `Setting.parent_pin_hash` 에 저장한다. 평문 저장/비교 없음.
- 로그인 성공 시 HMAC 서명 + 만료시각(12시간)을 담은 httpOnly 쿠키를 발급한다.
- `/admin/*` 은 layout 에서 세션을 검증하고 실패 시 `/parent` 로 redirect 한다.
- Setting 에 PIN 해시가 없으면 첫 로그인 시 `PARENT_PIN` 환경변수로 1회 생성한다(Docker 초기 기동 대응).
- 서명 키는 `SESSION_SECRET` 환경변수. `.env` 는 커밋하지 않고 `.env.example` 만 제공한다.

---

## 7. 실행 구조 (Mac mini)

```text
Tablet / Phone / Mac (같은 Wi-Fi)
        │  http://<mac-mini-ip>:3200
        ▼
Docker container (node:24-alpine, Next standalone)
        │  entrypoint: prisma migrate deploy → node server.js
        ▼
/app/data/app.db  ←→  호스트 ./data/app.db (volume)
```

- 컨테이너는 `0.0.0.0:3200` 에 바인딩하여 LAN 접근을 허용한다.
- DB 는 호스트 `./data` 볼륨에 있으므로 컨테이너를 지워도 데이터가 남고, 폴더 복사로 백업된다.
- TZ 는 `Asia/Seoul` 로 고정한다. 통계의 "오늘" 경계는 코드에서도 KST 기준으로 계산한다.
