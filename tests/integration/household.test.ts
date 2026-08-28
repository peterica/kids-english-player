import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  importModules,
  seedTestLibrary,
  type TestModules,
} from "./setup-db";
import { AppError } from "@/lib/errors";
import { PLAY_MODE, PROGRESS_STATUS } from "@/lib/constants";

let db: ReturnType<typeof createTestDatabase>;
let m: TestModules;

let householdA = 0;
let householdB = 0;
let childA = 0;
let childB = 0;
let caillouId = 0;
let alphaId = 0;
let videoIds: number[] = [];

beforeAll(async () => {
  db = createTestDatabase();
  m = await importModules();

  const a = await m.auth.signupUser({
    email: "Parent.A@example.com",
    password: "password-a1",
    displayName: "부모A",
  });
  const b = await m.auth.signupUser({
    email: "parent.b@example.com",
    password: "password-b1",
    displayName: "부모B",
  });
  householdA = a.household.id;
  householdB = b.household.id;

  childA = (await m.children.createChild(householdA, "민준")).id;
  childB = (await m.children.createChild(householdB, "다른집아이")).id;

  const library = await seedTestLibrary(m);
  caillouId = library.caillou.id;
  alphaId = library.alpha.id;
  videoIds = library.videos.map((video) => video.id);
});

afterAll(async () => {
  await m?.prisma.$disconnect();
  db?.cleanup();
});

describe("Auth", () => {
  it("가입하면 User + Household + OWNER 구성원이 함께 생긴다", async () => {
    const member = await m.prisma.householdMember.findFirst({
      where: { householdId: householdA },
      include: { user: true },
    });
    expect(member?.role).toBe("OWNER");
    expect(member?.user.email).toBe("parent.a@example.com");
    expect(member?.user.passwordHash).not.toContain("password-a1");
  });

  it("같은 이메일로 다시 가입할 수 없다", async () => {
    await expect(
      m.auth.signupUser({
        email: "PARENT.A@example.com",
        password: "password-a1",
        displayName: "부모A2",
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("짧은 비밀번호 / 잘못된 이메일을 거부한다", async () => {
    await expect(
      m.auth.signupUser({ email: "c@example.com", password: "123", displayName: "C" }),
    ).rejects.toBeInstanceOf(AppError);
    await expect(
      m.auth.signupUser({ email: "not-email", password: "password-c1", displayName: "C" }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("로그인 성공 / 실패", async () => {
    const user = await m.auth.loginUser("Parent.A@example.com", "password-a1");
    expect(user.displayName).toBe("부모A");
    await expect(m.auth.loginUser("parent.a@example.com", "wrong")).rejects.toThrow(
      "이메일 또는 비밀번호가 올바르지 않습니다.",
    );
    await expect(m.auth.loginUser("nobody@example.com", "whatever")).rejects.toThrow(
      "이메일 또는 비밀번호가 올바르지 않습니다.",
    );
  });

  it("세션 사용자는 자기 Household 로만 해석된다", async () => {
    const user = await m.prisma.user.findUnique({
      where: { email: "parent.a@example.com" },
    });
    const session = await m.auth.resolveSessionUser(user!.id);
    expect(session?.householdId).toBe(householdA);
    expect(await m.auth.resolveSessionUser(999999)).toBeNull();
  });
});

describe("Household Isolation", () => {
  it("자기 아이는 접근할 수 있다", async () => {
    expect((await m.auth.authorizeChild(householdA, childA)).name).toBe("민준");
  });

  it("다른 가정의 아이는 조회/수정할 수 없다", async () => {
    await expect(m.auth.authorizeChild(householdA, childB)).rejects.toBeInstanceOf(AppError);
    await expect(m.children.renameChild(householdA, childB, "해킹")).rejects.toBeInstanceOf(
      AppError,
    );
    await expect(
      m.children.setChildEnabled(householdA, childB, false),
    ).rejects.toBeInstanceOf(AppError);
    await expect(
      m.children.updateChildPreference(householdA, childB, {
        minLevel: 1,
        maxLevel: 5,
        channelIds: [],
      }),
    ).rejects.toBeInstanceOf(AppError);

    const untouched = await m.prisma.child.findUnique({ where: { id: childB } });
    expect(untouched?.name).toBe("다른집아이");
    expect(untouched?.enabled).toBe(true);
  });

  it("다른 가정의 Collection 에 접근할 수 없다", async () => {
    const collectionB = await m.collections.getOrCreateChildCollection(householdB, childB);
    await expect(
      m.auth.authorizeCollection(householdA, collectionB.id),
    ).rejects.toBeInstanceOf(AppError);
    await expect(
      m.collections.addVideoToCollection(householdA, collectionB.id, videoIds[0]),
    ).rejects.toBeInstanceOf(AppError);
    await expect(
      m.collections.removeVideoFromCollection(householdA, collectionB.id, videoIds[0]),
    ).rejects.toBeInstanceOf(AppError);
    expect(
      await m.prisma.collectionVideo.count({ where: { collectionId: collectionB.id } }),
    ).toBe(0);
  });

  it("다른 가정의 아이 카탈로그/진행을 조회할 수 없다", async () => {
    await expect(
      m.childContent.getChildCatalog(householdA, childB),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("다른 가정의 Auto Play 세션을 조작할 수 없다", async () => {
    const session = await m.autoplay.startAutoPlaySession(householdB, childB, {
      channelId: null,
      minLevel: 1,
      maxLevel: 5,
      playMode: PLAY_MODE.SEQUENTIAL,
      replayCompleted: true,
      maxMinutes: 30,
    });
    await expect(
      m.autoplay.advanceAutoPlaySession(householdA, session.id),
    ).rejects.toBeInstanceOf(AppError);
    await expect(
      m.autoplay.endAutoPlaySession(householdA, session.id),
    ).rejects.toBeInstanceOf(AppError);
    await expect(
      m.autoplay.getActiveAutoPlaySession(householdA, childB),
    ).rejects.toBeInstanceOf(AppError);

    await m.autoplay.endAutoPlaySession(householdB, session.id);
  });

  it("존재하지 않는 id 도 거부한다", async () => {
    await expect(m.auth.authorizeChild(householdA, 999999)).rejects.toBeInstanceOf(AppError);
    await expect(m.auth.authorizeChild(householdA, -1)).rejects.toBeInstanceOf(AppError);
    await expect(
      m.auth.authorizeCollection(householdA, 999999),
    ).rejects.toBeInstanceOf(AppError);
  });
});

describe("Content Library", () => {
  it("Level / Channel / Category / 검색 필터가 동작한다", async () => {
    const all = await m.library.listVideos({ householdId: householdA });
    expect(all).toHaveLength(5);

    const level3 = await m.library.listVideos({
      householdId: householdA,
      filter: { level: 3 },
    });
    expect(level3.map((v) => v.title)).toEqual([
      "Caillou Goes to School",
      "Caillou the Chef",
    ]);

    const phonics = await m.library.listVideos({
      householdId: householdA,
      filter: { category: "PHONICS" },
    });
    expect(phonics).toHaveLength(2);

    const byChannel = await m.library.listVideos({
      householdId: householdA,
      filter: { channelId: alphaId },
    });
    expect(byChannel).toHaveLength(2);

    const search = await m.library.listVideos({
      householdId: householdA,
      filter: { query: "camping" },
    });
    expect(search.map((v) => v.title)).toEqual(["Caillou Goes Camping"]);
  });

  it("비활성 영상은 기본 목록에서 빠진다", async () => {
    await m.prisma.video.update({
      where: { id: videoIds[4] },
      data: { enabled: false },
    });
    const visible = await m.library.listVideos({ householdId: householdA });
    expect(visible.some((v) => v.id === videoIds[4])).toBe(false);
    await m.prisma.video.update({ where: { id: videoIds[4] }, data: { enabled: true } });
  });

  it("다른 가정이 직접 등록한 영상은 보이지 않는다", async () => {
    const collectionB = await m.collections.getOrCreateChildCollection(householdB, childB);
    await m.collections.addCustomVideo(householdB, collectionB.id, {
      url: "https://youtu.be/cccccccccc1",
      title: "B 가정 전용 영상",
      channelId: caillouId,
      level: 3,
      category: "STORY",
    });

    const forA = await m.library.listVideos({ householdId: householdA });
    expect(forA.some((v) => v.title === "B 가정 전용 영상")).toBe(false);

    const forB = await m.library.listVideos({ householdId: householdB });
    expect(forB.some((v) => v.title === "B 가정 전용 영상")).toBe(true);
  });
});

describe("Child Preference", () => {
  it("허용 Level 과 선호 Channel 이 카탈로그에 반영된다", async () => {
    await m.children.updateChildPreference(householdA, childA, {
      minLevel: 3,
      maxLevel: 4,
      channelIds: [caillouId],
    });
    const catalog = await m.childContent.getChildCatalog(householdA, childA);
    expect(catalog.scope).toEqual({
      minLevel: 3,
      maxLevel: 4,
      preferredChannelIds: [caillouId],
    });
    expect(catalog.items.map((item) => item.title)).toEqual([
      "Caillou Goes to School",
      "Caillou the Chef",
      "Caillou Goes Camping",
    ]);
  });

  it("Level 범위가 뒤집히면 거부한다", async () => {
    await expect(
      m.children.updateChildPreference(householdA, childA, {
        minLevel: 4,
        maxLevel: 2,
        channelIds: [],
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("아이마다 독립적이다", async () => {
    await m.children.updateChildPreference(householdB, childB, {
      minLevel: 1,
      maxLevel: 2,
      channelIds: [alphaId],
    });
    const a = await m.childContent.getChildCatalog(householdA, childA);
    const b = await m.childContent.getChildCatalog(householdB, childB);
    expect(a.scope.maxLevel).toBe(4);
    expect(b.scope.maxLevel).toBe(2);

    // 공용 Library 영상은 허용 Level 범위 안에서만 보인다.
    // (Collection 에 직접 담은 영상은 범위를 벗어나도 보이는 것이 의도된 동작이다)
    const libraryItems = b.items.filter((item) => item.householdId === null);
    expect(libraryItems.length).toBeGreaterThan(0);
    expect(libraryItems.every((item) => item.level <= 2)).toBe(true);
  });
});

describe("My Collection", () => {
  it("Library 영상을 담아도 원본 Library 는 바뀌지 않는다", async () => {
    const collection = await m.collections.getOrCreateChildCollection(householdA, childA);
    const before = await m.prisma.video.findUnique({ where: { id: videoIds[3] } });

    await m.collections.addVideoToCollection(householdA, collection.id, videoIds[3]);

    const after = await m.prisma.video.findUnique({ where: { id: videoIds[3] } });
    expect(after).toEqual(before);

    // 허용 Level(3~4) 밖의 Level 2 영상이지만 담았기 때문에 볼 수 있다
    const catalog = await m.childContent.getChildCatalog(householdA, childA);
    expect(catalog.items.some((item) => item.id === videoIds[3])).toBe(true);
  });

  it("숨기면 아이 화면에서 사라지고, 다시 보이게 할 수 있다", async () => {
    const collection = await m.collections.getOrCreateChildCollection(householdA, childA);
    await m.collections.addVideoToCollection(householdA, collection.id, videoIds[0]);
    await m.collections.setCollectionVideoEnabled(
      householdA,
      collection.id,
      videoIds[0],
      false,
    );

    let catalog = await m.childContent.getChildCatalog(householdA, childA);
    expect(catalog.items.some((item) => item.id === videoIds[0])).toBe(false);

    await m.collections.setCollectionVideoEnabled(
      householdA,
      collection.id,
      videoIds[0],
      true,
    );
    catalog = await m.childContent.getChildCatalog(householdA, childA);
    expect(catalog.items.some((item) => item.id === videoIds[0])).toBe(true);
  });

  it("빼면 허용 범위 규칙으로 돌아간다", async () => {
    const collection = await m.collections.getOrCreateChildCollection(householdA, childA);
    await m.collections.removeVideoFromCollection(householdA, collection.id, videoIds[3]);
    const catalog = await m.childContent.getChildCatalog(householdA, childA);
    // Level 2 영상이라 허용 범위(3~4) 밖 → 다시 보이지 않는다
    expect(catalog.items.some((item) => item.id === videoIds[3])).toBe(false);
  });

  it("순서를 바꿀 수 있다", async () => {
    const collection = await m.collections.getOrCreateChildCollection(householdA, childA);
    await m.collections.addVideoToCollection(householdA, collection.id, videoIds[1]);
    await m.collections.addVideoToCollection(householdA, collection.id, videoIds[2]);

    const before = await m.prisma.collectionVideo.findMany({
      where: { collectionId: collection.id },
      orderBy: { sequence: "asc" },
    });
    const last = before[before.length - 1];
    await m.collections.moveCollectionVideo(householdA, collection.id, last.videoId, "up");

    const after = await m.prisma.collectionVideo.findMany({
      where: { collectionId: collection.id },
      orderBy: { sequence: "asc" },
    });
    expect(after[after.length - 1].videoId).toBe(before[before.length - 2].videoId);
  });

  it("직접 등록한 YouTube 영상은 그 가정에서만 보인다", async () => {
    const collection = await m.collections.getOrCreateChildCollection(householdA, childA);
    const result = await m.collections.addCustomVideo(householdA, collection.id, {
      url: "https://www.youtube.com/watch?v=ddddddddd12",
      title: "우리 아이 전용 영상",
      channelId: caillouId,
      level: 3,
      category: "STORY",
    });

    expect(result.video.householdId).toBe(householdA);
    const catalog = await m.childContent.getChildCatalog(householdA, childA);
    expect(catalog.items.some((item) => item.id === result.video.id)).toBe(true);

    const catalogB = await m.childContent.getChildCatalog(householdB, childB);
    expect(catalogB.items.some((item) => item.id === result.video.id)).toBe(false);
  });

  it("잘못된 YouTube 주소는 거부한다", async () => {
    const collection = await m.collections.getOrCreateChildCollection(householdA, childA);
    await expect(
      m.collections.addCustomVideo(householdA, collection.id, {
        url: "https://vimeo.com/12345",
        channelId: caillouId,
        level: 3,
        category: "STORY",
      }),
    ).rejects.toBeInstanceOf(AppError);
  });
});

describe("Progress / WatchSession", () => {
  it("아이별로 기록이 분리된다", async () => {
    const videoId = videoIds[0];
    const sessionId = await m.progress.startWatchSession(childA, videoId, 0);
    const result = await m.progress.recordProgressTick({
      childId: childA,
      videoId,
      sessionId,
      positionSeconds: 600,
      durationSeconds: 600,
      watchDeltaSeconds: 10,
    });

    expect(result.status).toBe(PROGRESS_STATUS.COMPLETED);
    expect(
      await m.prisma.videoProgress.findUnique({
        where: { childId_videoId: { childId: childB, videoId } },
      }),
    ).toBeNull();

    const today = await m.stats.getTodayStatsForChild(childA);
    expect(today.watchSeconds).toBe(10);
    expect((await m.stats.getTodayStatsForChild(childB)).watchSeconds).toBe(0);
  });

  it("다른 아이의 sessionId 로는 시청시간을 조작할 수 없다", async () => {
    const videoId = videoIds[1];
    const sessionOfA = await m.progress.startWatchSession(childA, videoId, 0);
    const result = await m.progress.recordProgressTick({
      childId: childB,
      videoId,
      sessionId: sessionOfA,
      positionSeconds: 30,
      durationSeconds: 600,
      watchDeltaSeconds: 10,
    });
    expect(result.sessionId).toBeNull();

    const session = await m.prisma.watchSession.findUnique({ where: { id: sessionOfA } });
    expect(session?.watchSeconds).toBe(0);
    expect(session?.childId).toBe(childA);
  });

  it("재생 없이 들어온 heartbeat 는 기록을 만들지 않는다", async () => {
    const videoId = videoIds[2];
    const result = await m.progress.recordProgressTick({
      childId: childA,
      videoId,
      positionSeconds: 0,
      durationSeconds: 600,
      watchDeltaSeconds: 0,
    });
    expect(result.status).toBe(PROGRESS_STATUS.NOT_STARTED);
    expect(
      await m.prisma.videoProgress.findUnique({
        where: { childId_videoId: { childId: childA, videoId } },
      }),
    ).toBeNull();
  });

  it("카탈로그에 시청 상태가 반영된다", async () => {
    const catalog = await m.childContent.getChildCatalog(householdA, childA);
    const watched = catalog.items.find((item) => item.id === videoIds[0]);
    expect(watched?.watch.status).toBe(PROGRESS_STATUS.COMPLETED);
  });
});
