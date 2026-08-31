import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  createTestDatabase,
  importModules,
  seedTestLibrary,
  type TestModules,
} from "./setup-db";
import { PLAY_MODE } from "@/lib/constants";

/** 로그인 쿠키를 흉내 내 Route Handler 를 그대로 호출한다. */
let currentToken: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (currentToken ? { name, value: currentToken } : undefined),
    set: () => {},
    delete: () => {},
  }),
}));

let db: ReturnType<typeof createTestDatabase>;
let m: TestModules;
let start: typeof import("@/app/api/autoplay/start/route");

let householdId = 0;
let otherHouseholdId = 0;
let childId = 0;
let otherChildId = 0;
let caillouId = 0;
let token = "";

const post = (body: unknown) =>
  new Request("http://localhost/api/autoplay/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const json = async (response: Response) => ({
  status: response.status,
  body: await response.json(),
});

beforeAll(async () => {
  db = createTestDatabase();
  m = await importModules();
  start = await import("@/app/api/autoplay/start/route");

  const { createSessionToken } = await import("@/lib/session");
  const parent = await m.auth.signupUser({
    email: "autoplay@example.com",
    password: "password-autoplay",
    displayName: "부모",
  });
  const other = await m.auth.signupUser({
    email: "other@example.com",
    password: "password-other",
    displayName: "다른 부모",
  });

  householdId = parent.household.id;
  otherHouseholdId = other.household.id;
  token = createSessionToken(parent.user.id);
  childId = (await m.children.createChild(householdId, "민준")).id;
  otherChildId = (await m.children.createChild(otherHouseholdId, "다른집아이")).id;

  const library = await seedTestLibrary(m);
  caillouId = library.caillou.id;
});

afterAll(async () => {
  await m?.prisma.$disconnect();
  db?.cleanup();
});

const config = {
  childId: 0,
  channelId: null as number | null,
  minLevel: 1,
  maxLevel: 5,
  playMode: PLAY_MODE.SEQUENTIAL,
  replayCompleted: true,
  maxMinutes: 30,
};

describe("POST /api/autoplay/start", () => {
  it("로그인하지 않으면 401", async () => {
    currentToken = undefined;
    const result = await json(await start.POST(post({ ...config, childId })));
    expect(result.status).toBe(401);
  });

  it("세션과 첫 영상을 한 번에 돌려준다 (화면 이동 없이 바로 재생하기 위함)", async () => {
    currentToken = token;
    const result = await json(await start.POST(post({ ...config, childId })));

    expect(result.status).toBe(200);
    expect(result.body.sessionId).toBeGreaterThan(0);
    expect(result.body.playedVideoCount).toBe(1);
    expect(result.body.video).toMatchObject({
      id: expect.any(Number),
      youtubeVideoId: expect.any(String),
      title: expect.any(String),
    });
    expect(result.body.remainingSeconds).toBeLessThanOrEqual(30 * 60);
    expect(Array.isArray(result.body.queue)).toBe(true);
    expect(result.body.queue.some((item: { id: number }) => item.id === result.body.video.id)).toBe(
      false,
    );

    const saved = await m.prisma.autoPlaySession.findUnique({
      where: { id: result.body.sessionId },
    });
    expect(saved?.currentVideoId).toBe(result.body.video.id);
    expect(saved?.endedAt).toBeNull();
  });

  it("Channel / Level 조건을 그대로 저장한다", async () => {
    currentToken = token;
    const result = await json(
      await start.POST(
        post({ ...config, childId, channelId: caillouId, minLevel: 3, maxLevel: 4, playMode: PLAY_MODE.RANDOM }),
      ),
    );
    const saved = await m.prisma.autoPlaySession.findUnique({
      where: { id: result.body.sessionId },
    });
    expect(saved).toMatchObject({
      channelId: caillouId,
      minLevel: 3,
      maxLevel: 4,
      playMode: PLAY_MODE.RANDOM,
    });
    expect(result.body.channelName).toBe("Caillou");
  });

  it("조건에 맞는 영상이 없으면 400", async () => {
    currentToken = token;
    const result = await json(
      await start.POST(post({ ...config, childId, channelId: caillouId, minLevel: 1, maxLevel: 1 })),
    );
    expect(result.status).toBe(400);
    expect(result.body.error).toContain("조건에 맞는 영상이 없습니다");
  });

  it("다른 가정의 아이로는 시작할 수 없다", async () => {
    currentToken = token;
    const result = await json(await start.POST(post({ ...config, childId: otherChildId })));
    expect(result.status).toBe(400);
    expect(await m.prisma.autoPlaySession.count({ where: { childId: otherChildId } })).toBe(0);
  });
});
