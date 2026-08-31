# Kids English Player — Concept Review & V2 Direction

- Date: 2026-08-28
- Status: Concept Review
- Purpose: 현재까지의 구현과 외부 사례에서 얻은 인사이트를 정리하고, 다음 버전의 제품 방향을 정의한다.

## 1. 현재 프로젝트의 의미

현재 Kids English Player는 다음 핵심 아이디어를 검증하기 위한 MVP로 시작했다.

```text
부모가 YouTube 영어 영상을 등록
→ 아이가 순서대로 시청
→ 진행률과 시청시간 기록
→ 완료 여부 판단
→ 다음 영상 자동 선택
→ 부모가 학습 기록 확인
```

이 구조를 통해 YouTube IFrame 재생, 진행률 저장, 이어보기, 완료 판정, 시청시간 누적, 부모 Dashboard, 아이별 진행 관리, Level/Playlist 기반 학습 순서를 검증했다.

즉, 현재 프로젝트는 실패한 버전이 아니라 **핵심 기술과 사용 흐름을 검증한 Concept v1**이다.

## 2. 현재 구조에서 발견한 한계

현재는 아이가 하나의 Level 또는 Playlist 흐름에 강하게 묶인다.

하지만 실제 아이는 다음과 같이 행동할 수 있다.

```text
Level 1이 너무 쉽다.
Caillou는 좋아하지만 Pocoyo는 싫다.
Peppa Pig만 골라 보고 싶다.
오늘은 다른 Level 영상을 보고 싶다.
```

따라서 `정해진 Playlist 순서`가 핵심이 되면 아이의 선호와 실제 수준을 반영하기 어렵다.

## 3. 새롭게 정리된 핵심 문제

앞으로의 핵심 문제는 단순히 “다음 영상을 무엇으로 보여줄 것인가?”가 아니다.

```text
어떤 콘텐츠가 있는가?
↓
어떤 채널인가?
↓
어느 정도 난이도인가?
↓
어떤 아이에게 맞는가?
↓
부모가 무엇을 허용할 것인가?
↓
아이가 무엇을 선택해 볼 수 있는가?
↓
그 시청 이력을 어떻게 관리할 것인가?
```

핵심 개념이 `Playlist`에서 `Content Library`로 이동해야 한다.

## 4. 참고할 만한 기존 서비스

### Kolibri + Kolibri Studio

현재 구상과 가장 가까운 오픈소스 참고 사례다.

```text
Content Library
→ Channel
→ Channel remix
→ Custom Channel
→ Learner
→ Learning Progress
```

중요한 점은 기존 콘텐츠를 그대로 소비하는 것이 아니라 **기본 콘텐츠를 가져와 자신만의 Channel/Collection으로 재구성**할 수 있다는 것이다.

Kids English Player에 적용하면:

```text
공용 Caillou Channel
→ 부모가 가져오기
→ 일부 영상 제외
→ 순서 변경
→ 아이에게 제공
```

형태가 된다.

### YouTube Kids

참고할 핵심은 `부모 승인 기반 콘텐츠 선택`이다.

```text
부모
→ 허용할 영상 / 채널 / Collection 선택
→ 아이는 허용된 콘텐츠 안에서 탐색
```

Kids English Player에는 다음 조합으로 적용할 수 있다.

```text
Level
+
Channel
+
Parent Approved
```

### Lingokids

참고할 핵심:

```text
아이별 프로필
아이별 학습 수준
콘텐츠 카테고리
Progress Center
```

즉, 콘텐츠 자체뿐 아니라 **아이별 상태와 부모 Dashboard**가 중요하다.

### ABCmouse

참고할 핵심은 `Learning Path + 자유 활동`의 공존이다.

```text
추천 학습 흐름
+
아이가 자유롭게 선택 가능한 콘텐츠
```

이 구조는 Kids English Player의 다음 방향과 잘 맞는다.

## 5. 핵심 재정의

기존:

```text
Playlist
→ 순차 재생
→ 완료
→ 다음 Playlist
```

개선:

```text
Content Library
    ↓
Channel
    ↓
Video
    ↕
Level / Category

부모가 선택
    ↓
My Collection

아이
 ├─ Level 선택
 ├─ Channel 선택
 ├─ 영상 목록 탐색
 ├─ 추천 다음 영상
 └─ 자유 선택 시청
```

핵심은 **고정 Playlist 재생 시스템에서 공용 Content Library + 부모 개인화 + 아이 자유 탐색 구조로 확장**하는 것이다.

## 6. V2 핵심 모델

### Content Library

서비스가 기본으로 제공하는 콘텐츠 집합.

```text
Caillou
Pocoyo
Alphablocks
Peppa Pig
Daniel Tiger
Bluey
```

### Channel

콘텐츠의 기본 그룹.

```text
Caillou
Peppa Pig
Alphablocks
```

Channel은 단순 YouTube 채널 URL이 아니라 서비스 내부 콘텐츠 그룹 개념이다.

### Video

각 영상은 다음 속성을 가진다.

```text
youtubeVideoId
title
channel
level
category
duration
enabled
```

Category 예:

```text
STORY
PHONICS
SONG
DAILY_LIFE
FEELINGS
SCHOOL
FAMILY
```

## 7. Parent Collection

서비스 공용 Library를 그대로 쓰는 것이 아니라 부모가 자신의 가정에 가져와 수정할 수 있어야 한다.

```text
공용 Level 3 / Caillou
↓
내 Collection으로 가져오기
↓
영상 일부 제외
↓
좋아하는 영상 추가
↓
순서 변경
↓
아이에게 제공
```

핵심 개념:

```text
Default Library
→ Copy / Subscribe
→ My Collection
→ Customize
```

## 8. Child Experience

아이 화면은 학습관리 시스템처럼 보이면 안 된다.

기본 구조:

```text
오늘 볼 영상
+
원하는 영상 찾기
```

예:

```text
[ 이어서 보기 ]

원하는 영상 고르기

Level
[ 1 ] [ 2 ] [ 3 ] [ 4 ]

Channel
[ Caillou ]
[ Peppa Pig ]
[ Alphablocks ]

영상 목록
[ Thumbnail ]
[ Thumbnail ]
[ Thumbnail ]
```

아이는 두 가지 흐름을 모두 사용할 수 있다.

```text
추천 흐름
+
자유 탐색
```

## 9. Level의 역할 변화

기존:

```text
Level = Playlist
```

V2:

```text
Level = 영상의 난이도 속성
```

따라서 다음 조합이 가능해야 한다.

```text
Level 2 + Caillou
Level 3 + Caillou
Level 3 + Peppa Pig
Level 4 + Peppa Pig
```

Level은 경로가 아니라 필터가 된다.

## 10. Playlist의 역할 변화

Playlist를 완전히 제거할 필요는 없다. 다만 최상위 개념이 아니어야 한다.

새 역할:

```text
추천 순서
Curated Collection
Learning Path
```

예:

```text
Caillou 입문 10편
Level 2 Phonics
처음 보는 Peppa Pig
```

즉, `Library → Channel → Video`가 기본이고 Playlist는 선택형 학습 경로다.

## 11. 부모의 콘텐츠 등록 문제

현재 구조에서는 모든 부모가 직접 YouTube URL을 등록해야 한다. 장기적으로 큰 불편이다.

따라서 두 방식을 함께 제공해야 한다.

```text
서비스 기본 Library에서 가져오기
+
YouTube URL 직접 추가
```

기본은 공용 콘텐츠 가져오기, 직접 등록은 보완 기능으로 둔다.

## 12. V2 핵심 UX

### Parent

```text
Dashboard

아이 선택
↓
콘텐츠 관리

[ 기본 Library ]
[ 내 Collection ]
[ 직접 등록 ]

Filter:
Level
Channel
Category
```

### Child

```text
안녕, 민준!

[ 이어서 보기 ]

오늘 추천
[ Caillou ]

원하는 영상 찾기

Level 3
Channel: Caillou

[영상]
[영상]
[영상]
```

## 13. 추천 시스템은 단순하게 시작

AI 추천은 아직 필요 없다.

초기 추천 규칙:

```text
아이 허용 Level
+
선호 Channel
+
미시청 영상
+
sequence
```

예:

```text
Level 3
Channel = Caillou
NOT_STARTED
sequence ASC
```

정도면 충분하다.


## 13-1. Auto Play Mode — 생활 속 영어 노출

V2에는 일반적인 `추천 / 자유 탐색`과 별도로 **Auto Play Mode**를 둔다.

목적은 아이가 매번 영상을 고르지 않아도,
부모가 선택한 영어 콘텐츠를 집에서 일정 시간 계속 노출할 수 있게 하는 것이다.

예:

```text
민준
→ Level 3~4
→ Channel = Caillou
→ Auto Play 시작
→ 같은 조건의 영상 연속 재생
```

Auto Play Mode는 학습 경로와는 역할이 다르다.

```text
Browse / 추천
→ 아이가 의식적으로 선택해서 보는 학습 경험

Auto Play
→ 집 안에서 영어 콘텐츠를 지속적으로 들려주는 노출 경험
```

### 기본 설정

```text
child
channel
minLevel
maxLevel
playMode
replayCompleted
maxMinutes
```

`playMode`:

```text
SEQUENTIAL
RANDOM
```

예시:

```text
Channel: Caillou
Level: 3~4
재생 순서: RANDOM
이미 본 영상: 다시 포함
최대 재생시간: 30분
```

### Auto Play UX

아이 Home 또는 Browse 화면에서 다음 진입점을 제공한다.

```text
[ 계속 틀어놓기 ]
```

시작 전 간단한 설정 화면:

```text
Auto Play

Channel
[ Caillou ▼ ]

Level
[ 3 ] ~ [ 4 ]

재생 순서
[ 순차 ] [ 랜덤 ]

이미 본 영상
[ 포함 ]

재생 시간
[ 30분 ]

[ Auto Play 시작 ]
```

재생 중 화면은 일반 Player보다 단순하게 만든다.

```text
Caillou Auto Play

현재 영상
Caillou Goes Camping

다음 영상
Caillou the Chef

남은 시간
22분

[ Auto Play 종료 ]
```

### 브라우저 제약

브라우저는 소리가 있는 영상의 완전한 자동 시작을 제한할 수 있다.

따라서 최초 시작은 부모 또는 아이가 직접:

```text
[ Auto Play 시작 ]
```

버튼을 한 번 누르게 하고,
그 이후 같은 세션 안에서 다음 영상으로 연속 재생하는 방식을 기본으로 한다.

### 데이터 모델 후보

```text
AutoPlaySession
- id
- childId
- channelId
- minLevel
- maxLevel
- playMode
- replayCompleted
- maxMinutes
- startedAt
- endedAt
```

필요하면 다음 값을 추가할 수 있다.

```text
currentVideoId
playedVideoCount
```

### Auto Play의 추천 규칙

초기 버전은 AI 추천 없이 단순 규칙으로 충분하다.

```text
선택한 Channel
+
허용 Level 범위
+
enabled 영상
+
playMode
```

`SEQUENTIAL`:

```text
sequence ASC
```

`RANDOM`:

```text
같은 조건 안에서 무작위 선택
```

이미 본 영상 포함 여부에 따라:

```text
replayCompleted = false
→ COMPLETED 제외

replayCompleted = true
→ COMPLETED 포함
```

### 제품 관점의 의미

Auto Play Mode가 추가되면 Kids English Player는 단순한 영상 진도관리 서비스가 아니라,
**가정 안에서 영어 노출 환경을 만드는 서비스**로 확장된다.

즉 V2의 핵심 경험은 세 가지가 된다.

```text
1. 추천해서 보기
2. 원하는 영상 직접 고르기
3. Auto Play로 계속 들려주기
```


## 14. 현재 프로젝트 처리 방향

현재 프로젝트는 삭제하지 않는다.

권장 방식:

```text
kids-english-player-v1
```

또는 repository 내부:

```text
archive/v1-concept
```

보존할 가치가 있는 것:

```text
YouTube Player
Progress tracking
WatchSession
Completion logic
Auth
Household
Child
Multi-user
Tests
```

이들은 V2에서도 재사용할 수 있다.

## 15. 새 UI와 기능을 다시 구성하는 이유

현재 프로젝트를 계속 수정하는 것도 가능하지만, 핵심 정보 구조가 크게 바뀌고 있다.

```text
V1
Playlist 중심

V2
Library
→ Channel
→ Level
→ Collection
→ Child selection
```

따라서 Concept v1을 아카이브하고 V2를 새롭게 구성하는 편이 더 명확하다.

## 16. V2에서 재사용할 것

새 프로젝트라고 해서 모든 것을 다시 만들 필요는 없다.

재사용 후보:

```text
YouTube URL parsing
YouTube IFrame Player
Progress rules
Watch time calculation
Completion threshold
WatchSession
Auth
Session
Household isolation
Child model
Docker setup
Test patterns
```

권장 방향:

```text
UI / Information Architecture
→ 새로 설계

Player / Progress / Auth
→ 기존 로직 재사용
```

## 17. V2 추천 개발 순서

```text
Phase 1
Concept / Information Architecture

Phase 2
Content Library
Channel
Video
Level
Category

Phase 3
Parent Collection

Phase 4
Child Browse UI

Phase 5
Player + Progress 연결

Phase 6
추천 흐름

Phase 7
Parent Dashboard

Phase 8
공용 콘텐츠 관리
```

## 18. 제품 한 문장 정의

V1:

> 부모가 선정한 YouTube 영어 영상을 아이가 정해진 순서대로 시청하고, 시청 진행률과 학습 이력을 관리하는 서비스.

V2:

> 부모가 검증된 영어 영상 Library에서 아이에게 맞는 Level과 Channel을 선택하고, 아이는 추천·자유 탐색·Auto Play를 통해 영어 콘텐츠를 접하며, 부모는 아이별 학습 이력과 선호를 관리하는 영어 콘텐츠 플랫폼.

## 19. 핵심 차이

```text
V1
Playlist 중심
순차 재생
부모 직접 등록
고정 Level

↓

V2
Library 중심
Channel + Level 탐색
공용 콘텐츠 가져오기
부모 개인화
아이 자유 선택
추천 + 탐색 + Auto Play 공존
```

## 20. 결론

현재 프로젝트는 Concept v1으로 충분한 가치가 있다.

특히:

```text
Player
Progress
Auth
Child
Household
```

구조를 실제로 검증했다는 점이 중요하다.

다음 단계에서는 계속 기능을 덧붙이기보다 V1을 아카이브하고, **Content Library 중심의 V2 UI와 기능을 새롭게 설계하는 방향**을 권장한다.

새 프로젝트의 핵심 질문은 더 이상:

```text
다음 영상을 무엇으로 재생할까?
```

가 아니라:

```text
이 아이가 지금 보고 싶은,
그리고 부모가 허용한 적절한 영어 콘텐츠를
어떻게 쉽게 찾고 선택하게 할 것인가?
```

가 되어야 한다.
