import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  importModules,
  seedTestLibrary,
  type TestModules,
} from "./setup-db";

let db: ReturnType<typeof createTestDatabase>;
let m: TestModules;
let GET: (request: Request) => Promise<Response>;

let householdId = 0;
let childId = 0;
let caillouId = 0;

const call = async (query = "", init?: RequestInit) => {
  const response = await GET(
    new Request(`http://localhost/api/content-library${query}`, init),
  );
  return { status: response.status, body: await response.json() };
};

beforeAll(async () => {
  db = createTestDatabase();
  m = await importModules();
  ({ GET } = await import("@/app/api/content-library/route"));

  const parent = await m.auth.signupUser({
    email: "api@example.com",
    password: "password-api",
    displayName: "부모",
  });
  householdId = parent.household.id;
  childId = (await m.children.createChild(householdId, "민준")).id;

  const library = await seedTestLibrary(m);
  caillouId = library.caillou.id;

  // 가정 전용(직접 등록) 영상 — API 에 노출되면 안 된다
  const collection = await m.collections.getOrCreateChildCollection(householdId, childId);
  await m.collections.addCustomVideo(householdId, collection.id, {
    url: "https://youtu.be/hhhhhhhhhh1",
    title: "우리 집 전용 영상",
    channelId: caillouId,
    level: 3,
    category: "STORY",
  });
});

afterAll(async () => {
  await m?.prisma.$disconnect();
  db?.cleanup();
  delete process.env.CONTENT_LIBRARY_TOKEN;
});

describe("GET /api/content-library", () => {
  it("공용 Library 영상만 약속한 필드로 돌려준다", async () => {
    const { status, body } = await call();
    expect(status).toBe(200);
    expect(body.count).toBe(5);
    expect(Object.keys(body.videos[0]).sort()).toEqual([
      "category",
      "channel",
      "enabled",
      "level",
      "title",
      "youtubeUrl",
    ]);
    expect(body.videos[0]).toMatchObject({
      channel: expect.any(String),
      level: expect.any(Number),
      youtubeUrl: expect.stringContaining("https://www.youtube.com/watch?v="),
    });
  });

  it("가정 전용 영상과 사용자 데이터는 포함하지 않는다", async () => {
    const { body } = await call();
    expect(body.videos.some((v: { title: string }) => v.title === "우리 집 전용 영상")).toBe(
      false,
    );
    const raw = JSON.stringify(body);
    expect(raw).not.toContain("api@example.com");
    expect(raw).not.toContain("민준");
    expect(raw).not.toContain("householdId");
    expect(raw).not.toContain("childId");
  });

  it("level 필터가 동작한다", async () => {
    const { body } = await call("?level=3");
    expect(body.count).toBe(2);
    expect(body.videos.every((v: { level: number }) => v.level === 3)).toBe(true);
  });

  it("channel 필터는 slug · 이름 · id 를 모두 받는다", async () => {
    for (const value of ["caillou", "Caillou", String(caillouId)]) {
      const { body } = await call(`?channel=${value}`);
      expect(body.count).toBe(3);
      expect(body.videos.every((v: { channel: string }) => v.channel === "Caillou")).toBe(
        true,
      );
    }
  });

  it("level 과 channel 을 함께 적용한다", async () => {
    const { body } = await call("?channel=caillou&level=4");
    expect(body.count).toBe(1);
    expect(body.videos[0].title).toBe("Caillou Goes Camping");
  });

  it("잘못된 level 은 400 으로 거부한다", async () => {
    expect((await call("?level=9")).status).toBe(400);
    expect((await call("?level=abc")).status).toBe(400);
  });

  it("없는 channel 은 빈 목록을 돌려준다", async () => {
    const { status, body } = await call("?channel=not-exists");
    expect(status).toBe(200);
    expect(body.count).toBe(0);
  });

  it("CONTENT_LIBRARY_TOKEN 을 설정하면 토큰이 있어야 조회된다", async () => {
    process.env.CONTENT_LIBRARY_TOKEN = "secret-token";
    expect((await call()).status).toBe(400);
    expect((await call("?token=wrong")).status).toBe(400);
    expect((await call("?token=secret-token")).status).toBe(200);
    expect(
      (await call("", { headers: { authorization: "Bearer secret-token" } })).status,
    ).toBe(200);
    delete process.env.CONTENT_LIBRARY_TOKEN;
  });
});
