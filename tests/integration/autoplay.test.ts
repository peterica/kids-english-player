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

let householdId = 0;
let childId = 0;
let caillouId = 0;
let alphaId = 0;
let videoIds: number[] = [];

beforeAll(async () => {
  db = createTestDatabase();
  m = await importModules();

  const parent = await m.auth.signupUser({
    username: "autoparent",
    password: "password-auto",
  });
  householdId = parent.household.id;
  childId = (await m.children.createChild(householdId, "민준")).id;

  const library = await seedTestLibrary(m);
  caillouId = library.caillou.id;
  alphaId = library.alpha.id;
  videoIds = library.videos.map((video) => video.id);
});

afterAll(async () => {
  await m?.prisma.$disconnect();
  db?.cleanup();
});

const baseConfig = {
  channelId: null as number | null,
  minLevel: 1,
  maxLevel: 5,
  playMode: PLAY_MODE.SEQUENTIAL,
  replayCompleted: true,
  maxMinutes: 30 as number | null,
};

describe("Auto Play 세션", () => {
  it("시작하면 첫 영상이 정해지고 설정이 저장된다", async () => {
    const session = await m.autoplay.startAutoPlaySession(householdId, childId, {
      ...baseConfig,
      channelId: caillouId,
      minLevel: 3,
      maxLevel: 4,
    });

    expect(session.channelId).toBe(caillouId);
    expect(session.minLevel).toBe(3);
    expect(session.maxLevel).toBe(4);
    expect(session.playMode).toBe(PLAY_MODE.SEQUENTIAL);
    expect(session.currentVideoId).toBe(videoIds[0]);
    expect(session.playedVideoCount).toBe(1);
  });

  it("SEQUENTIAL 은 다음 순서 영상으로 넘어간다", async () => {
    const active = await m.autoplay.getActiveAutoPlaySession(householdId, childId);
    const next = await m.autoplay.advanceAutoPlaySession(householdId, active!.id);
    expect(next.ended).toBe(false);
    expect(next.videoId).toBe(videoIds[1]);
    expect(next.playedVideoCount).toBe(2);

    const again = await m.autoplay.advanceAutoPlaySession(householdId, active!.id);
    expect(again.videoId).toBe(videoIds[2]);
  });

  it("끝까지 가면 처음으로 순환한다", async () => {
    const active = await m.autoplay.getActiveAutoPlaySession(householdId, childId);
    const next = await m.autoplay.advanceAutoPlaySession(householdId, active!.id);
    expect(next.videoId).toBe(videoIds[0]);
  });

  it("남은 시간이 함께 내려온다", async () => {
    const active = await m.autoplay.getActiveAutoPlaySession(householdId, childId);
    const next = await m.autoplay.advanceAutoPlaySession(householdId, active!.id);
    expect(next.remainingSeconds).not.toBeNull();
    expect(next.remainingSeconds!).toBeLessThanOrEqual(30 * 60);
  });

  it("maxMinutes 를 넘기면 세션이 끝난다", async () => {
    const active = await m.autoplay.getActiveAutoPlaySession(householdId, childId);
    const later = new Date(active!.startedAt.getTime() + 31 * 60 * 1000);
    const result = await m.autoplay.advanceAutoPlaySession(householdId, active!.id, later);

    expect(result.ended).toBe(true);
    expect(result.reason).toBe("EXPIRED");
    expect(
      (await m.prisma.autoPlaySession.findUnique({ where: { id: active!.id } }))?.endedAt,
    ).not.toBeNull();
  });

  it("새 세션을 시작하면 이전 세션은 종료된다", async () => {
    const first = await m.autoplay.startAutoPlaySession(householdId, childId, baseConfig);
    const second = await m.autoplay.startAutoPlaySession(householdId, childId, baseConfig);

    expect(
      (await m.prisma.autoPlaySession.findUnique({ where: { id: first.id } }))?.endedAt,
    ).not.toBeNull();

    const active = await m.autoplay.getActiveAutoPlaySession(householdId, childId);
    expect(active?.id).toBe(second.id);
    await m.autoplay.endAutoPlaySession(householdId, second.id);
  });

  it("조건에 맞는 영상이 없으면 시작하지 못한다", async () => {
    await expect(
      m.autoplay.startAutoPlaySession(householdId, childId, {
        ...baseConfig,
        channelId: alphaId,
        minLevel: 5,
        maxLevel: 5,
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("replayCompleted=false 면 이미 본 영상을 건너뛴다", async () => {
    // Caillou 3편 중 2편을 완료 처리
    for (const videoId of [videoIds[0], videoIds[1]]) {
      await m.progress.recordProgressTick({
        childId,
        videoId,
        positionSeconds: 600,
        durationSeconds: 600,
        watchDeltaSeconds: 10,
      });
    }

    const session = await m.autoplay.startAutoPlaySession(householdId, childId, {
      ...baseConfig,
      channelId: caillouId,
      minLevel: 3,
      maxLevel: 4,
      replayCompleted: false,
    });
    expect(session.currentVideoId).toBe(videoIds[2]);

    // 남은 후보가 하나뿐이면 같은 영상을 이어서 재생한다
    const next = await m.autoplay.advanceAutoPlaySession(householdId, session.id);
    expect(next.videoId).toBe(videoIds[2]);
    await m.autoplay.endAutoPlaySession(householdId, session.id);
  });

  it("replayCompleted=true 면 이미 본 영상도 후보에 남는다", async () => {
    const queue = await m.autoplay.previewAutoPlayQueue(
      householdId,
      childId,
      {
        channelId: caillouId,
        minLevel: 3,
        maxLevel: 4,
        playMode: PLAY_MODE.SEQUENTIAL,
        replayCompleted: true,
      },
      10,
    );
    expect(queue.map((item) => item.id)).toEqual([videoIds[0], videoIds[1], videoIds[2]]);
    expect(
      queue.filter((item) => item.watch.status === PROGRESS_STATUS.COMPLETED).length,
    ).toBe(2);
  });

  it("Auto Play 로 본 기록도 같은 VideoProgress / WatchSession 에 남는다", async () => {
    const session = await m.autoplay.startAutoPlaySession(householdId, childId, {
      ...baseConfig,
      channelId: caillouId,
      minLevel: 3,
      maxLevel: 4,
    });
    const videoId = session.currentVideoId!;

    const watchSessionId = await m.progress.startWatchSession(childId, videoId, 0);
    await m.progress.recordProgressTick({
      childId,
      videoId,
      sessionId: watchSessionId,
      positionSeconds: 120,
      durationSeconds: 600,
      watchDeltaSeconds: 10,
    });

    const progress = await m.prisma.videoProgress.findUnique({
      where: { childId_videoId: { childId, videoId } },
    });
    expect(progress).not.toBeNull();
    expect(
      await m.prisma.watchSession.count({ where: { childId, videoId } }),
    ).toBeGreaterThan(0);

    await m.autoplay.endAutoPlaySession(householdId, session.id);
  });

  it("종료한 세션을 다시 진행시키면 종료 상태로 응답한다", async () => {
    const session = await m.autoplay.startAutoPlaySession(householdId, childId, baseConfig);
    await m.autoplay.endAutoPlaySession(householdId, session.id);
    const result = await m.autoplay.advanceAutoPlaySession(householdId, session.id);
    expect(result.ended).toBe(true);
  });

  it("Level 범위가 뒤집히면 거부한다", async () => {
    await expect(
      m.autoplay.startAutoPlaySession(householdId, childId, {
        ...baseConfig,
        minLevel: 4,
        maxLevel: 2,
      }),
    ).rejects.toBeInstanceOf(AppError);
  });
});
