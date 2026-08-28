# Architecture — Kids English Player V2

> 부모가 검증된 영어 영상 Content Library에서 아이에게 맞는 Level과 Channel을 선택하고,
> 아이는 추천·자유 탐색·Auto Play로 영어 콘텐츠를 접하며,
> 부모는 아이별 학습 이력과 선호를 관리하는 영어 콘텐츠 플랫폼.

---

## 1. 기술 스택

| 영역 | 선택 | 이유 |
|---|---|---|
| Framework | Next.js 16 (App Router) | Frontend/Backend 단일 프로젝트, Server Component + Server Action 으로 API 표면 최소화 |
| Language | TypeScript strict | 카탈로그·진행률·Auto Play 규칙의 실수를 컴파일 타임에 차단 |
| DB | SQLite | 가정 단위 소규모 운영, 파일 복사 백업 |
| ORM | Prisma 6 | migration/seed 제공, raw SQL 조립이 없어 injection 위험 없음 |
| Player | YouTube IFrame Player API | 페이지 내부 재생 + 재생 상태 이벤트 |
| Test | Vitest | 순수 규칙 단위 테스트 + 임시 SQLite 통합 테스트 |
| 실행 | Docker Compose | `docker compose up -d` 한 줄로 상시 기동 |

외부 API Key 를 쓰지 않는다. 직접 등록한 영상의 제목은 YouTube oEmbed(무인증)로 조회하고,
실패하면 부모가 입력한 값이나 기본값을 쓴다. 썸네일은 정형 URL(`i.ytimg.com`)을 사용한다.

---

## 2. 정보 구조

```text
Content Library (공용)
    ↓
Channel  ──<  Video  >── Level / Category
                 ↑
Parent ─ My Collection (담기 / 숨기기 / 순서 / 직접 등록)
                 ↑
Child ─ ChildPreference (허용 Level 범위 · 선호 Channel)
    ├─ Continue Watching
    ├─ Recommendation
    ├─ Browse (Level · Channel 필터)
    └─ Auto Play
```

핵심은 **Level 이 경로가 아니라 필터**라는 점이다. `Level 3 + Caillou`, `Level 4 + Peppa Pig`
같은 조합이 자유롭게 성립한다. 고정 Playlist 재생 개념은 쓰지 않는다.

---

## 3. 데이터 모델

```text
User ──< HouseholdMember >── Household ──< Child ──1 ChildPreference ──< ChildPreferredChannel >── Channel
                                   │                    │
                                   │                    ├──< VideoProgress   >── Video
                                   │                    ├──< WatchSession    >── Video
                                   │                    └──< AutoPlaySession >── Channel / Video
                                   │
                                   └──< Collection ──< CollectionVideo >── Video

Channel ──< Video >── (level, category, householdId?)
Setting(key, value)   // completion_threshold
```

| 모델 | 역할 | 핵심 제약 |
|---|---|---|
| `User` | 부모 계정 | `email` unique(소문자 정규화), `passwordHash`(scrypt) |
| `Household` | 보안 경계 | 모든 아이·Collection·기록 조회의 기준 |
| `HouseholdMember` | 가정 구성원 | role `OWNER`/`PARENT`, `@@unique([householdId, userId])` |
| `Child` | 아이 | 삭제 대신 `enabled=false` |
| `ChildPreference` | 허용 Level 범위 | `@@unique(childId)`, 선호 Channel 은 조인 테이블 |
| `Channel` | 콘텐츠 그룹 | `slug` unique, 화면 색상 `colorKey` |
| `Video` | 영상 | `youtubeVideoId` unique, `level`, `category`, **`householdId`(null=공용 Library, 값 있으면 그 가정 전용)** |
| `Collection` / `CollectionVideo` | 부모 개인화 | `@@unique([collectionId, videoId])`, `enabled=false` 는 "아이에게 숨김" |
| `VideoProgress` | 아이별 진행 | `@@unique([childId, videoId])` |
| `WatchSession` | 재생 1회 기록 | 오늘 학습 시간·최근 시청 계산 |
| `AutoPlaySession` | 계속 틀어놓기 | 설정(channel/level/mode/replay/maxMinutes) + `currentVideoId`, `playedVideoCount` |

공용 Library 원본과 개인화 데이터는 완전히 분리된다. 부모는 Library 를 수정하지 않고,
Collection 에 담거나(명시적 허용) 숨기거나(명시적 차단) 자기 가정 전용 영상을 추가한다.

---

## 4. 아이가 볼 수 있는 영상 (핵심 규칙)

`src/lib/catalog.ts` 의 순수 함수 `resolveChildCatalog()` 한 곳에서 결정한다.

```text
1. 비활성(enabled=false) 영상은 언제나 제외
2. Collection 에서 숨긴 영상은 언제나 제외        (부모의 명시적 차단)
3. Collection 에 담은 영상은 허용 범위를 벗어나도 포함  (부모의 명시적 허용)
4. 그 밖에는 허용 Level 범위 + 선호 Channel(지정 시) 안에서만 포함
```

이 결과(`ChildCatalog`)에 아이별 `VideoProgress` 를 붙인 것이 Child Home / Browse / Player /
Auto Play 가 공유하는 단일 소스다. 따라서 "아이 화면에 보이는 것"과 "재생 가능한 것"이 항상 일치한다.

- 추천(`recommendation.ts`): IN_PROGRESS → 선호 Channel 의 새 영상 → 다른 새 영상 → 이미 본 영상
- Browse: 같은 카탈로그에 Level/Channel 필터만 적용, 허용 범위 밖 Level·Channel 은 탭 자체가 없다
- Player: 카탈로그에 없는 videoId 로 접근하면 안내 화면을 보여주고 재생하지 않는다

---

## 5. Authorization (IDOR 방지)

```text
session cookie → userId → HouseholdMember → householdId → child.householdId 일치 확인
```

- `authorizeChild(householdId, childId)` / `authorizeCollection` / `authorizeAutoPlaySession`
  세 함수만 통과해야 데이터에 접근한다. URL·body 의 id 는 신뢰하지 않는다.
- 페이지: `requirePageChild()` → 남의 아이면 `/kids` 로 redirect
- API/Server Action: `requireSessionUser()` → `authorize*()` → 실패 시 사용자용 오류(400)
- WatchSession 갱신 시 `session.childId`/`videoId` 일치까지 재확인해 남의 세션 id 도용을 막는다
- 세션 쿠키: `"<userId>.<만료시각>.<HMAC-SHA256>"`, httpOnly, sameSite=lax, 30일,
  `COOKIE_SECURE=true` + production 일 때만 secure

---

## 6. Player / Progress / Watch Time

```text
WatchPlayer / AutoPlayRunner
   └─ useYouTubeProgress (공통 훅)
        PLAYING 시작        → POST /api/sessions        (WatchSession 생성)
        1초 tick            → PLAYING 경과 시간만 누적
        10초마다            → POST /api/progress        (heartbeat)
        PAUSED / ENDED      → POST /api/progress
        탭 종료             → sendBeacon /api/progress
```

- 시청 시간은 **위치 차이가 아니라 PLAYING 상태로 흐른 실제 시간**만 누적하고,
  heartbeat 1건당 최대 30초(저장주기 10초 × 3)만 인정한다 → seek 로 부풀지 않는다
- 완료: `progressPercent >= completion_threshold(Setting, 기본 90)` 또는 YouTube `ENDED`
- `COMPLETED` 는 다시 재생해도 회귀하지 않는다
- 재생하지 않고 화면만 열었다 나가면 진행 기록을 만들지 않는다(`shouldRecordTick`)

---

## 7. Auto Play

```text
설정(Channel · Level 범위 · 순차/랜덤 · 이미 본 영상 포함 · 재생 시간)
   → AutoPlaySession 생성 + 첫 영상 결정
   → [▶ 재생 시작] 1회 클릭 (브라우저 autoplay 정책)
   → 영상 ENDED → POST /api/autoplay/next → 같은 플레이어에서 다음 영상 load
   → maxMinutes 초과 또는 후보 소진 → 세션 종료
```

- 후보: 아이 카탈로그 ∩ Channel ∩ Level 범위 ∩ enabled, `replayCompleted=false` 면 COMPLETED 제외
- `SEQUENTIAL` 은 (level, sequence) 순서로 다음 영상, 끝에서 처음으로 순환
- `RANDOM` 은 현재 영상을 후보에서 뺀 뒤 무작위 → 같은 영상이 연속되지 않는다(후보가 1편이면 예외)
- Auto Play 재생도 일반 재생과 **동일한** `VideoProgress` / `WatchSession` 에 기록한다

---

## 8. 디렉터리 구조

```text
src/
  app/
    intro/ login/ signup/            공개 화면
    (parent)/                        부모 화면 (사이드바 셸 + 세션 가드)
      admin/ admin/children/[childId]
      library/ collections/
    kids/                            아이 화면
      [childId]/ browse/ watch/[videoId]/ autoplay/
    api/                             progress · sessions · autoplay(next/stop)
    actions/                         auth · parent · autoplay Server Actions
  components/                        ParentShell · VideoCard · WatchPlayer · AutoPlayRunner · useYouTubeProgress
  lib/
    catalog.ts recommendation.ts autoplay-rules.ts progress-rules.ts   [순수 규칙]
    auth.ts guard.ts session.ts password.ts                            [인증/인가]
    library.ts children.ts collections.ts child-content.ts             [도메인 서비스]
    progress-service.ts autoplay-service.ts stats.ts household.ts
prisma/  schema.prisma · migrations · seed.ts · seed-content.ts
tests/   단위 6개 파일 + integration 2개 파일
```

순수 규칙(카탈로그/추천/Auto Play/진행률)은 DB와 UI를 모르는 함수로 분리해 단위 테스트하고,
서비스 레이어가 이를 호출해 저장만 담당한다.

---

## 9. 실행 구조

```text
Tablet / Phone / Mac (같은 Wi-Fi)
        │  http://<server-ip>:3200
        ▼
Docker container (node:24-alpine, Next standalone)
        │  entrypoint: prisma migrate deploy → seed → node server.js
        ▼
/app/data/app.db  ←→  호스트 ./data/app.db (volume)
```

---

## 10. 향후 PostgreSQL 전환 지점

지금은 SQLite 를 쓴다(가정 단위, 단일 인스턴스, 파일 백업). 다음 상황이 되면 전환을 검토한다.

- 여러 가정이 동시에 쓰는 서비스로 확장해 동시 쓰기가 늘 때 (SQLite 는 단일 writer)
- 인스턴스를 여러 개 띄워 같은 DB 를 공유해야 할 때
- 기간별 학습 통계 등 무거운 집계가 늘 때

변경 지점은 `prisma/schema.prisma` 의 datasource, `DATABASE_URL`, SQLite 전용 마이그레이션 재작성뿐이다.
애플리케이션 코드는 Prisma Client 로만 DB 에 접근하므로 수정이 필요 없다.
