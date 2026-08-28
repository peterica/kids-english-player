/**
 * Level 1~4 커리큘럼 데이터.
 * 출처: task/playlist/LEVEL_{1..4}_PLAYLIST.md (2026-08-28 기준)
 * 런타임에 문서를 파싱하지 않고 seed 에서만 사용한다.
 */
export type PlaylistSeedVideo = {
  youtubeVideoId: string;
  title: string;
  sequence: number;
};

export type PlaylistSeed = {
  slug: string;
  title: string;
  level: number;
  description: string;
  videos: PlaylistSeedVideo[];
};

export const PLAYLIST_SEEDS: PlaylistSeed[] = [
  {
    slug: "level-1",
    title: "Level 1",
    level: 1,
    description: "영어 소리와 기본 표현에 익숙해지는 단계 (Super Simple Play with Caitie → Pocoyo)",
    videos: [
      { youtubeVideoId: "HEcpLY4pCqM", title: "[L1] How Are You Feeling?", sequence: 10 },
      { youtubeVideoId: "z9W_hiiwQwg", title: "[L1] What's Your Favorite Color?", sequence: 20 },
      { youtubeVideoId: "hklCGfeQ0bw", title: "[L1] How's The Weather?", sequence: 30 },
      { youtubeVideoId: "09zShlhS1cQ", title: "[L1] Let's Count To 100", sequence: 40 },
      { youtubeVideoId: "VpZrYTgdGvM", title: "[L1] Colors, Colors, Colors!", sequence: 50 },
      { youtubeVideoId: "BzzFRQsmb74", title: "[L1] Community Helpers", sequence: 60 },
      { youtubeVideoId: "K9VkcGVsVdc", title: "[L1] Pocoyo - Color My World", sequence: 70 },
      { youtubeVideoId: "ctYnDNBzKtc", title: "[L1] Pocoyo - Musical Blocks", sequence: 80 },
      { youtubeVideoId: "tmZyhvtIBn0", title: "[L1] Pocoyo - Keep Going Pocoyo!", sequence: 90 },
      { youtubeVideoId: "PE0uX4ZJ3TQ", title: "[L1] Pocoyo - Pocoyo's Present", sequence: 100 },
      { youtubeVideoId: "qflhcApE7lc", title: "[L1] Pocoyo - Pocoyo's Balloon", sequence: 110 },
      { youtubeVideoId: "BiuYaiEz5bg", title: "[L1] Pocoyo - Pocoyo Goes to School", sequence: 120 },
    ],
  },
  {
    slug: "level-2",
    title: "Level 2",
    level: 2,
    description: "파닉스와 첫 단어 읽기 단계 (Alphablocks → Pocoyo)",
    videos: [
      { youtubeVideoId: "qMI4bRlezZQ", title: "[L2] Alphablocks - Simple Letter Sounds", sequence: 10 },
      { youtubeVideoId: "0FnPvbIXAtk", title: "[L2] Alphablocks - ABC's | Letter Sounds | Words Are Everywhere", sequence: 20 },
      { youtubeVideoId: "55tmQ0R94Ao", title: "[L2] Alphablocks - It's All About the Vowels", sequence: 30 },
      { youtubeVideoId: "hQ1Pvnds23E", title: "[L2] Alphablocks - Word Magic | Level One Reading", sequence: 40 },
      { youtubeVideoId: "wkilk-cpxDs", title: "[L2] Alphablocks - CVC Words with the Letter A and T", sequence: 50 },
      { youtubeVideoId: "Y7ClQc_4Txg", title: "[L2] Alphablocks - CVC Words | Learn to Read", sequence: 60 },
      { youtubeVideoId: "hca15usvYRQ", title: "[L2] Alphablocks - Word Magic!", sequence: 70 },
      { youtubeVideoId: "5v4DtHtCews", title: "[L2] Pocoyo - Up and Down", sequence: 80 },
      { youtubeVideoId: "an9M0boMWqk", title: "[L2] Pocoyo - Hide and Seek", sequence: 90 },
      { youtubeVideoId: "9DExrviIgtA", title: "[L2] Pocoyo - Where's Pocoyo?", sequence: 100 },
      { youtubeVideoId: "jVDIbxTOaeE", title: "[L2] Pocoyo - Having a Ball", sequence: 110 },
      { youtubeVideoId: "Yp4x9fWfY7A", title: "[L2] Pocoyo - Pocoyo Goes to School", sequence: 120 },
    ],
  },
  {
    slug: "level-3",
    title: "Level 3",
    level: 3,
    description: "짧은 대화와 이야기 이해 단계 (Daniel Tiger → Caillou)",
    videos: [
      { youtubeVideoId: "kV2RUN0KERA", title: "[L3] Daniel Tiger - There Are Lots and Lots of Feelings", sequence: 10 },
      { youtubeVideoId: "jOtVYMc8rYA", title: "[L3] Daniel Tiger - Some Things You Don't Have to Share", sequence: 20 },
      { youtubeVideoId: "gavAXKvzLQs", title: "[L3] Caillou Goes to School", sequence: 30 },
      { youtubeVideoId: "W4DIp0UBnuQ", title: "[L3] Caillou's Big Friend", sequence: 40 },
      { youtubeVideoId: "wxdgsXrCsJY", title: "[L3] Caillou's Class Pet", sequence: 50 },
      { youtubeVideoId: "XfUMYJysjMM", title: "[L3] Caillou the Chef", sequence: 60 },
      { youtubeVideoId: "bZLtsys2M48", title: "[L3] Caillou at the Doctor", sequence: 70 },
      { youtubeVideoId: "_84sb4j-cO4", title: "[L3] Caillou Goes Camping!", sequence: 80 },
      { youtubeVideoId: "CnHXnK8XnRk", title: "[L3] Working Together", sequence: 90 },
      { youtubeVideoId: "N3IjwNspMSg", title: "[L3] Where I Live", sequence: 100 },
      { youtubeVideoId: "e6Bl6Wqi4U0", title: "[L3] Everyone's Best", sequence: 110 },
      { youtubeVideoId: "qL1ZFikOKVs", title: "[L3] Caillou Goes Back to School", sequence: 120 },
    ],
  },
  {
    slug: "level-4",
    title: "Level 4",
    level: 4,
    description: "일상 대화와 긴 이야기 흐름 단계 (Caillou → Peppa Pig)",
    videos: [
      { youtubeVideoId: "dXXMvSsPYcg", title: "[L4] Caillou Learns How to Bike!", sequence: 10 },
      { youtubeVideoId: "_CBZg-pePlU", title: "[L4] Caillou Takes a Swim", sequence: 20 },
      { youtubeVideoId: "jEJqg4f92wQ", title: "[L4] Peppa Pig Loves Muddy Puddles!", sequence: 30 },
      { youtubeVideoId: "Z3BJHrAL6Fo", title: "[L4] Peppa Pig at the Dentist", sequence: 40 },
      { youtubeVideoId: "cA1MrDGoxw8", title: "[L4] Daddy Pig's Birthday", sequence: 50 },
      { youtubeVideoId: "c32STr46nWA", title: "[L4] Peppa Pig Learns How to Ride Her Bike Safely", sequence: 60 },
      { youtubeVideoId: "0UH9U8tzYgI", title: "[L4] Peppa Pig Swimming", sequence: 70 },
      { youtubeVideoId: "oH5xVHS4hrw", title: "[L4] George's Friend", sequence: 80 },
      { youtubeVideoId: "Vvm1s-sq_fI", title: "[L4] Peppa Pig's New Tree House", sequence: 90 },
      { youtubeVideoId: "BQ3Q9tbsKxE", title: "[L4] Peppa Teaches Grandpa Pig How to Use Computers", sequence: 100 },
      { youtubeVideoId: "qbwzZuTTlDQ", title: "[L4] School Camp", sequence: 110 },
      { youtubeVideoId: "DYSTZz_dNLs", title: "[L4] Peppa's Family Camping Adventure", sequence: 120 },
    ],
  },
];
