# Kids English Player

부모가 고른 YouTube 영어 영상을 아이가 정해진 순서대로 보고, 시청 진행률과 학습 기록이
자동으로 저장되는 가정용(로컬) 웹 애플리케이션이다. Mac mini 한 대에서 실행하고 같은 Wi-Fi의
태블릿·스마트폰·노트북에서 접속한다.

- 부모 계정(이메일/비밀번호)으로 가정을 만들고, 아이를 여러 명 등록할 수 있다
- 아이마다 학습 과정(Level 1~4)을 따로 지정하고, 진행률·학습 기록도 아이별로 분리된다
- 아이 화면: 지금 볼 영상 1개와 큰 버튼 하나
- 부모 화면: 아이별 진도, 학습 과정 변경, 영상 카탈로그 관리
- 데이터: SQLite 파일 하나 (`data/app.db`)

---

## 요구 환경

- Node.js 20 이상 (개발 확인 환경: v24)
- npm 10 이상
- Docker / Docker Compose (Mac mini 상시 실행용, 선택)
- YouTube 영상 재생을 위한 인터넷 연결

---

## 설치

```bash
npm install
cp .env.example .env   # 값 수정
```

### 환경 변수

| 변수 | 설명 | 예시 |
|---|---|---|
| `DATABASE_URL` | SQLite 파일 위치. `prisma/schema.prisma` 기준 상대 경로 | `file:../data/app.db` |
| `SESSION_SECRET` | 로그인 세션 쿠키 서명 키. `openssl rand -hex 48` 로 생성해 교체 | `k9d...` |
| `COOKIE_SECURE` | HTTPS 로 서비스할 때만 `true`. LAN(HTTP) 접속이면 비워 둔다 | `false` |

`.env` 는 커밋하지 않는다. 비밀번호는 scrypt 해시로 DB 에만 저장된다.

### DB 초기화 / Seed

```bash
npm run db:migrate    # 개발: migration 생성 및 적용
npm run db:deploy     # 운영: 기존 migration 적용만
npm run db:seed       # 커리큘럼(Level 1~4, 48편) + 완료 기준 등록
npm run db:reset      # 개발 DB 초기화 (데이터 삭제됨, 주의)
```

seed 는 `task/playlist/LEVEL_{1..4}_PLAYLIST.md` 기준으로 만든 커리큘럼을 등록한다.
이미 등록된 영상은 YouTube 영상 ID 기준으로 재사용하며 제목을 덮어쓰지 않는다. 여러 번 실행해도 안전하다.
Docker 로 실행하면 컨테이너가 기동할 때 migration 과 seed 를 자동으로 수행한다.

### 처음 사용 흐름

```text
/signup  부모 계정 만들기 (이메일 / 비밀번호 / 부모 이름 / 첫 아이 이름)
   ↓
/admin/children  아이 추가, 아이마다 학습 과정(Level) 선택
   ↓
/kids  아이 선택 → 아이 홈에서 오늘 볼 영상 재생
   ↓
/admin  아이별 진도와 오늘 학습 시간 확인
```

아이 계정은 만들지 않는다. 부모가 로그인한 기기에서 아이가 `/kids` 로 들어가 사용한다.

### 기존 단일 아이 데이터 migration

v1(단일 아이) DB 가 이미 있다면 `npm run db:deploy` 만 실행하면 된다.

- 기존 진행/시청 기록은 **"우리 가족 (이전 데이터)" 가정의 "우리 아이"** 로 옮겨진다(삭제 없음)
- 이 가정은 구성원이 없으므로, **최초로 회원가입한 계정이 자동으로 인계**받아 기존 기록을 이어서 본다
- 아이 이름은 `/admin/children` 에서 바꾸면 된다

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

### Mac mini 상시 실행 (Docker)

```bash
ssh peterseo@<mac-mini-host>
cd /Users/peterseo/workspace/kids-english-player
cp .env.example .env   # SESSION_SECRET 설정 (openssl rand -hex 48)
docker compose up -d --build
docker compose logs -f
```

컨테이너는 기동 시 `prisma migrate deploy` 와 커리큘럼 seed 를 실행한 뒤 서버를 띄운다.
DB 파일은 호스트의 `./data/app.db` 에 저장된다(볼륨 마운트).

중지 / 재시작:

```bash
docker compose down
docker compose up -d
```

---

## LAN / 외부 접속

Mac mini 의 IP 를 확인한다.

```bash
ipconfig getifaddr en0     # 유선
ipconfig getifaddr en1     # 무선
```

같은 Wi-Fi 의 기기에서 접속한다.

```text
http://<mac-mini-ip>:3200          LAN
http://<mac-mini-host>.local:3200 mDNS
```

공유기 포트포워딩(3200)이 설정되어 있어 외부에서도 접속할 수 있다.

```text
http://<mac-mini-host>:3200
```

Mac mini 로 원격 배포할 때는 노트북에서 다음처럼 동기화한 뒤 재기동한다.
`.env` 와 `data/` 는 동기화 대상에서 제외해 서버의 계정·학습 데이터를 보존한다.

```bash
rsync -az --delete \
  --exclude 'node_modules/' --exclude '.next/' --exclude 'data/' --exclude '.env' \
  ./ peterseo@<mac-mini-host>:/Users/peterseo/workspace/kids-english-player/

ssh peterseo@<mac-mini-host> \
  'docker compose up -d --build'
```

> 외부 노출 시 주의: 모든 화면이 부모 로그인 뒤에 있지만, 로그인한 기기를 아이가 그대로 사용하는 구조다.
> 외부 공개가 필요 없다면 포트포워딩을 닫고 LAN 안에서만 사용하는 것을 권장한다.

macOS 방화벽이 켜져 있으면 `시스템 설정 → 네트워크 → 방화벽 → 옵션`에서 Node/Docker 의 수신 연결을 허용한다.

---

## 주요 URL

| URL | 화면 |
|---|---|
| `/signup`, `/login` | 부모 계정 가입 / 로그인 |
| `/kids` | 아이 선택 (아이가 1명이면 바로 아이 홈) |
| `/kids/<childId>` | 아이 홈 — 오늘 볼 영상 |
| `/kids/<childId>/watch/<videoId>` | 플레이어 |
| `/admin` | 부모 대시보드 — 아이별 진도·오늘 학습 시간, 완료 기준 설정 |
| `/admin/children` | 아이 추가/이름/활성화, 아이별 학습 과정(Level) 지정 |
| `/admin/children/<childId>` | 아이 상세 — 과정 변경, 영상별 진행, 과정 기록 초기화 |
| `/admin/playlists` | Level 1~4 커리큘럼 보기 (읽기 전용) |
| `/admin/videos` | 영상 카탈로그 (등록/제목/정렬/활성화/삭제) |

영상 등록은 다음 주소 형식을 지원한다.

```text
https://www.youtube.com/watch?v=VIDEO_ID
https://youtu.be/VIDEO_ID
https://www.youtube.com/shorts/VIDEO_ID
https://www.youtube.com/embed/VIDEO_ID
```

제목은 YouTube oEmbed 로 자동 조회하며, 실패하면 직접 입력하거나 목록에서 수정할 수 있다.

---

## 데이터 백업

SQLite 파일 하나만 복사하면 된다.

```bash
# 실행 중에도 안전하게 백업
sqlite3 data/app.db ".backup 'backup/app-$(date +%Y%m%d).db'"

# 또는 서비스 중지 후 단순 복사
docker compose down
cp data/app.db ~/Backup/app-$(date +%Y%m%d).db
docker compose up -d
```

복구는 `data/app.db` 를 백업 파일로 교체한 뒤 재시작하면 된다.

---

## 검사 / 테스트

```bash
npm test         # Vitest 단위 테스트
npm run lint     # ESLint
npm run typecheck
npm run build
```

---

## 알아두면 좋은 동작

- 완료 기준은 기본 90% 이며 `/admin` 에서 변경한다. YouTube 재생 종료(ENDED) 이벤트도 완료로 처리한다.
- 한 번 완료된 영상은 다시 봐도 완료 상태가 유지된다. 되돌리려면 `/admin/children/<childId>` 에서 해당 과정의 "기록 초기화"를 사용한다(그 아이의 기록만 지워진다).
- 진행률·시청 시간·학습 기록은 아이별로 완전히 분리된다. 다른 가정의 데이터는 서버에서 차단된다.
- 학습 시간은 재생 중 실제로 흐른 시간만 누적한다. 앞으로 건너뛰기(seek)로 시간이 늘지 않는다.
- 진행 상태는 재생 중 10초마다, 그리고 일시정지·종료·탭 닫기 시점에 저장된다.
- 영상 페이지를 열기만 하고 재생하지 않으면 학습 기록이 생기지 않는다.
