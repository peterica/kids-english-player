# 기여 안내

개인 프로젝트라 대응이 느릴 수 있다. 그래도 버그 제보와 개선은 환영한다.

## 개발 환경

```bash
# Node 24 (vitest·Next.js 요구사항)
node -v          # v24.x

npm ci
cp .env.example .env
sed -i '' "s|change-me-to-a-long-random-string|$(openssl rand -hex 48)|" .env

npm run db:migrate
npm run db:seed
npm run dev      # http://localhost:3200
```

써보기만 할 거라면 Node 없이 `docker compose up -d --build` 로 충분하다
([README](README.md#빠른-시작-docker)).

## PR 전에 통과해야 하는 것

네 가지 모두 통과해야 한다.

```bash
npm test           # 170개
npm run typecheck
npm run lint
npm run build
```

- **테스트를 지우거나 `skip` / `only` 로 통과시키지 않는다.** 기대값이 틀렸다면 그 이유를 PR 에 적는다.
- 동작을 바꾸면 테스트를 함께 바꾸거나 추가한다.

## 코드 규칙

- TypeScript strict. `any` 를 새로 들이지 않는다
- 주석은 **왜** 그렇게 했는지를 적는다. 무엇을 하는지는 코드가 말한다
- 주변 코드의 명명·구조를 따른다. 새 패턴을 혼자 들이지 않는다
- 새 의존성은 가급적 추가하지 않는다. 필요하면 PR 에 이유를 적는다

## DB 를 바꿀 때

데이터를 지우지 않는 전진 마이그레이션만 받는다.

- 기존 migration 파일을 고쳐 쓰지 않는다. 새 migration 을 추가한다
- 컬럼을 지우거나 이름을 바꾸면 **기존 값을 옮기는 SQL 을 함께 넣는다**
- SQLite 라 테이블 재작성이 필요한 경우가 많다. 적용 전에 표본 데이터로 검증한 결과를 PR 에 적는다
- `npm run db:reset` 결과를 근거로 삼지 않는다. 그건 데이터를 지운다

## 콘텐츠(영상 목록) 관련

`prisma/seed-content.ts` 는 이 프로젝트의 큐레이션 데이터다.

- **영상 대량 추가 PR 은 먼저 이슈로 논의**해 주기 바란다. 기준(Level·Category 판단)이 사람마다 다르다
- 재생 불가·삭제된 영상, 잘못된 Level 제보는 언제든 환영한다. 이슈로 남겨 주면 된다
- 새 채널을 제안할 때는 임베드가 허용된 **공식 채널**인지 확인해 주기 바란다
  ([콘텐츠 정책](docs/CONTENT_POLICY.md))

## 보안 문제

공개 이슈 대신 [SECURITY.md](SECURITY.md) 의 절차를 따라 주기 바란다.

## 문서

한국어가 기본이다. 영어 번역 PR 도 환영하지만, 한국어 문서와 함께 갱신해 주기 바란다.
