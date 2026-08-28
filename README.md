# Kids English Player

부모가 고른 YouTube 영어 영상을 아이가 정해진 순서대로 보고, 시청 진행률과 학습 기록이
자동으로 저장되는 가정용(로컬) 웹 애플리케이션이다. Mac mini 한 대에서 실행하고 같은 Wi-Fi의
태블릿·스마트폰·노트북에서 접속한다.

- 아이 화면: 지금 볼 영상 1개와 큰 버튼 하나
- 부모 화면: PIN 보호, 영상 등록/순서 관리, 학습 현황
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
| `PARENT_PIN` | 부모 모드 초기 PIN(숫자 4~6자리). seed 또는 최초 로그인 시 해시로 저장된다 | `1234` |
| `SESSION_SECRET` | 부모 세션 쿠키 서명 키. 운영 시 임의의 긴 문자열로 교체 | `k9d...` |

`.env` 는 커밋하지 않는다. 실제 PIN 은 `.env` 에만 둔다.

### DB 초기화 / Seed

```bash
npm run db:migrate    # 개발: migration 생성 및 적용
npm run db:deploy     # 운영: 기존 migration 적용만
npm run db:seed       # 개발용 샘플 영상 3건 + 완료 기준 + PIN 해시
npm run db:reset      # 개발 DB 초기화 (데이터 삭제됨, 주의)
```

seed 가 넣는 영상은 **개발용 샘플**(제목 앞에 `[샘플]`)이며 실제 학습 콘텐츠가 아니다.
부모가 `/admin/videos` 에서 실제 영상으로 교체해 사용한다. seed 는 이미 영상이 있으면 건너뛴다.

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
cp .env.example .env   # PARENT_PIN, SESSION_SECRET 설정
docker compose up -d --build
docker compose logs -f
```

컨테이너는 기동 시 `prisma migrate deploy` 를 실행한 뒤 서버를 띄운다.
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
`.env` 와 `data/` 는 동기화 대상에서 제외해 서버의 PIN·학습 데이터를 보존한다.

```bash
rsync -az --delete \
  --exclude 'node_modules/' --exclude '.next/' --exclude 'data/' --exclude '.env' \
  ./ peterseo@<mac-mini-host>:/Users/peterseo/workspace/kids-english-player/

ssh peterseo@<mac-mini-host> \
  'docker compose up -d --build'
```

> 외부 노출 시 주의: 이 앱에는 아이용 화면 인증이 없다. `/admin` 만 PIN 으로 보호된다.
> 외부 공개가 필요 없다면 포트포워딩을 닫고 LAN 안에서만 사용하는 것을 권장한다.

macOS 방화벽이 켜져 있으면 `시스템 설정 → 네트워크 → 방화벽 → 옵션`에서 Node/Docker 의 수신 연결을 허용한다.

---

## 주요 URL

| URL | 화면 |
|---|---|
| `/` | 아이 홈 — 오늘 볼 영상 |
| `/watch/<id>` | 플레이어 |
| `/parent` | 부모 PIN 입력 |
| `/admin` | 부모 대시보드 (진행률, 오늘 학습, 최근 기록, 완료 기준/PIN 변경) |
| `/admin/videos` | 영상 관리 (등록/제목/순서/활성화/진행 초기화/삭제) |

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
- 한 번 완료된 영상은 다시 봐도 완료 상태가 유지된다. 되돌리려면 `/admin/videos` 의 "진행 초기화"를 사용한다.
- 학습 시간은 재생 중 실제로 흐른 시간만 누적한다. 앞으로 건너뛰기(seek)로 시간이 늘지 않는다.
- 진행 상태는 재생 중 10초마다, 그리고 일시정지·종료·탭 닫기 시점에 저장된다.
- 영상 페이지를 열기만 하고 재생하지 않으면 학습 기록이 생기지 않는다.
