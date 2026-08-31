# Content Library 백업

- 내보낸 시각: 2026-08-31 14:31:44
- 채널 23개 / 영상 526편
- 대상: 공용 Content Library (계정·아이·시청기록은 포함하지 않는다)

## 복구 방법

```text
1. seed 로 복구  : prisma/seed-content.ts 가 원본이며 npm run db:seed 는 여러 번 실행해도 안전하다
2. 문서로 복구   : channels/<slug>.md 의 표를 운영자 일괄등록에 붙여 넣는다
3. 파일로 복구   : data/app.db 를 복사해 둔 백업으로 되돌린다 (가장 빠름)
```

## 채널

| # | 채널 | slug | 영상 | 노출 | Level 분포 |
| --- | --- | --- | --- | --- | --- |
| 1 | [Caillou](channels/caillou.md) | `caillou` | 30 | 사용 | L3:18 L4:12 |
| 2 | [Alphablocks](channels/alphablocks.md) | `alphablocks` | 36 | 사용 | L1:25 L2:11 |
| 3 | [Pocoyo](channels/pocoyo.md) | `pocoyo` | 30 | 사용 | L1:3 L2:12 L3:15 |
| 4 | [Peppa Pig](channels/peppa-pig.md) | `peppa-pig` | 33 | 사용 | L4:26 L5:7 |
| 5 | [Daniel Tiger](channels/daniel-tiger.md) | `daniel-tiger` | 30 | 사용 | L3:20 L4:10 |
| 6 | [Caitie's Classroom](channels/caities-classroom.md) | `caities-classroom` | 34 | 사용 | L1:28 L2:6 |
| 7 | [Bluey](channels/bluey.md) | `bluey` | 30 | 사용 | L5:30 |
| 8 | [Super Simple Songs](channels/super-simple-songs.md) | `super-simple-songs` | 30 | 사용 | L1:30 |
| 9 | [Numberblocks](channels/numberblocks.md) | `numberblocks` | 30 | 사용 | L2:30 |
| 10 | [Blippi](channels/blippi.md) | `blippi` | 34 | 사용 | L2:17 L3:17 |
| 11 | [Sesame Street](channels/sesame-street.md) | `sesame-street` | 4 | 사용 | L2:4 |
| 12 | [Blue's Clues & You!](channels/blues-clues.md) | `blues-clues` | 1 | 사용 | L2:1 |
| 13 | [StoryBots](channels/storybots.md) | `storybots` | 6 | 사용 | L3:6 |
| 14 | [Curious George](channels/curious-george.md) | `curious-george` | 3 | 사용 | L4:3 |
| 15 | [SciShow Kids](channels/scishow-kids.md) | `scishow-kids` | 29 | 사용 | L4:19 L5:10 |
| 16 | [Clifford the Big Red Dog](channels/clifford.md) | `clifford` | 11 | 사용 | L3:6 L4:5 |
| 17 | [Thomas & Friends](channels/thomas-and-friends.md) | `thomas-and-friends` | 30 | 사용 | L3:19 L4:11 |
| 18 | [Octonauts](channels/octonauts.md) | `octonauts` | 30 | 사용 | L4:17 L5:13 |
| 19 | [Super Why!](channels/super-why.md) | `super-why` | 30 | 사용 | L2:20 L3:10 |
| 20 | [Dinosaur Train](channels/dinosaur-train.md) | `dinosaur-train` | 22 | 사용 | L3:14 L4:8 |
| 21 | [Arthur](channels/arthur.md) | `arthur` | 18 | 사용 | L4:14 L5:4 |
| 22 | [WordWorld](channels/wordworld.md) | `wordworld` | 23 | 사용 | L2:23 |
| 23 | [Wild Kratts](channels/wild-kratts.md) | `wild-kratts` | 2 | 사용 | L5:2 |
