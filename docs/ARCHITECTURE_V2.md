# Architecture v2 — Multi-user / Multi-child / Playlist

v1(단일 아이 MVP) 구조는 `docs/ARCHITECTURE.md` 에 그대로 남겨 두었다.
이 문서는 v2에서 달라진 부분만 정리한다. Player·진행률·완료 판정·시청시간 계산 등
v1에서 검증된 핵심 로직은 그대로 재사용한다.

---

## 1. 무엇이 달라졌나

| 영역 | v1 | v2 |
|---|---|---|
| 사용자 | 부모 PIN 1개 | 이메일/비밀번호 계정 + Household |
| 아이 | 개념 없음(단일) | Child 여러 명, 가정 단위로 격리 |
| 진행 기록 | Video 1건당 1행 | (Child, Video) 조합당 1행 |
| 학습 순서 | Video.sequence 전역 | Playlist(Level) + PlaylistVideo.sequence |
| 아이 화면 | `/`, `/watch/[videoId]` | `/kids/[childId]`, `/kids/[childId]/watch/[videoId]` |
| 부모 화면 | `/parent` PIN → `/admin` | `/login`, `/signup` → `/admin` |

Player 컴포넌트, heartbeat 저장 주기, `progress-rules.ts`(완료 판정/시청시간 상한),
`video-selection.ts`(IN_PROGRESS → NOT_STARTED → 완료) 는 v1 그대로이며 입력 범위만 바뀌었다.

---

## 2. 데이터 모델

```text
User ──< HouseholdMember >── Household ──< Child
                                              │
                                              ├──< VideoProgress >── Video
                                              ├──< WatchSession  >── Video
                                              └──< ChildPlaylist >── Playlist ──< PlaylistVideo >── Video

Setting(key, value)   // completion_threshold
```

- `User` — email(unique, 소문자 정규화), passwordHash(scrypt), displayName
- `Household` — 보안 경계. 모든 아이/기록 조회는 이 단위로 제한한다
- `HouseholdMember` — role `OWNER` / `PARENT` (공동 관리 확장을 위해 처음부터 분리)
- `Child` — householdId, name, enabled (삭제 대신 비활성화)
- `Playlist` / `PlaylistVideo` — Level 1~4 커리큘럼과 과정별 순서. 모든 가정이 공유하는 공용 카탈로그
- `ChildPlaylist` — 아이별 현재 과정(status: NOT_STARTED / IN_PROGRESS / COMPLETED), `@@unique([childId, playlistId])`
- `VideoProgress` — `@@unique([childId, videoId])`
- `WatchSession` — childId + videoId

`Video` 는 여전히 전역 카탈로그다. 부모가 `/admin/videos` 에서 추가한 영상도 카탈로그에 들어가며,
아이에게 보이려면 학습 과정(Playlist)에 포함되어야 한다.

---

## 3. 인증 / 세션

```text
/signup → User + Household + HouseholdMember(OWNER) 를 한 트랜잭션으로 생성
/login  → scrypt 해시 검증 → 서명된 세션 쿠키 발급
/logout → 쿠키 삭제
```

- 쿠키 값: `"<userId>.<만료시각>.<HMAC-SHA256 서명>"` (`SESSION_SECRET`)
- httpOnly, sameSite=lax, path=/, 30일. HTTPS 환경에서는 `COOKIE_SECURE=true` 로 secure 활성화
- 클라이언트는 householdId 를 결정할 수 없다. 서버가 `userId → HouseholdMember → householdId` 로 해석한다
- `src/lib/session.ts` 는 쿠키 입출력만, `src/lib/auth.ts` 는 DB 로직만 담당한다(테스트 용이)

---

## 4. Authorization (가장 중요한 규칙)

childId 는 URL/요청 body 어디에서 오든 신뢰하지 않는다. 반드시 세션의 householdId 와 함께 조회한다.

```ts
// src/lib/auth.ts
authorizeChild(householdId, childId)  // 없으면 AppError
```

| 경로 | 검증 |
|---|---|
| `/kids/[childId]`, `/kids/[childId]/watch/[videoId]` | `requirePageChild()` → 남의 아이면 `/kids` 로 redirect |
| `/admin/children/[childId]` | 동일 |
| `POST /api/progress`, `POST /api/sessions` | `requireSessionUser()` → `authorizeChild()` → 400 |
| 아이 수정 / 학습 과정 변경 / 기록 초기화 (Server Action) | `requireSessionUser()` → `authorizeChild()` |
| WatchSession 갱신 | 세션의 `childId`/`videoId` 일치까지 재확인 |

플레이어 페이지는 추가로 "그 영상이 아이의 현재 학습 과정에 포함되어 있는지" 까지 확인한다.

---

## 5. 현재 영상 선택

```text
Child
 → ChildPlaylist(status=IN_PROGRESS) 의 Playlist  (없으면 가장 낮은 Level)
 → PlaylistVideo.sequence 순서
 → 그 아이의 VideoProgress
 → IN_PROGRESS → NOT_STARTED → 모두 완료
```

비활성(enabled=false) 영상은 후보에서 제외한다. 다음 영상도 같은 과정 안에서만 고른다.

---

## 6. 마이그레이션 (v1 → v2)

`prisma/migrations/20260828060356_multiuser_playlist/migration.sql`

1. 새 테이블 생성(User / Household / HouseholdMember / Child / Playlist / PlaylistVideo / ChildPlaylist)
2. 기존 `VideoProgress` 나 `WatchSession` 행이 있으면 **"우리 가족 (이전 데이터)" Household + "우리 아이" Child** 생성
3. 기존 진행/세션 행을 그 아이에게 연결하며 테이블 재구성(데이터 삭제 없음)
4. 더 이상 쓰지 않는 `parent_pin_hash` 설정 삭제

이 Household 는 구성원이 없으므로, **최초 회원가입한 사용자가 OWNER 로 인계받는다**(`signupUser()`).
따라서 v1에서 쌓은 학습 기록이 새 계정에서 그대로 이어진다.

---

## 7. 라우트

```text
/                         로그인 여부/아이 유무에 따라 분기
/login  /signup           부모 계정
/kids                     아이 선택 (아이 1명이면 바로 이동)
/kids/[childId]           아이 홈
/kids/[childId]/watch/[videoId]   플레이어
/admin                    가정 요약 (아이별 진행률/오늘 학습)
/admin/children           아이 추가·이름·활성화·학습 과정 지정
/admin/children/[childId] 아이 상세, 과정 변경, 과정별 기록 초기화
/admin/playlists          Level 1~4 커리큘럼 (읽기 전용)
/admin/videos             영상 카탈로그
/parent                   (구버전) → /login 리다이렉트
/api/progress /api/sessions  Player 저장 경로
```

---

## 8. 향후 PostgreSQL 이전 지점

지금은 SQLite 를 유지한다(Mac mini 단일 인스턴스, 파일 복사 백업). 아래 조건이 생기면 이전을 검토한다.

- 가정 수가 늘어 동시 쓰기가 잦아질 때 (SQLite 는 단일 writer)
- 여러 인스턴스/컨테이너에서 같은 DB 를 붙여야 할 때
- 시간대별 통계 등 무거운 집계 쿼리가 늘어날 때

이전 시 변경 지점은 `prisma/schema.prisma` 의 datasource, `DATABASE_URL`,
그리고 SQLite 에만 있는 마이그레이션 재작성(테이블 재구성 방식) 뿐이다.
애플리케이션 코드는 Prisma Client 로만 DB 에 접근하므로 수정이 필요 없다.
