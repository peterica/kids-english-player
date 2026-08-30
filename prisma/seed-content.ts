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
  {
    slug: "bluey",
    name: "Bluey",
    description: "가족 놀이 · 자연스러운 대화",
    colorKey: "c1",
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
  // Bluey — Level 5 (출처: task/02_CONTENT_RESEARCH/BLUEY_CONTENT_CANDIDATES_30.md)
  // 2026-08-30 oEmbed 로 30편 모두 공개 상태 확인 (Bluey Official / Disney Jr. / Bingo Official)
  { youtubeVideoId: "FCeGAAo6WbM", title: "Movies", channelSlug: "bluey", level: 5, category: "STORY" },
  { youtubeVideoId: "W3GpdLhgHVA", title: "Hotel", channelSlug: "bluey", level: 5, category: "DAILY_LIFE" },
  { youtubeVideoId: "h7sBLY6vXLU", title: "Pass The Parcel", channelSlug: "bluey", level: 5, category: "FAMILY" },
  { youtubeVideoId: "YpI0jgqNJGc", title: "The Pool", channelSlug: "bluey", level: 5, category: "FAMILY" },
  { youtubeVideoId: "e8ULi9CC6os", title: "Dad Baby", channelSlug: "bluey", level: 5, category: "FAMILY" },
  { youtubeVideoId: "Q-K4TCO7Lp8", title: "Magic Asparagus", channelSlug: "bluey", level: 5, category: "FAMILY" },
  { youtubeVideoId: "wCc1XyprU8c", title: "Bingo", channelSlug: "bluey", level: 5, category: "DAILY_LIFE" },
  { youtubeVideoId: "vAdXLDVkjVA", title: "Yoga Ball", channelSlug: "bluey", level: 5, category: "FEELINGS" },
  { youtubeVideoId: "ewekkT49lsM", title: "Seesaw", channelSlug: "bluey", level: 5, category: "STORY" },
  { youtubeVideoId: "V3r4UWtoN_o", title: "The Sleepover", channelSlug: "bluey", level: 5, category: "FAMILY" },
  { youtubeVideoId: "MmuDI7lbJpk", title: "The Beach", channelSlug: "bluey", level: 5, category: "STORY" },
  { youtubeVideoId: "Z7s0tcZZ_mM", title: "Family Love Full Episodes", channelSlug: "bluey", level: 5, category: "FAMILY" },
  { youtubeVideoId: "0-3BZdSCGbs", title: "Time for the Best Bluey Games", channelSlug: "bluey", level: 5, category: "DAILY_LIFE" },
  { youtubeVideoId: "B6Bdw3crO84", title: "Hiding under the Blanket / Hotel + More", channelSlug: "bluey", level: 5, category: "STORY" },
  { youtubeVideoId: "aP-qKaig84M", title: "Bluey FULL Episodes Seasons 1-3", channelSlug: "bluey", level: 5, category: "STORY" },
  { youtubeVideoId: "Zr4c34VAKbk", title: "ULTIMATE 18 Full Episode Collection", channelSlug: "bluey", level: 5, category: "STORY" },
  { youtubeVideoId: "SZ9PD-s2k4w", title: "BEST FULL EPISODES from Season 2", channelSlug: "bluey", level: 5, category: "STORY" },
  { youtubeVideoId: "nU4HUT-2Jy0", title: "Bluey Shows Dad her Please Face", channelSlug: "bluey", level: 5, category: "FAMILY" },
  { youtubeVideoId: "MnzN6224I60", title: "Bluey Full Episode Collection - Best of Season 1", channelSlug: "bluey", level: 5, category: "STORY" },
  { youtubeVideoId: "I5oBzaxPtrI", title: "It's Family Time!", channelSlug: "bluey", level: 5, category: "FAMILY" },
  { youtubeVideoId: "diJqcYYCb0Y", title: "Bluey's Beach Holiday", channelSlug: "bluey", level: 5, category: "STORY" },
  { youtubeVideoId: "a0CRbuO0uU8", title: "BEACH! Full Episode Compilation", channelSlug: "bluey", level: 5, category: "STORY" },
  { youtubeVideoId: "im_Uk_8T2d8", title: "Running on the Beach! 1 Hour", channelSlug: "bluey", level: 5, category: "STORY" },
  { youtubeVideoId: "QnTwBAVnn-0", title: "Bluey's Sleepover Games", channelSlug: "bluey", level: 5, category: "FAMILY" },
  { youtubeVideoId: "dsZOcPGTTyo", title: "Bluey Playing with Toys at Christmas", channelSlug: "bluey", level: 5, category: "FAMILY" },
  { youtubeVideoId: "3ibV7x_3jBc", title: "Weekend / Butterflies / Easter", channelSlug: "bluey", level: 5, category: "STORY" },
  { youtubeVideoId: "3-qzrzoCxnM", title: "Onesies / The Quiet Game / Omelette", channelSlug: "bluey", level: 5, category: "FAMILY" },
  { youtubeVideoId: "IOtFxP2JJqI", title: "Grannies / Muffin Cone / The Show", channelSlug: "bluey", level: 5, category: "FAMILY" },
  { youtubeVideoId: "EJkn-r-rJJY", title: "Keepy Uppy / Magic Xylophone / Shadowlands", channelSlug: "bluey", level: 5, category: "STORY" },
  { youtubeVideoId: "LPG5jNNhwcM", title: "Bingo Fun with Food", channelSlug: "bluey", level: 5, category: "DAILY_LIFE" },
];
