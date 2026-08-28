/**
 * Content Library seed 데이터.
 *
 * 여기 있는 youtubeVideoId 는 실제 공개 영상 ID 이며 2026-08-28 에 YouTube oEmbed 로
 * 존재를 확인한 값이다(그 시점 기준 전부 조회 성공). 다만 영상은 언제든 삭제·비공개로
 * 바뀔 수 있으므로, 재생되지 않는 영상은 부모가 Collection 에서 제외하거나
 * 관리자가 seed 를 갱신해야 한다.
 *
 * seed 는 외부 네트워크를 호출하지 않는다(제목·썸네일 모두 로컬 값 사용).
 */
export type SeedChannel = {
  slug: string;
  name: string;
  description: string;
  colorKey: string;
};

export type SeedVideo = {
  youtubeVideoId: string;
  title: string;
  channelSlug: string;
  level: number;
  category: string;
};

export const SEED_CHANNELS: SeedChannel[] = [
  {
    slug: "caillou",
    name: "Caillou",
    description: "일상 대화 · 가족 · 학교",
    colorKey: "c1",
  },
  {
    slug: "alphablocks",
    name: "Alphablocks",
    description: "Phonics · Letter Sound",
    colorKey: "c2",
  },
  {
    slug: "pocoyo",
    name: "Pocoyo",
    description: "짧은 Story · 행동 중심",
    colorKey: "c3",
  },
  {
    slug: "peppa-pig",
    name: "Peppa Pig",
    description: "가족 · 친구 · 빠른 대화",
    colorKey: "c4",
  },
  {
    slug: "daniel-tiger",
    name: "Daniel Tiger",
    description: "감정 표현 · 사회성",
    colorKey: "c2",
  },
  {
    slug: "caities-classroom",
    name: "Caitie's Classroom",
    description: "노래 · 따라 하기 · 첫 영어",
    colorKey: "c3",
  },
];

export const SEED_VIDEOS: SeedVideo[] = [
  // Caitie's Classroom — 첫 영어(노래/행동)
  { youtubeVideoId: "HEcpLY4pCqM", title: "How Are You Feeling?", channelSlug: "caities-classroom", level: 1, category: "FEELINGS" },
  { youtubeVideoId: "z9W_hiiwQwg", title: "What's Your Favorite Color?", channelSlug: "caities-classroom", level: 1, category: "SONG" },
  { youtubeVideoId: "hklCGfeQ0bw", title: "How's The Weather?", channelSlug: "caities-classroom", level: 1, category: "SONG" },
  { youtubeVideoId: "09zShlhS1cQ", title: "Let's Count To 100", channelSlug: "caities-classroom", level: 1, category: "SONG" },

  // Pocoyo — 짧은 스토리
  { youtubeVideoId: "K9VkcGVsVdc", title: "Pocoyo - Color My World", channelSlug: "pocoyo", level: 1, category: "STORY" },
  { youtubeVideoId: "ctYnDNBzKtc", title: "Pocoyo - Musical Blocks", channelSlug: "pocoyo", level: 1, category: "STORY" },
  { youtubeVideoId: "tmZyhvtIBn0", title: "Pocoyo - Keep Going Pocoyo!", channelSlug: "pocoyo", level: 1, category: "STORY" },
  { youtubeVideoId: "5v4DtHtCews", title: "Pocoyo - Up and Down", channelSlug: "pocoyo", level: 2, category: "STORY" },
  { youtubeVideoId: "an9M0boMWqk", title: "Pocoyo - Hide and Seek", channelSlug: "pocoyo", level: 2, category: "STORY" },
  { youtubeVideoId: "9DExrviIgtA", title: "Pocoyo - Where's Pocoyo?", channelSlug: "pocoyo", level: 2, category: "STORY" },

  // Alphablocks — 파닉스
  { youtubeVideoId: "qMI4bRlezZQ", title: "Simple Letter Sounds", channelSlug: "alphablocks", level: 1, category: "PHONICS" },
  { youtubeVideoId: "0FnPvbIXAtk", title: "ABC's Letter Sounds", channelSlug: "alphablocks", level: 1, category: "PHONICS" },
  { youtubeVideoId: "55tmQ0R94Ao", title: "It's All About the Vowels", channelSlug: "alphablocks", level: 2, category: "PHONICS" },
  { youtubeVideoId: "hQ1Pvnds23E", title: "Word Magic", channelSlug: "alphablocks", level: 2, category: "PHONICS" },
  { youtubeVideoId: "wkilk-cpxDs", title: "CVC Words with A and T", channelSlug: "alphablocks", level: 2, category: "PHONICS" },
  { youtubeVideoId: "Y7ClQc_4Txg", title: "CVC Words", channelSlug: "alphablocks", level: 2, category: "PHONICS" },

  // Daniel Tiger — 감정
  { youtubeVideoId: "kV2RUN0KERA", title: "There Are Lots and Lots of Feelings", channelSlug: "daniel-tiger", level: 3, category: "FEELINGS" },
  { youtubeVideoId: "jOtVYMc8rYA", title: "Some Things You Don't Have to Share", channelSlug: "daniel-tiger", level: 3, category: "FEELINGS" },

  // Caillou — 일상 대화
  { youtubeVideoId: "gavAXKvzLQs", title: "Caillou Goes to School", channelSlug: "caillou", level: 3, category: "SCHOOL" },
  { youtubeVideoId: "W4DIp0UBnuQ", title: "Caillou's Big Friend", channelSlug: "caillou", level: 3, category: "FAMILY" },
  { youtubeVideoId: "wxdgsXrCsJY", title: "Caillou's Class Pet", channelSlug: "caillou", level: 3, category: "SCHOOL" },
  { youtubeVideoId: "XfUMYJysjMM", title: "Caillou the Chef", channelSlug: "caillou", level: 3, category: "DAILY_LIFE" },
  { youtubeVideoId: "bZLtsys2M48", title: "Caillou at the Doctor", channelSlug: "caillou", level: 3, category: "DAILY_LIFE" },
  { youtubeVideoId: "_84sb4j-cO4", title: "Caillou Goes Camping", channelSlug: "caillou", level: 3, category: "STORY" },
  { youtubeVideoId: "dXXMvSsPYcg", title: "Caillou Learns How to Bike", channelSlug: "caillou", level: 4, category: "DAILY_LIFE" },
  { youtubeVideoId: "_CBZg-pePlU", title: "Caillou Takes a Swim", channelSlug: "caillou", level: 4, category: "DAILY_LIFE" },

  // Peppa Pig — 빠른 대화
  { youtubeVideoId: "jEJqg4f92wQ", title: "Peppa Pig Loves Muddy Puddles", channelSlug: "peppa-pig", level: 4, category: "FAMILY" },
  { youtubeVideoId: "Z3BJHrAL6Fo", title: "Peppa Pig at the Dentist", channelSlug: "peppa-pig", level: 4, category: "DAILY_LIFE" },
  { youtubeVideoId: "cA1MrDGoxw8", title: "Daddy Pig's Birthday", channelSlug: "peppa-pig", level: 4, category: "FAMILY" },
  { youtubeVideoId: "c32STr46nWA", title: "Peppa Learns to Ride Her Bike", channelSlug: "peppa-pig", level: 4, category: "DAILY_LIFE" },
  { youtubeVideoId: "qbwzZuTTlDQ", title: "School Camp", channelSlug: "peppa-pig", level: 5, category: "SCHOOL" },
];
