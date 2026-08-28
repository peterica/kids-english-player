import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "./setup-db";
import { PROGRESS_STATUS } from "@/lib/constants";
import { AppError } from "@/lib/errors";

type Modules = {
  prisma: typeof import("@/lib/db")["prisma"];
  auth: typeof import("@/lib/auth");
  children: typeof import("@/lib/children");
  learning: typeof import("@/lib/learning");
  progress: typeof import("@/lib/progress-service");
};

let db: ReturnType<typeof createTestDatabase>;
let m: Modules;

// 두 가정을 만들어 두고 모든 테스트에서 공유한다.
let householdA = 0;
let householdB = 0;
let childA = 0;
let childB = 0;
let level1 = 0;
let level2 = 0;
let videoIds: number[] = [];

beforeAll(async () => {
  db = createTestDatabase();
  m = {
    prisma: (await import("@/lib/db")).prisma,
    auth: await import("@/lib/auth"),
    children: await import("@/lib/children"),
    learning: await import("@/lib/learning"),
    progress: await import("@/lib/progress-service"),
  };

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
  childB = (await m.children.createChild(householdB, "서준")).id;

  // 공용 커리큘럼: Level 1(3편) / Level 2(2편)
  const videos = await Promise.all(
    ["aaaaaaaaaa1", "aaaaaaaaaa2", "aaaaaaaaaa3", "bbbbbbbbbb1", "bbbbbbbbbb2"].map(
      (youtubeVideoId, index) =>
        m.prisma.video.create({
          data: {
            youtubeVideoId,
            youtubeUrl: `https://www.youtube.com/watch?v=${youtubeVideoId}`,
            title: `Video ${index + 1}`,
            sequence: (index + 1) * 10,
          },
        }),
    ),
  );
  videoIds = videos.map((v) => v.id);

  const p1 = await m.prisma.playlist.create({
    data: { slug: "level-1", title: "Level 1", level: 1 },
  });
  const p2 = await m.prisma.playlist.create({
    data: { slug: "level-2", title: "Level 2", level: 2 },
  });
  level1 = p1.id;
  level2 = p2.id;

  await m.prisma.playlistVideo.createMany({
    data: [
      { playlistId: level1, videoId: videoIds[0], sequence: 10 },
      { playlistId: level1, videoId: videoIds[1], sequence: 20 },
      { playlistId: level1, videoId: videoIds[2], sequence: 30 },
      { playlistId: level2, videoId: videoIds[3], sequence: 10 },
      { playlistId: level2, videoId: videoIds[4], sequence: 20 },
    ],
  });

  await m.children.setChildPlaylist(householdA, childA, level1);
  await m.children.setChildPlaylist(householdB, childB, level1);
});

afterAll(async () => {
  await m?.prisma.$disconnect();
  db?.cleanup();
});

describe("회원가입 / 로그인", () => {
  it("가입하면 User + Household + OWNER 구성원이 함께 생성된다", async () => {
    const member = await m.prisma.householdMember.findFirst({
      where: { householdId: householdA },
      include: { user: true },
    });
    expect(member?.role).toBe("OWNER");
    expect(member?.user.email).toBe("parent.a@example.com"); // 이메일은 정규화되어 저장된다
    expect(member?.user.passwordHash).not.toContain("password-a1");
  });

  it("같은 이메일로는 다시 가입할 수 없다", async () => {
    await expect(
      m.auth.signupUser({
        email: "PARENT.A@example.com",
        password: "password-a1",
        displayName: "부모A2",
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("짧은 비밀번호는 거부한다", async () => {
    await expect(
      m.auth.signupUser({ email: "c@example.com", password: "1234", displayName: "부모C" }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("비밀번호가 틀리면 로그인할 수 없다", async () => {
    await expect(m.auth.loginUser("parent.a@example.com", "wrong")).rejects.toBeInstanceOf(
      AppError,
    );
    const user = await m.auth.loginUser("Parent.A@example.com", "password-a1");
    expect(user.displayName).toBe("부모A");
  });

  it("없는 계정도 같은 메시지로 거부한다", async () => {
    await expect(m.auth.loginUser("nobody@example.com", "whatever")).rejects.toThrow(
      "이메일 또는 비밀번호가 올바르지 않습니다.",
    );
  });
});

describe("Household 격리", () => {
  it("자기 가정의 아이는 조회할 수 있다", async () => {
    const child = await m.auth.authorizeChild(householdA, childA);
    expect(child.name).toBe("민준");
  });

  it("다른 가정의 아이는 조회할 수 없다", async () => {
    await expect(m.auth.authorizeChild(householdA, childB)).rejects.toBeInstanceOf(AppError);
    await expect(m.auth.authorizeChild(householdB, childA)).rejects.toBeInstanceOf(AppError);
  });

  it("다른 가정의 아이는 수정할 수 없다", async () => {
    await expect(m.children.renameChild(householdA, childB, "해킹")).rejects.toBeInstanceOf(
      AppError,
    );
    await expect(
      m.children.setChildEnabled(householdA, childB, false),
    ).rejects.toBeInstanceOf(AppError);
    await expect(
      m.children.setChildPlaylist(householdA, childB, level2),
    ).rejects.toBeInstanceOf(AppError);

    const untouched = await m.prisma.child.findUnique({ where: { id: childB } });
    expect(untouched?.name).toBe("서준");
    expect(untouched?.enabled).toBe(true);
  });

  it("존재하지 않는 childId 도 거부한다", async () => {
    await expect(m.auth.authorizeChild(householdA, 999999)).rejects.toBeInstanceOf(AppError);
    await expect(m.auth.authorizeChild(householdA, -1)).rejects.toBeInstanceOf(AppError);
  });

  it("부모 대시보드는 자기 가정의 아이만 본다", async () => {
    const rows = await m.learning.getHouseholdOverview(householdA);
    expect(rows.map((row) => row.child.name)).toEqual(["민준"]);
  });
});

describe("아이별 진행 기록 분리", () => {
  it("한 아이의 시청 기록이 다른 아이에게 반영되지 않는다", async () => {
    const videoId = videoIds[0];
    const sessionId = await m.progress.startWatchSession(childA, videoId, 0);
    await m.progress.recordProgressTick({
      childId: childA,
      videoId,
      sessionId,
      positionSeconds: 600,
      durationSeconds: 600,
      watchDeltaSeconds: 10,
    });

    const a = await m.prisma.videoProgress.findUnique({
      where: { childId_videoId: { childId: childA, videoId } },
    });
    const b = await m.prisma.videoProgress.findUnique({
      where: { childId_videoId: { childId: childB, videoId } },
    });

    expect(a?.status).toBe(PROGRESS_STATUS.COMPLETED);
    expect(b).toBeNull();

    const overviewA = await m.learning.getChildOverview(childA);
    const overviewB = await m.learning.getChildOverview(childB);
    expect(overviewA.completedCount).toBe(1);
    expect(overviewB.completedCount).toBe(0);
    expect(overviewA.today.watchSeconds).toBe(10);
    expect(overviewB.today.watchSeconds).toBe(0);
  });

  it("다른 아이의 세션 id 로는 시청 시간을 조작할 수 없다", async () => {
    const videoId = videoIds[1];
    const sessionOfA = await m.progress.startWatchSession(childA, videoId, 0);

    // childB 가 childA 의 sessionId 를 그대로 보내는 상황
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
});

describe("학습 과정(Playlist) 기반 선택", () => {
  it("현재 과정 안에서만 다음 영상을 고른다", async () => {
    // 민준: Level 1 의 첫 영상은 이미 완료 → 두 번째 영상이 현재 영상
    const overview = await m.learning.getChildOverview(childA);
    expect(overview.playlist?.title).toBe("Level 1");
    expect(overview.videos).toHaveLength(3);
    expect(overview.currentVideo?.id).toBe(videoIds[1]);
  });

  it("과정을 바꾸면 그 과정의 영상만 대상이 된다", async () => {
    await m.children.setChildPlaylist(householdA, childA, level2);
    const overview = await m.learning.getChildOverview(childA);
    expect(overview.playlist?.title).toBe("Level 2");
    expect(overview.videos.map((v) => v.id)).toEqual([videoIds[3], videoIds[4]]);
    expect(overview.currentVideo?.id).toBe(videoIds[3]);

    // 이전 과정 기록은 지워지지 않는다
    const previous = await m.prisma.videoProgress.findUnique({
      where: { childId_videoId: { childId: childA, videoId: videoIds[0] } },
    });
    expect(previous?.status).toBe(PROGRESS_STATUS.COMPLETED);

    await m.children.setChildPlaylist(householdA, childA, level1);
  });

  it("비활성 영상은 현재 영상 후보에서 빠진다", async () => {
    await m.prisma.video.update({
      where: { id: videoIds[1] },
      data: { enabled: false },
    });
    const overview = await m.learning.getChildOverview(childA);
    expect(overview.currentVideo?.id).toBe(videoIds[2]);
    await m.prisma.video.update({ where: { id: videoIds[1] }, data: { enabled: true } });
  });

  it("아이별 학습 과정은 서로 독립이다", async () => {
    await m.children.setChildPlaylist(householdB, childB, level2);
    const a = await m.learning.getChildOverview(childA);
    const b = await m.learning.getChildOverview(childB);
    expect(a.playlist?.title).toBe("Level 1");
    expect(b.playlist?.title).toBe("Level 2");
  });
});

describe("단일 아이 데이터 마이그레이션", () => {
  it("구성원이 없는 가정은 최초 회원가입 시 인계된다", async () => {
    const legacyHousehold = await m.prisma.household.create({
      data: { name: "우리 가족 (이전 데이터)" },
    });
    const legacyChild = await m.prisma.child.create({
      data: { householdId: legacyHousehold.id, name: "우리 아이" },
    });
    await m.prisma.videoProgress.create({
      data: {
        childId: legacyChild.id,
        videoId: videoIds[0],
        status: PROGRESS_STATUS.COMPLETED,
        progressPercent: 100,
        watchSeconds: 120,
      },
    });

    const result = await m.auth.signupUser({
      email: "legacy.parent@example.com",
      password: "password-legacy",
      displayName: "이전부모",
    });

    expect(result.adoptedLegacyHousehold).toBe(true);
    expect(result.household.id).toBe(legacyHousehold.id);

    const session = await m.auth.resolveSessionUser(result.user.id);
    expect(session?.householdId).toBe(legacyHousehold.id);

    // 인계받은 부모는 기존 아이와 학습 기록을 그대로 볼 수 있다
    const child = await m.auth.authorizeChild(session!.householdId, legacyChild.id);
    expect(child.name).toBe("우리 아이");
    const progress = await m.prisma.videoProgress.count({ where: { childId: legacyChild.id } });
    expect(progress).toBe(1);
  });
});
