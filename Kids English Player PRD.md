# Kids English Player PRD

- Version: v0.1
- Status: Draft
- Target: Local MVP
- Primary Runtime: Mac mini
- Primary User: 7세 어린이
- Administrator: 부모
- Development: Claude 기반 개발
- Deployment: 가정 내 로컬 환경

---

# 1. 배경

7세 아이에게 영어 영상을 주기적으로 보여주고 싶다.

YouTube 재생목록을 이용하면 영상을 순서대로 구성하는 것은 가능하지만 다음 사항을 관리하기 어렵다.

- 어떤 영상을 실제로 시청했는가
- 어디까지 시청했는가
- 오늘 무엇을 보았는가
- 전체 학습 과정에서 현재 어느 위치에 있는가
- 반복해서 본 영상은 무엇인가
- 부모가 다음 영상을 어떻게 관리할 것인가

따라서 YouTube 자체를 학습 관리 도구로 사용하는 대신, Mac mini에서 실행되는 별도의 웹 애플리케이션을 만들어 YouTube 영상을 학습 콘텐츠로 활용한다.

---

# 2. 제품 목표

핵심 목표는 다음과 같다.

> 부모가 선정한 YouTube 영어 영상을 아이가 정해진 순서대로 시청하고, 시스템이 시청 진행 상황을 자동으로 기록하는 단순한 영어 학습 웹을 만든다.

서비스가 해결해야 할 핵심 문제는 세 가지다.

1. 무엇을 볼 것인가
2. 어디까지 보았는가
3. 다음에 무엇을 볼 것인가

---

# 3. 핵심 사용자 시나리오

## 3.1 부모

부모는 YouTube 영상 URL을 등록한다.

```text
YouTube URL 등록
→ 제목/썸네일 확인
→ 학습 순서 지정
→ 영상 목록 저장
```

부모는 아이의 진행 상황을 확인한다.

```text
오늘 시청한 영상
→ 완료 여부
→ 시청 시간
→ 전체 진도
→ 최근 학습 기록
```

---

## 3.2 아이

아이는 복잡한 메뉴를 사용하지 않는다.

웹페이지에 들어가면 다음과 같이 보여준다.

```text
오늘 볼 영상

[ 썸네일 ]

English Episode 03

▶ 시작하기
```

영상을 재생하면 시스템이 시청 진행 상태를 저장한다.

영상 시청이 완료되면 다음과 같이 표시한다.

```text
잘 봤어요!

오늘 2개의 영상을 봤어요.

[ 다음 영상 보기 ]
```

다음 영상은 관리자가 지정한 순서에 따라 자동 결정한다.

---

# 4. MVP 범위

MVP에서는 다음 기능만 구현한다.

## 4.1 영상 등록

관리자는 YouTube URL을 입력하여 영상을 등록할 수 있다.

저장 항목:

- YouTube Video ID
- URL
- 제목
- 썸네일
- 학습 순서
- 활성화 여부
- 등록일

MVP에서는 제목과 썸네일을 자동으로 가져올 수 있으면 가져오고, 불가능하면 관리자가 직접 입력할 수 있도록 한다.

---

# 4.2 학습 목록

등록된 영상을 순서대로 보여준다.

예:

```text
01. Alphablocks Episode 1   완료
02. Alphablocks Episode 2   완료
03. Alphablocks Episode 3   진행 중
04. Alphablocks Episode 4   대기
05. Alphablocks Episode 5   대기
```

상태는 다음 세 가지를 기본으로 한다.

```text
NOT_STARTED
IN_PROGRESS
COMPLETED
```

---

# 4.3 YouTube 영상 재생

영상은 YouTube 페이지로 이동하지 않고 웹 애플리케이션 내부에서 재생한다.

YouTube Embed / IFrame Player 방식으로 구현한다.

시스템은 최소한 다음 이벤트를 감지한다.

- 재생 시작
- 일시정지
- 재생 종료
- 현재 재생 위치
- 전체 영상 길이

YouTube 영상을 다운로드하거나 별도로 저장하지 않는다.

---

# 4.4 시청 진행률 기록

영상 시청 중 일정 간격으로 현재 위치를 저장한다.

예:

```text
Video Duration: 600초
Current Position: 420초
Progress: 70%
```

기본 완료 기준:

```text
시청률 >= 90%
```

또는 YouTube Player의 영상 종료 이벤트가 발생한 경우 완료 처리한다.

완료 기준 값은 코드 내부 상수가 아니라 설정값으로 관리한다.

기본값:

```text
completionThreshold = 90
```

---

# 4.5 이어보기

영상을 중간까지 보고 종료한 경우 다음 접속에서 이어볼 수 있다.

예:

```text
Episode 03

지난번 06:43까지 봤어요.

[ 이어보기 ]
[ 처음부터 보기 ]
```

---

# 4.6 자동 다음 영상 선택

현재 영상이 완료되면 다음 학습 영상을 결정한다.

기본 규칙:

```text
학습 순서가 가장 빠른 NOT_STARTED 영상
```

진행 중인 영상이 있다면 새 영상보다 진행 중인 영상을 우선한다.

우선순위:

```text
IN_PROGRESS
→ NOT_STARTED
→ 모든 영상 완료
```

---

# 4.7 오늘의 학습

아이 화면에서는 전체 콘텐츠 목록보다 현재 해야 할 학습을 중심으로 보여준다.

홈 화면 예시:

```text
오늘의 영어

오늘 본 영상
2개

학습 시간
24분

다음 영상

[ Thumbnail ]

Alphablocks Episode 5

[ 이어서 보기 ]
```

---

# 4.8 학습 기록

영상 시청 시 학습 기록을 남긴다.

기록 예:

```text
2026-08-28

09:10 Episode 03 완료
09:23 Episode 04 완료
09:35 Episode 05 45% 시청
```

저장할 주요 정보:

- 날짜
- 영상
- 최초 재생 시간
- 마지막 재생 시간
- 마지막 재생 위치
- 누적 시청 시간
- 진행률
- 완료 여부
- 완료 시간

---

# 5. 화면 구성

MVP 화면은 최대한 단순하게 구성한다.

## 5.1 Child Home

URL 예:

```text
/
```

표시 정보:

- 오늘 날짜
- 오늘 시청한 영상 수
- 오늘 시청 시간
- 현재 영상
- 시작 / 이어보기 버튼

아이 화면에서는 관리 기능을 노출하지 않는다.

---

## 5.2 Player

URL 예:

```text
/watch/:videoId
```

구성:

```text
영상 제목

[ YouTube Player ]

진행률

████████░░ 82%

[ 처음부터 보기 ]
```

영상 종료 시:

```text
완료!

[ 다음 영상 보기 ]
```

---

## 5.3 Parent Dashboard

URL 예:

```text
/admin
```

표시 정보:

- 전체 영상 수
- 완료 영상 수
- 현재 영상
- 전체 진행률
- 오늘 시청 시간
- 최근 학습 기록

예:

```text
전체 진행률

12 / 50

██████░░░░ 24%
```

---

## 5.4 Video Management

URL 예:

```text
/admin/videos
```

기능:

- 영상 추가
- 영상 삭제
- 순서 변경
- 활성화 / 비활성화
- 진행 상태 확인

영상 목록:

| 순서 | 영상 | 상태 | 진행률 |
|---|---|---|---|
| 1 | Episode 01 | 완료 | 100% |
| 2 | Episode 02 | 완료 | 100% |
| 3 | Episode 03 | 진행 중 | 62% |
| 4 | Episode 04 | 대기 | 0% |

---

# 6. Parent Mode 보호

아이가 관리 화면에 쉽게 진입하지 못하도록 Child Mode와 Parent Mode를 구분한다.

MVP에서는 복잡한 사용자 인증 시스템은 만들지 않는다.

예:

```text
/admin
```

접근 시 간단한 Parent PIN을 입력한다.

예:

```text
4~6자리 PIN
```

PIN은 평문으로 저장하지 않는다.

---

# 7. 데이터 모델

MVP에서는 SQLite를 사용한다.

## Video

```text
id
youtube_video_id
youtube_url
title
thumbnail_url
duration_seconds
sequence
enabled
created_at
updated_at
```

---

## VideoProgress

```text
id
video_id
status

last_position_seconds
duration_seconds
progress_percent

watch_seconds

started_at
last_watched_at
completed_at

created_at
updated_at
```

status:

```text
NOT_STARTED
IN_PROGRESS
COMPLETED
```

---

## WatchSession

영상 시청 기록을 좀 더 정확하게 관리하기 위해 세션을 별도로 기록한다.

```text
id
video_id

started_at
ended_at

start_position_seconds
end_position_seconds

watch_seconds

created_at
```

---

## Settings

```text
key
value
```

예:

```text
completion_threshold = 90
parent_pin_hash = ...
```

---

# 8. 시청시간 계산

단순히 영상의 현재 위치 차이만으로 시청 시간을 계산하지 않는다.

예를 들어 사용자가

```text
1분
→ 9분
```

으로 seek한 경우 8분을 학습한 것으로 기록하면 안 된다.

따라서 실제 Player 재생 상태를 기준으로 시청 시간을 누적한다.

기본 개념:

```text
PLAYING 상태
→ 일정 주기로 watch_seconds 증가

PAUSED
BUFFERING
ENDED
→ 증가하지 않음
```

MVP에서는 초 단위의 절대적인 정확성보다 일관된 기록을 우선한다.

---

# 9. 진행률 계산

진행률은 기본적으로 다음 값을 사용한다.

```text
currentPosition / duration × 100
```

하지만 완료 이후 다시 영상을 처음부터 재생하더라도 상태가 NOT_STARTED로 돌아가면 안 된다.

상태 전환:

```text
NOT_STARTED
    ↓
IN_PROGRESS
    ↓
COMPLETED
```

COMPLETED는 자동으로 이전 상태로 돌아가지 않는다.

관리자만 진행 상태를 Reset할 수 있다.

---

# 10. 영상 순서

Video.sequence 값을 이용한다.

예:

```text
10
20
30
40
```

초기에는 Drag & Drop이 없어도 된다.

관리자가 위/아래 버튼으로 순서를 변경할 수 있으면 충분하다.

향후 Drag & Drop으로 확장한다.

---

# 11. 기술 방향

MVP는 하나의 Mac mini에서 운영하며 복잡한 분산 구조를 사용하지 않는다.

권장 구조:

```text
Browser
   ↓
Web Application
   ↓
SQLite
```

가능하면 Frontend와 Backend를 하나의 프로젝트로 구성한다.

권장 후보:

```text
Next.js
SQLite
Prisma
YouTube IFrame Player API
```

또는 동일한 목적을 달성하는 더 단순한 구성이 있다면 Claude가 제안할 수 있다.

중요한 기준은 프레임워크 자체가 아니라 다음이다.

- Mac mini에서 쉽게 실행
- 데이터가 로컬에 저장
- 백업이 쉬움
- 유지보수가 단순함
- Docker 의존성이 필수는 아님
- 필요하다면 Docker Compose 지원

---

# 12. 실행 환경

기본 실행 환경:

```text
Mac mini
```

Mac mini가 가정 내 서버 역할을 한다.

예:

```text
http://mac-mini.local:3000
```

같은 Wi-Fi에 연결된 다음 기기에서 접근할 수 있어야 한다.

- 태블릿
- 스마트폰
- 노트북

MVP에서 외부 인터넷을 통한 접속은 지원하지 않는다.

YouTube 영상 재생을 위한 인터넷 연결은 필요하다.

---

# 13. UX 원칙

7세 아이가 사용하는 화면이므로 다음 원칙을 따른다.

## Child UI

- 글자를 크게 표시
- 버튼을 크게 표시
- 선택지를 최소화
- 광고성 UI를 별도로 만들지 않음
- 관리 기능을 숨김
- 한 화면에서 가장 중요한 행동은 하나만 표시

기본 흐름:

```text
홈
↓
영상 보기
↓
완료
↓
다음 영상
```

---

# 14. MVP에서 하지 않는 것

다음 기능은 초기 버전에 구현하지 않는다.

- 자체 영상 스트리밍
- YouTube 영상 다운로드
- 영상 파일 저장
- AI 영어 평가
- 음성 인식
- 발음 평가
- 단어 시험
- 퀴즈
- 여러 아이 계정
- Google 로그인
- 외부 사용자 계정
- 모바일 앱
- 클라우드 서버
- Recommendation AI
- 복잡한 학습 알고리즘
- YouTube 전체 검색

---

# 15. 향후 확장

MVP 완료 후 다음 기능을 검토한다.

## Phase 2

YouTube Playlist 가져오기

```text
Playlist URL
→ 영상 목록 Import
→ 내부 학습 목록 생성
```

---

## Phase 2

학습 목표 설정

예:

```text
하루 2개 영상

또는

하루 20분
```

---

## Phase 2

Calendar

```text
8월

월 화 수 목 금 토 일

✓  ✓  ✓     ✓
```

날짜별 학습 여부를 시각적으로 확인한다.

---

## Phase 3

여러 학습 과정

예:

```text
Alphablocks
Numberblocks
Peppa Pig
Phonics
Story
```

---

## Phase 3

반복 학습

관리자가 특정 영상을 다시 학습 대상으로 지정한다.

```text
COMPLETED
→ REVIEW
```

---

## Phase 3

간단한 학습 활동

영상 종료 후:

```text
오늘 나온 단어

apple
red
happy
```

등을 부모가 미리 등록할 수 있도록 한다.

AI 기능은 이 단계 이후 검토한다.

---

# 16. 핵심 성공 기준

MVP 완료 기준은 다음과 같다.

### 영상 관리

- YouTube URL을 등록할 수 있다.
- 영상을 순서대로 관리할 수 있다.
- 영상을 활성화/비활성화할 수 있다.

### 영상 재생

- 웹 내부에서 YouTube 영상을 재생할 수 있다.
- 재생 위치를 확인할 수 있다.
- 영상 종료를 감지할 수 있다.

### 진행 상태

- NOT_STARTED / IN_PROGRESS / COMPLETED 상태가 기록된다.
- 시청 진행률이 저장된다.
- 브라우저를 종료했다가 다시 열어도 진행 상태가 유지된다.
- 이어보기가 가능하다.

### 순차 학습

- 현재 영상 완료 후 다음 영상을 찾을 수 있다.
- 진행 중인 영상이 있으면 해당 영상을 우선한다.

### 기록

- 오늘 본 영상을 확인할 수 있다.
- 최근 학습 기록을 확인할 수 있다.
- 누적 시청 시간을 확인할 수 있다.

### 운영

- Mac mini에서 실행할 수 있다.
- 같은 LAN의 다른 기기에서 접근할 수 있다.
- SQLite 파일을 복사하는 방식으로 백업할 수 있다.

---

# 17. MVP 핵심 플로우

전체 시스템의 가장 중요한 흐름은 다음 하나다.

```text
부모가 영상 등록
        ↓
영상 순서 지정
        ↓
아이가 Home 접속
        ↓
현재 학습 영상 표시
        ↓
영상 재생
        ↓
시청 상태 저장
        ↓
90% 이상 시청
        ↓
COMPLETED
        ↓
다음 영상 선택
        ↓
학습 기록 저장
```

이 흐름이 안정적으로 동작하는 것을 MVP의 최우선 목표로 한다.

---

# 18. 개발 원칙

Claude는 기능을 확장하기보다 먼저 위 핵심 플로우를 완성해야 한다.

우선순위:

```text
1. 영상 등록
2. 영상 목록
3. Player
4. 진행률 기록
5. 완료 판정
6. 다음 영상 선택
7. 이어보기
8. Parent Dashboard
9. UI 개선
```

초기 구현에서는 불필요한 추상화와 복잡한 아키텍처를 피한다.

다음 원칙을 따른다.

- Local First
- Single User
- Simple Architecture
- SQLite as SSOT
- 기능보다 학습 기록의 정확성을 우선
- 구현되지 않은 기능을 임의로 추가하지 않음

---

# 19. Claude 첫 작업

Claude는 바로 전체 기능 구현을 시작하지 않는다.

먼저 이 PRD를 분석하고 다음 문서를 작성한다.

```text
docs/ARCHITECTURE.md
docs/IMPLEMENTATION_PLAN.md
```

`ARCHITECTURE.md`에는 다음을 포함한다.

- 기술 스택
- 프로젝트 구조
- 주요 컴포넌트
- 데이터 흐름
- YouTube Player 연동 방법
- SQLite 데이터 구조
- Mac mini 실행 구조

`IMPLEMENTATION_PLAN.md`에는 다음을 포함한다.

- 구현 Phase
- Phase별 변경 파일
- 테스트 방법
- 완료 조건
- 예상 위험요소

계획 작성 시 PRD 범위를 임의로 확대하지 않는다.

---

# 20. 한 문장 정의

> Kids English Player는 부모가 선정한 YouTube 영어 영상을 아이가 정해진 순서대로 시청하고, Mac mini가 시청 진행률과 학습 이력을 자동으로 관리하는 로컬 영어 학습 웹이다.