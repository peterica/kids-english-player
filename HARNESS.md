# Kids English Player — Content Library Harness

## 1. 목적

이 하네스는 Kids English Player의 Content Library를 반복적으로 확장하기 위한 작업 루프를 정의한다.

역할을 명확히 분리한다.

```text
Claude
→ 현재 프로젝트의 실제 Content Library 상태 추출
→ MD Inventory 생성
→ 데이터 사실만 보고

User
→ Claude가 생성한 MD를 ChatGPT에 전달

ChatGPT
→ Content Manager 역할
→ 현재 구성 분석
→ Level / Channel / Category 편중 분석
→ 외부 콘텐츠 조사
→ 확장 후보 선정
→ 추가/수정 지시문 생성

Claude
→ 승인된 확장안만 프로젝트에 반영
→ 다시 현재 Library MD 생성
```

핵심 원칙:

> Claude는 현재 상태를 정확히 추출하고,
> ChatGPT는 콘텐츠 전략과 확장 판단을 담당한다.

---

# 2. 반복 사이클

```text
[STEP 1]
Claude에게 현재 Library Export 요청

        ↓

[STEP 2]
CURRENT_CONTENT_LIBRARY.md 생성

        ↓

[STEP 3]
사용자가 해당 MD를 ChatGPT에 전달

        ↓

[STEP 4]
ChatGPT가 Content Manager로 분석

- 현재 총 영상 수
- Level 분포
- Channel 분포
- Category 분포
- 중복
- 편중
- 부족 영역
- 신규 Channel 후보
- 신규 영상 후보

        ↓

[STEP 5]
ChatGPT가 CONTENT_EXPANSION_PLAN.md 작성

        ↓

[STEP 6]
사용자가 해당 Plan을 Claude에게 전달

        ↓

[STEP 7]
Claude가 콘텐츠만 반영

        ↓

[STEP 8]
test / lint / typecheck / build

        ↓

[STEP 9]
다시 STEP 1
```

이 사이클을 반복한다.

---

# 3. SSOT 역할

## Runtime / Project SSOT

실제 서비스 상태의 SSOT는 프로젝트 DB와 seed/source다.

Claude는 여기에서 사실을 추출한다.

## Inventory MD

`CURRENT_CONTENT_LIBRARY.md`는 특정 시점의 Snapshot이다.

이 파일은 분석용이며 Runtime SSOT가 아니다.

## Content Strategy

콘텐츠 선정, Level 판단, Channel 확장, Category 균형 판단은 ChatGPT Content Manager가 담당한다.

---

# 4. Claude의 역할

Claude는 Export 단계에서 다음만 수행한다.

```text
DB / seed 확인
현재 Content Library 추출
분포 계산
중복 탐지
MD 생성
```

Export 단계에서는 다음을 하지 않는다.

```text
웹 조사
새 영상 추가
Level 임의 변경
Channel 임의 생성
Category 임의 변경
기존 영상 삭제
UI 변경
schema 변경
```

즉, Claude는 **현황 수집기** 역할이다.

---

# 5. ChatGPT의 역할

ChatGPT는 사용자가 `CURRENT_CONTENT_LIBRARY.md`를 전달하면 Content Manager로 동작한다.

분석 기준:

```text
Level 1~5 균형
Channel 다양성
Category 다양성
아이의 선택 폭
각 Level에서 선택 가능한 Channel 수
스토리/Phonics/노래 비율
긴 compilation 여부
중복
영상 길이
채널 편중
Level 난이도 적절성
```

필요하면 공식 YouTube Channel과 제작사/배급사 자료를 추가 조사한다.

확장 결과는 Claude가 바로 반영할 수 있는 MD 지시문으로 만든다.

---

# 6. 기본 Level 기준

```text
Level 1
매우 쉬움
반복
행동
기본 어휘
노래
짧은 Story

Level 2
Phonics
CVC
짧은 문장
간단한 Story

Level 3
Caillou 기준
느리고 명확한 일상 대화
가족 / 학교 / 친구 / 감정

Level 4
Peppa Pig 기준
빠른 turn-taking
여러 등장인물
자연스러운 가족/친구 대화

Level 5
Bluey 기준
자연스러운 속도
생략
유머
감정
암묵적 의미
```

이 Level은 공식 CEFR이 아니라 Kids English Player의 내부 상대 난이도다.

---

# 7. 기본 Channel 방향

초기 기준 Channel 후보:

```text
Super Simple
Caitie's Classroom
Alphablocks
Pocoyo
Daniel Tiger
Caillou
Peppa Pig
Bluey
```

새 Channel은 무조건 추가하지 않는다.

다음 조건을 본다.

```text
공식/신뢰 가능한 채널인가?
영어 음성인가?
7세 전후 아이에게 적합한가?
기존 Channel과 다른 역할이 있는가?
특정 Level 공백을 채우는가?
충분한 단일 에피소드가 있는가?
```

---

# 8. 기본 Category

현재 프로젝트 enum/schema를 우선한다.

대표 개념:

```text
STORY
PHONICS
SONG
DAILY_LIFE
FEELINGS
SCHOOL
FAMILY
```

Category 확장은 필요한 경우에만 한다.

---

# 9. 파일 규칙

Claude Export 결과:

```text
docs/content/CURRENT_CONTENT_LIBRARY.md
```

ChatGPT 분석 결과 권장:

```text
CONTENT_LIBRARY_REVIEW.md
CONTENT_EXPANSION_PLAN.md
```

Claude 반영 결과:

```text
docs/content/CONTENT_EXPANSION_RESULT.md
docs/content/CURRENT_CONTENT_LIBRARY.md
```

반복할 때 항상 `CURRENT_CONTENT_LIBRARY.md`를 최신 Snapshot으로 갱신한다.

---

# 10. 반복 시 사용자 동작

가장 단순한 사용법:

### 1. Claude

```text
task/01_EXPORT_CURRENT_LIBRARY/01_EXPORT_CURRENT_LIBRARY.md 를 읽고 실행해.
```

### 2. 사용자

Claude가 만든:

```text
docs/content/CURRENT_CONTENT_LIBRARY.md
```

를 ChatGPT에 업로드한다.

### 3. ChatGPT

사용자:

```text
현재 Content Library야.
Content Manager로 검토하고 다음 확장안을 만들어줘.
```

### 4. Claude

ChatGPT가 만든 확장 지시 MD를 프로젝트 root에 넣고:

```text
이 MD를 읽고 Content Library만 반영해.
```

### 5. 다시 Export

```text
commands/01_EXPORT_CURRENT_LIBRARY.md 를 다시 실행해.
```

---

# 11. 운영 원칙

콘텐츠 확장은 작은 Batch로 반복한다.

권장:

```text
1회 확장
10~30개 정도

→ 검토
→ 실제 아이 사용
→ 다시 확장
```

한 번에 수백 개를 넣지 않는다.

이유:

```text
난이도 품질 확인
Embed 실패 확인
아이 선호 확인
채널 편중 확인
실사용 피드백 반영
```

---

# 12. 절대 원칙

```text
기존 사용자 Progress 삭제 금지
Collection 삭제 금지
WatchSession 삭제 금지
Video ID 재생성 금지
Content Library 확장을 위해 DB reset 금지
비공식 re-upload 남발 금지
영상 수만 채우기 금지
검증하지 않은 Embed를 VERIFIED로 기록 금지
```

---

# 13. 하네스의 목표

이 하네스는 자동으로 콘텐츠를 무한 추가하는 시스템이 아니다.

목표는:

```text
현재 상태를 정확히 본다
→ 부족한 부분만 조사한다
→ 작은 Batch로 추가한다
→ 아이가 실제로 사용한다
→ 다시 현재 상태를 본다
```

라는 반복 가능한 Content Management Loop를 만드는 것이다.
