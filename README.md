# Kids English Player V2

부모가 검증된 영어 영상 **Content Library**에서 아이에게 맞는 Level과 Channel을 고르고,
아이는 **추천 · 자유 탐색 · Auto Play**로 영어 콘텐츠를 보는 가정용 웹 서비스다.
시청 진행률과 학습 기록은 아이별로 자동 저장된다.

- 부모: Library 탐색 → 아이 Collection 구성 → 허용 Level·선호 Channel 지정 → Dashboard 확인
- 아이: 이어보기 · 오늘 추천 · 원하는 영상 고르기(Level/Channel) · 계속 틀어놓기
- 데이터: SQLite 파일 하나 (`data/app.db`)

---

## 기술 스택

```text
Next.js 16 (App Router, Server Components / Server Actions)
TypeScript strict
Prisma 6 + SQLite
YouTube IFrame Player API
Vitest (단위 + 통합)
Docker Compose
```

---

## 설치

```bash
npm install
cp .env.example .env    # 값 수정
```

### 환경 변수

| 변수 | 설명 | 예시 |
|---|---|---|
| `DATABASE_URL` | SQLite 파일 위치. `prisma/schema.prisma` 기준 상대 경로 | `file:../data/app.db` |
| `SESSION_SECRET` | 로그인 세션 쿠키 서명 키. `openssl rand -hex 48` 로 생성 | `9f3c...` |
| `COOKIE_SECURE` | HTTPS 로 서비스할 때만 `true`. LAN(HTTP)이면 비워 둔다 | `false` |

`.env` 는 커밋하지 않는다. 비밀번호는 scrypt 해시로만 저장된다.

### DB migration / seed

```bash
npm run db:migrate    # 개발: migration 생성 및 적용
npm run db:deploy     # 운영: 기존 migration 적용만
npm run db:seed       # Content Library(Channel 6개 · 영상 31편) 등록
npm run db:reset      # 개발 DB 초기화 (데이터 삭제, 주의)
```

seed 는 외부 네트워크를 호출하지 않으므로 오프라인에서도 실패하지 않으며, 여러 번 실행해도 안전하다.
부모가 직접 등록한 영상과 Collection 은 seed 가 건드리지 않는다.

---

## 실행

### 개발

```bash
npm run dev           # http://localhost:3200
```

### Production build

```bash
npm run build
npm start             # 0.0.0.0:3200 바인딩
```

### Docker (Mac mini 등 상시 실행)

```bash
cp .env.example .env  # SESSION_SECRET 설정
docker compose up -d --build
docker compose logs -f
```

컨테이너는 기동 시 `prisma migrate deploy` 와 Content Library seed 를 실행한 뒤 서버를 띄운다.
DB 파일은 호스트의 `./data/app.db` 에 남는다(볼륨 마운트).

중지 / 재시작:

```bash
docker compose down
docker compose up -d
```

---

## LAN 접속

서버 IP 를 확인한 뒤 같은 Wi-Fi 기기에서 접속한다.

```bash
ipconfig getifaddr en0     # macOS 유선
ipconfig getifaddr en1     # macOS 무선
```

```text
http://<server-ip>:3200
http://<hostname>.local:3200
```

> 아이 화면도 부모 로그인 세션 안에서 동작한다. 아이가 쓰는 기기에 부모 계정으로 한 번 로그인해
> 두고 `/kids` 를 즐겨찾기 해 두면 된다. 외부(인터넷) 공개가 필요 없다면 공유기 포트포워딩은 열지 않는 것을 권장한다.

---

## 처음 사용 흐름

```text
/signup   부모 계정 만들기 (이메일 · 비밀번호 · 이름 · 첫 아이 이름)
   ↓
/admin/children   아이 추가, 아이별 허용 Level 범위와 선호 Channel 지정
   ↓
/library   Channel · Level · Category · 검색으로 영상을 찾아 아이 Collection에 담기
   ↓
/collections   숨기기 · 순서 변경 · YouTube 주소로 직접 등록
   ↓
/kids   아이 선택 → 이어보기 / 오늘 추천 / 원하는 영상 찾기 / 계속 틀어놓기
   ↓
/admin   오늘 학습 시간, 아이별 진행률, 최근 시청 확인
```

---

## 주요 route

| URL | 화면 |
|---|---|
| `/intro` | 서비스 소개 (공개) |
| `/signup`, `/login` | 부모 계정 가입 / 로그인 |
| `/admin` | 부모 Dashboard — 아이별 진행·오늘 학습·최근 시청·완료 기준 설정 |
| `/admin/children` | 아이 추가/이름/활성화, 허용 Level·선호 Channel |
| `/admin/children/[childId]` | 아이 상세 — 진행률, 최근 시청, Collection, 볼 수 있는 영상 |
| `/library` | Content Library — Channel/Level/Category/검색, Collection에 담기 |
| `/collections` | My Collection — 숨기기·순서·빼기, YouTube 직접 등록 |
| `/kids` | 아이 선택 |
| `/kids/[childId]` | 아이 Home — 이어보기 · 오늘 추천 · 좋아하는 Channel |
| `/kids/[childId]/browse` | 영상 찾기 — Level / Channel 필터 |
| `/kids/[childId]/watch/[videoId]` | Player |
| `/kids/[childId]/autoplay` | Auto Play 설정 및 재생 |

API: `POST /api/sessions`, `POST /api/progress`, `POST /api/autoplay/next`, `POST /api/autoplay/stop`

---

## DB 백업

SQLite 파일 하나만 복사하면 된다.

```bash
# 실행 중에도 안전하게 백업
sqlite3 data/app.db ".backup 'backup/app-$(date +%Y%m%d).db'"

# 또는 중지 후 복사
docker compose down
cp data/app.db ~/Backup/app-$(date +%Y%m%d).db
docker compose up -d
```

복구는 `data/app.db` 를 백업 파일로 교체한 뒤 재시작한다.

---

## 검사 / 테스트

```bash
npm test         # Vitest (단위 + 통합)
npm run lint     # ESLint
npm run typecheck
npm run build
```

---

## 알아두면 좋은 동작

- Level 은 학습 경로가 아니라 **영상의 난이도 속성**이다. `Level 3 + Caillou` 처럼 자유롭게 조합된다.
- 아이가 볼 수 있는 영상 = 허용 Level 범위 + 선호 Channel + Collection에 담은 영상 − Collection에서 숨긴 영상.
- 완료 기준은 기본 90%이며 `/admin` 에서 바꾼다. YouTube 재생 종료(ENDED)도 완료로 처리한다.
- 시청 시간은 실제 재생 중 흐른 시간만 쌓인다. 앞으로 건너뛰기(seek)로는 늘어나지 않는다.
- 재생하지 않고 영상 화면만 열었다 나가면 기록이 남지 않는다.
- Auto Play로 본 영상도 일반 재생과 같은 진행률·시청 기록에 남는다.
- 부모가 직접 등록한 영상은 그 가정에서만 보인다(공용 Library를 바꾸지 않는다).
