import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  createTestDatabase,
  importModules,
  seedTestLibrary,
  type TestModules,
} from "./setup-db";
import { HOUSEHOLD_ROLE, PROGRESS_STATUS } from "@/lib/constants";

/** 로그인 쿠키를 흉내 내서 실제 Route Handler 를 그대로 호출한다. */
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

type Handlers = {
  videos: typeof import("@/app/api/admin/videos/route");
  video: typeof import("@/app/api/admin/videos/[id]/route");
  videoEnabled: typeof import("@/app/api/admin/videos/[id]/enabled/route");
  importValidate: typeof import("@/app/api/admin/videos/import/validate/route");
  importRun: typeof import("@/app/api/admin/videos/import/route");
  channels: typeof import("@/app/api/admin/channels/route");
  channel: typeof import("@/app/api/admin/channels/[id]/route");
  channelEnabled: typeof import("@/app/api/admin/channels/[id]/enabled/route");
  adminRequests: typeof import("@/app/api/admin/correction-requests/route");
  adminRequestStatus: typeof import("@/app/api/admin/correction-requests/[id]/status/route");
  parentRequests: typeof import("@/app/api/correction-requests/route");
  myRequests: typeof import("@/app/api/correction-requests/mine/route");
  contentLibrary: typeof import("@/app/api/content-library/route");
};
let h: Handlers;

let adminToken = "";
let parentToken = "";
let adminHouseholdId = 0;
let parentHouseholdId = 0;
let parentUserId = 0;
let adminUserId = 0;
let caillouId = 0;
let alphaId = 0;
let seedVideoIds: number[] = [];
let childId = 0;

const url = (path: string) => `http://localhost${path}`;
const json = async (response: Response) => ({
  status: response.status,
  body: await response.json(),
});
const post = (path: string, body: unknown) =>
  new Request(url(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const patch = (path: string, body: unknown) =>
  new Request(url(path), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const params = (id: number | string) => ({ params: Promise.resolve({ id: String(id) }) });

const asAdmin = () => (currentToken = adminToken);
const asParent = () => (currentToken = parentToken);
const asAnonymous = () => (currentToken = undefined);

const markdown = (
  rows: { level: number | string; title: string; category: string; publisher: string; id: string }[],
) =>
  [
    "# Batch",
    "",
    "| # | Level | Title | Category | Publisher | YouTube URL |",
    "|---:|---:|---|---|---|---|",
    ...rows.map(
      (row, index) =>
        `| ${index + 1} | ${row.level} | ${row.title} | ${row.category} | ${row.publisher} | https://www.youtube.com/watch?v=${row.id} |`,
    ),
    "",
  ].join("\n");

beforeAll(async () => {
  db = createTestDatabase();
  m = await importModules();

  h = {
    videos: await import("@/app/api/admin/videos/route"),
    video: await import("@/app/api/admin/videos/[id]/route"),
    videoEnabled: await import("@/app/api/admin/videos/[id]/enabled/route"),
    importValidate: await import("@/app/api/admin/videos/import/validate/route"),
    importRun: await import("@/app/api/admin/videos/import/route"),
    channels: await import("@/app/api/admin/channels/route"),
    channel: await import("@/app/api/admin/channels/[id]/route"),
    channelEnabled: await import("@/app/api/admin/channels/[id]/enabled/route"),
    adminRequests: await import("@/app/api/admin/correction-requests/route"),
    adminRequestStatus: await import(
      "@/app/api/admin/correction-requests/[id]/status/route"
    ),
    parentRequests: await import("@/app/api/correction-requests/route"),
    myRequests: await import("@/app/api/correction-requests/mine/route"),
    contentLibrary: await import("@/app/api/content-library/route"),
  };

  const { createSessionToken } = await import("@/lib/session");

  const admin = await m.auth.signupUser({
    username: "adminuser",
    password: "password-admin",
  });
  const parent = await m.auth.signupUser({
    username: "parentuser",
    password: "password-parent",
  });

  adminUserId = admin.user.id;
  parentUserId = parent.user.id;
  adminHouseholdId = admin.household.id;
  parentHouseholdId = parent.household.id;
  adminToken = createSessionToken(admin.user.id);
  parentToken = createSessionToken(parent.user.id);

  // 운영자 권한은 기존 HouseholdMember.role 로 부여한다.
  await m.prisma.householdMember.updateMany({
    where: { userId: admin.user.id },
    data: { role: HOUSEHOLD_ROLE.ADMIN },
  });

  const library = await seedTestLibrary(m);
  caillouId = library.caillou.id;
  alphaId = library.alpha.id;
  seedVideoIds = library.videos.map((video) => video.id);

  childId = (await m.children.createChild(parentHouseholdId, "민준")).id;
});

afterAll(async () => {
  await m?.prisma.$disconnect();
  db?.cleanup();
});

// ---------------------------------------------------------------------------
// Scenario A — Admin 접근 권한
// ---------------------------------------------------------------------------
describe("A. Admin 접근", () => {
  it("로그인하지 않으면 401", async () => {
    asAnonymous();
    const result = await json(await h.videos.GET(new Request(url("/api/admin/videos"))));
    expect(result.status).toBe(401);
  });

  it("ADMIN 이 아닌 Parent 는 403", async () => {
    asParent();
    expect((await json(await h.videos.GET(new Request(url("/api/admin/videos"))))).status).toBe(403);
    expect(
      (await json(await h.channels.GET())).status,
    ).toBe(403);
    expect(
      (await json(await h.adminRequests.GET(new Request(url("/api/admin/correction-requests")))))
        .status,
    ).toBe(403);
  });

  it("ADMIN 은 접근할 수 있다", async () => {
    asAdmin();
    const result = await json(await h.videos.GET(new Request(url("/api/admin/videos"))));
    expect(result.status).toBe(200);
    expect(result.body.count).toBe(5);
  });

  it("page guard 는 ADMIN 여부로 판정한다", async () => {
    const session = await m.auth.resolveSessionUser(adminUserId);
    const parentSession = await m.auth.resolveSessionUser(parentUserId);
    expect(m.auth.isAdminSession(session)).toBe(true);
    expect(m.auth.isAdminSession(parentSession)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Scenario B / C — 단건 등록과 중복
// ---------------------------------------------------------------------------
describe("B. Video 단건 등록", () => {
  it("등록하면 기존 Content Library 조회에도 나온다", async () => {
    asAdmin();
    const created = await json(
      await h.videos.POST(
        post("/api/admin/videos", {
          channelId: caillouId,
          level: 3,
          title: "Caillou at the Park",
          category: "DAILY_LIFE",
          publisher: "Caillou - WildBrain",
          youtubeUrl: "https://www.youtube.com/watch?v=newvideo001",
        }),
      ),
    );
    expect(created.status).toBe(201);
    expect(created.body.video).toMatchObject({
      title: "Caillou at the Park",
      publisher: "Caillou - WildBrain",
      youtubeVideoId: "newvideo001",
      enabled: true,
    });

    const library = await json(
      await h.contentLibrary.GET(new Request(url("/api/content-library"))),
    );
    expect(
      library.body.videos.some(
        (video: { title: string }) => video.title === "Caillou at the Park",
      ),
    ).toBe(true);
  });

  it("필수값과 형식을 검증한다", async () => {
    asAdmin();
    const base = {
      channelId: caillouId,
      level: 3,
      title: "T",
      category: "STORY",
      publisher: "P",
      youtubeUrl: "https://www.youtube.com/watch?v=validvideo1",
    };
    const cases = [
      { ...base, publisher: "  " },
      { ...base, title: "" },
      { ...base, level: 9 },
      { ...base, category: "MATH" },
      { ...base, youtubeUrl: "https://youtu.be/validvideo1" },
    ];
    for (const payload of cases) {
      const result = await json(await h.videos.POST(post("/api/admin/videos", payload)));
      expect(result.status).toBe(400);
    }
  });

  it("가정 전용(직접 등록) 영상은 운영자가 수정할 수 없다", async () => {
    asParent();
    const collection = await m.collections.getOrCreateChildCollection(
      parentHouseholdId,
      childId,
    );
    const custom = await m.collections.addCustomVideo(parentHouseholdId, collection.id, {
      url: "https://youtu.be/householdv1",
      title: "가정 전용 영상",
      channelId: caillouId,
      level: 3,
      category: "STORY",
    });

    asAdmin();
    const result = await json(
      await h.video.PUT(
        new Request(url(`/api/admin/videos/${custom.video.id}`), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channelId: caillouId,
            level: 3,
            title: "수정 시도",
            category: "STORY",
            publisher: "X",
            youtubeUrl: "https://www.youtube.com/watch?v=householdv1",
          }),
        }),
        params(custom.video.id),
      ),
    );
    expect(result.status).toBe(400);
    expect(result.body.error).toContain("직접 등록한 영상");
  });
});

describe("C. 중복 Video", () => {
  it("같은 Video ID 는 저장을 막고 기존 영상을 알려 준다", async () => {
    asAdmin();
    const result = await json(
      await h.videos.POST(
        post("/api/admin/videos", {
          channelId: caillouId,
          level: 3,
          title: "중복 시도",
          category: "STORY",
          publisher: "Caillou - WildBrain",
          youtubeUrl: "https://www.youtube.com/watch?v=aaaaaaaaaa1",
        }),
      ),
    );
    expect(result.status).toBe(400);
    expect(result.body.error).toContain("이미 등록된 영상");
    expect(result.body.error).toContain("Caillou Goes to School");
  });
});

// ---------------------------------------------------------------------------
// Scenario D / E — Disable 과 Delete
// ---------------------------------------------------------------------------
describe("D. Disable", () => {
  it("Admin 목록에는 남고 아이 화면에서는 빠진다", async () => {
    asAdmin();
    const videoId = seedVideoIds[0];

    const before = await m.childContent.getChildCatalog(parentHouseholdId, childId);
    expect(before.items.some((item) => item.id === videoId)).toBe(true);

    const patched = await json(
      await h.videoEnabled.PATCH(
        patch(`/api/admin/videos/${videoId}/enabled`, { enabled: false }),
        params(videoId),
      ),
    );
    expect(patched.status).toBe(200);
    expect(patched.body.video.enabled).toBe(false);

    const adminList = await json(
      await h.videos.GET(new Request(url("/api/admin/videos"))),
    );
    expect(
      adminList.body.videos.some((video: { id: number }) => video.id === videoId),
    ).toBe(true);

    const after = await m.childContent.getChildCatalog(parentHouseholdId, childId);
    expect(after.items.some((item) => item.id === videoId)).toBe(false);

    const recommended = (await import("@/lib/recommendation")).recommendVideos(
      after.items,
      [],
      10,
    );
    expect(recommended.some((item) => item.id === videoId)).toBe(false);

    // 기존 read-only API 는 계약대로 enabled 플래그를 그대로 노출한다(응답 구조 불변).
    const library = await json(
      await h.contentLibrary.GET(new Request(url("/api/content-library"))),
    );
    const listed = library.body.videos.find(
      (video: { title: string }) => video.title === "Caillou Goes to School",
    );
    expect(listed.enabled).toBe(false);

    // 원복
    await h.videoEnabled.PATCH(
      patch(`/api/admin/videos/${videoId}/enabled`, { enabled: true }),
      params(videoId),
    );
  });
});

describe("E. Delete", () => {
  it("완전 삭제하면 종속 데이터도 함께 정리된다", async () => {
    asAdmin();
    const created = await json(
      await h.videos.POST(
        post("/api/admin/videos", {
          channelId: alphaId,
          level: 2,
          title: "삭제 대상",
          category: "PHONICS",
          publisher: "Alphablocks",
          youtubeUrl: "https://www.youtube.com/watch?v=deleteme001",
        }),
      ),
    );
    const videoId = created.body.video.id as number;

    // 종속 데이터(Collection 항목 · 진행 기록 · 시청 세션 · 수정 요청) 생성
    const collection = await m.collections.getOrCreateChildCollection(
      parentHouseholdId,
      childId,
    );
    await m.collections.addVideoToCollection(parentHouseholdId, collection.id, videoId);
    const watchSessionId = await m.progress.startWatchSession(childId, videoId, 0);
    await m.progress.recordProgressTick({
      childId,
      videoId,
      sessionId: watchSessionId,
      positionSeconds: 30,
      durationSeconds: 300,
      watchDeltaSeconds: 10,
    });
    await m.prisma.correctionRequest.create({
      data: {
        videoId,
        requesterId: parentUserId,
        errorType: "OTHER",
        description: "삭제 확인용",
      },
    });

    const deleted = await json(
      await h.video.DELETE(new Request(url(`/api/admin/videos/${videoId}`), { method: "DELETE" }), params(videoId)),
    );
    expect(deleted.status).toBe(200);

    expect(await m.prisma.video.findUnique({ where: { id: videoId } })).toBeNull();
    expect(await m.prisma.collectionVideo.count({ where: { videoId } })).toBe(0);
    expect(await m.prisma.videoProgress.count({ where: { videoId } })).toBe(0);
    expect(await m.prisma.watchSession.count({ where: { videoId } })).toBe(0);
    expect(await m.prisma.correctionRequest.count({ where: { videoId } })).toBe(0);

    const library = await json(
      await h.contentLibrary.GET(new Request(url("/api/content-library"))),
    );
    expect(
      library.body.videos.some((video: { title: string }) => video.title === "삭제 대상"),
    ).toBe(false);

    // 다른 아이 데이터는 남아 있어야 한다
    expect(await m.prisma.child.findUnique({ where: { id: childId } })).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Scenario F / G — Markdown Import (파일 / 붙여넣기)
// ---------------------------------------------------------------------------
describe("F·G. Markdown Import", () => {
  const batch = markdown([
    { level: 3, title: "Import One", category: "STORY", publisher: "PBS KIDS", id: "importvid01" },
    { level: 9, title: "Import Bad Level", category: "STORY", publisher: "PBS KIDS", id: "importvid02" },
    { level: 3, title: "Import Dup", category: "STORY", publisher: "PBS KIDS", id: "aaaaaaaaaa2" },
    { level: 4, title: "Import Two", category: "FAMILY", publisher: "PBS KIDS", id: "importvid03" },
  ]);

  it("validate 는 행별 결과를 주고 DB 를 바꾸지 않는다", async () => {
    asAdmin();
    const before = await m.prisma.video.count();
    const result = await json(
      await h.importValidate.POST(
        post("/api/admin/videos/import/validate", { channelId: caillouId, markdown: batch }),
      ),
    );

    expect(result.status).toBe(200);
    expect(result.body.validCount).toBe(2);
    expect(result.body.duplicateCount).toBe(1);
    expect(result.body.invalidCount).toBe(1);
    expect(result.body.rows[1].errors[0]).toContain("Level");
    expect(result.body.rows[2].status).toBe("DUPLICATE");
    expect(await m.prisma.video.count()).toBe(before);
  });

  it("파일에서 읽은 문자열과 붙여넣은 문자열의 결과가 같다", async () => {
    asAdmin();
    const fromFile = new File([batch], "batch.md", { type: "text/markdown" });
    const fileText = await fromFile.text();

    const a = await json(
      await h.importValidate.POST(
        post("/api/admin/videos/import/validate", { channelId: caillouId, markdown: fileText }),
      ),
    );
    const b = await json(
      await h.importValidate.POST(
        post("/api/admin/videos/import/validate", { channelId: caillouId, markdown: batch }),
      ),
    );
    expect(a.body.rows).toEqual(b.body.rows);
  });

  it("선택한 VALID 행만 등록한다", async () => {
    asAdmin();
    const result = await json(
      await h.importRun.POST(
        post("/api/admin/videos/import", {
          channelId: caillouId,
          markdown: batch,
          selectedRows: [1],
        }),
      ),
    );

    expect(result.status).toBe(200);
    expect(result.body.importedCount).toBe(1);
    expect(result.body.importedRows).toEqual([1]);

    expect(
      await m.prisma.video.findUnique({ where: { youtubeVideoId: "importvid01" } }),
    ).not.toBeNull();
    // 선택하지 않은 VALID 행은 등록되지 않는다
    expect(
      await m.prisma.video.findUnique({ where: { youtubeVideoId: "importvid03" } }),
    ).toBeNull();
    // INVALID / DUPLICATE 행도 등록되지 않는다
    expect(
      await m.prisma.video.findUnique({ where: { youtubeVideoId: "importvid02" } }),
    ).toBeNull();
  });

  it("등록 직전에 다시 검증하므로 이미 등록된 행은 저장되지 않는다", async () => {
    asAdmin();
    const result = await json(
      await h.importRun.POST(
        post("/api/admin/videos/import", {
          channelId: caillouId,
          markdown: batch,
          selectedRows: [1, 4],
        }),
      ),
    );
    // 1행은 방금 등록되어 이제 DUPLICATE, 4행만 새로 등록된다
    expect(result.body.importedRows).toEqual([4]);
    expect(result.body.duplicateCount).toBe(2);
    expect(
      await m.prisma.video.count({ where: { youtubeVideoId: "importvid01" } }),
    ).toBe(1);
  });

  it("selectedRows 를 생략하면 VALID 행 전체를 등록한다", async () => {
    asAdmin();
    const allBatch = markdown([
      { level: 3, title: "Omit One", category: "STORY", publisher: "PBS KIDS", id: "omitrow0001" },
      { level: 4, title: "Omit Two", category: "FAMILY", publisher: "PBS KIDS", id: "omitrow0002" },
    ]);
    const result = await json(
      await h.importRun.POST(
        post("/api/admin/videos/import", { channelId: caillouId, markdown: allBatch }),
      ),
    );
    expect(result.body.importedCount).toBe(2);
    expect(result.body.importedRows).toEqual([1, 2]);
    expect(
      await m.prisma.video.count({
        where: { youtubeVideoId: { in: ["omitrow0001", "omitrow0002"] } },
      }),
    ).toBe(2);
  });

  it("selectedRows 가 빈 배열이면 한 건도 등록하지 않는다", async () => {
    asAdmin();
    const emptyBatch = markdown([
      { level: 3, title: "Empty One", category: "STORY", publisher: "PBS KIDS", id: "emptyrow001" },
      { level: 3, title: "Empty Two", category: "STORY", publisher: "PBS KIDS", id: "emptyrow002" },
    ]);
    const before = await m.prisma.video.count();

    const result = await json(
      await h.importRun.POST(
        post("/api/admin/videos/import", {
          channelId: caillouId,
          markdown: emptyBatch,
          selectedRows: [],
        }),
      ),
    );

    expect(result.status).toBe(200);
    expect(result.body.importedCount).toBe(0);
    expect(result.body.importedRows).toEqual([]);
    expect(result.body.validCount).toBe(2);
    expect(result.body.skippedCount).toBe(2);
    expect(await m.prisma.video.count()).toBe(before);
    expect(
      await m.prisma.video.count({
        where: { youtubeVideoId: { in: ["emptyrow001", "emptyrow002"] } },
      }),
    ).toBe(0);
  });

  it("selectedRows 에 일부만 주면 그 행만 등록한다", async () => {
    asAdmin();
    const partialBatch = markdown([
      { level: 3, title: "Partial One", category: "STORY", publisher: "PBS KIDS", id: "partrow0001" },
      { level: 3, title: "Partial Two", category: "STORY", publisher: "PBS KIDS", id: "partrow0002" },
      { level: 3, title: "Partial Three", category: "STORY", publisher: "PBS KIDS", id: "partrow0003" },
    ]);
    const result = await json(
      await h.importRun.POST(
        post("/api/admin/videos/import", {
          channelId: caillouId,
          markdown: partialBatch,
          selectedRows: [2],
        }),
      ),
    );

    expect(result.body.importedCount).toBe(1);
    expect(result.body.importedRows).toEqual([2]);
    expect(
      await m.prisma.video.findUnique({ where: { youtubeVideoId: "partrow0002" } }),
    ).not.toBeNull();
    for (const id of ["partrow0001", "partrow0003"]) {
      expect(await m.prisma.video.findUnique({ where: { youtubeVideoId: id } })).toBeNull();
    }
  });

  it("선택한 행이 VALID 가 아니면 등록하지 않는다", async () => {
    asAdmin();
    const mixedBatch = markdown([
      { level: 9, title: "Bad Only", category: "STORY", publisher: "PBS KIDS", id: "badrow00001" },
      { level: 3, title: "Good One", category: "STORY", publisher: "PBS KIDS", id: "goodrow0001" },
    ]);
    const result = await json(
      await h.importRun.POST(
        post("/api/admin/videos/import", {
          channelId: caillouId,
          markdown: mixedBatch,
          selectedRows: [1],
        }),
      ),
    );
    expect(result.body.importedCount).toBe(0);
    expect(
      await m.prisma.video.findUnique({ where: { youtubeVideoId: "badrow00001" } }),
    ).toBeNull();
  });

  it("필수 헤더가 없으면 등록하지 않는다", async () => {
    asAdmin();
    const result = await json(
      await h.importRun.POST(
        post("/api/admin/videos/import", {
          channelId: caillouId,
          markdown: "| Level | Title |\n|---|---|\n| 3 | A |",
        }),
      ),
    );
    expect(result.status).toBe(400);
    expect(result.body.error).toContain("필수 컬럼");
  });

  it("Parent 는 Import API 를 쓸 수 없다", async () => {
    asParent();
    expect(
      (
        await json(
          await h.importRun.POST(
            post("/api/admin/videos/import", { channelId: caillouId, markdown: batch }),
          ),
        )
      ).status,
    ).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Scenario H — Correction Request
// ---------------------------------------------------------------------------
describe("H. Parent 수정 요청", () => {
  let requestId = 0;

  it("Parent 가 신고하면 OPEN 으로 생성되고 requesterId 는 세션에서 정해진다", async () => {
    asParent();
    const result = await json(
      await h.parentRequests.POST(
        post("/api/correction-requests", {
          videoId: seedVideoIds[1],
          errorType: "PLAYBACK_UNAVAILABLE",
          description: "재생이 안 돼요",
          requesterId: adminUserId, // 클라이언트 값은 무시되어야 한다
        }),
      ),
    );
    expect(result.status).toBe(201);
    expect(result.body.request.status).toBe("OPEN");
    expect(result.body.request.requesterId).toBe(parentUserId);
    requestId = result.body.request.id;
  });

  it("잘못된 입력은 거부한다", async () => {
    asParent();
    const cases = [
      { videoId: seedVideoIds[1], errorType: "NOPE", description: "x" },
      { videoId: seedVideoIds[1], errorType: "OTHER", description: "   " },
      { videoId: 999999, errorType: "OTHER", description: "x" },
    ];
    for (const payload of cases) {
      expect(
        (await json(await h.parentRequests.POST(post("/api/correction-requests", payload))))
          .status,
      ).toBe(400);
    }
  });

  it("mine 은 본인 요청만 돌려준다", async () => {
    asParent();
    const mine = await json(await h.myRequests.GET());
    expect(mine.body.requests.every((r: { requesterId: number }) => r.requesterId === parentUserId)).toBe(true);

    asAdmin();
    const adminMine = await json(await h.myRequests.GET());
    expect(adminMine.body.requests.some((r: { id: number }) => r.id === requestId)).toBe(false);
  });

  it("Admin 은 목록을 필터하고 상태를 바꿀 수 있다", async () => {
    asAdmin();
    const list = await json(
      await h.adminRequests.GET(
        new Request(url("/api/admin/correction-requests?status=OPEN&errorType=PLAYBACK_UNAVAILABLE")),
      ),
    );
    expect(list.body.requests.some((r: { id: number }) => r.id === requestId)).toBe(true);
    expect(list.body.requests[0]).toMatchObject({
      requesterName: "parentuser",
      status: "OPEN",
    });

    const resolved = await json(
      await h.adminRequestStatus.PATCH(
        patch(`/api/admin/correction-requests/${requestId}/status`, { status: "RESOLVED" }),
        params(requestId),
      ),
    );
    expect(resolved.status).toBe(200);
    expect(resolved.body.request.status).toBe("RESOLVED");
    expect(resolved.body.request.resolvedAt).not.toBeNull();

    // 이미 처리된 요청은 다시 바꾸지 않는다
    expect(
      (
        await json(
          await h.adminRequestStatus.PATCH(
            patch(`/api/admin/correction-requests/${requestId}/status`, { status: "REJECTED" }),
            params(requestId),
          ),
        )
      ).status,
    ).toBe(400);
  });

  it("Parent 는 상태를 바꿀 수 없다", async () => {
    asParent();
    const result = await json(
      await h.adminRequestStatus.PATCH(
        patch(`/api/admin/correction-requests/${requestId}/status`, { status: "REJECTED" }),
        params(requestId),
      ),
    );
    expect(result.status).toBe(403);
  });

  it("REJECTED 도 resolvedAt 을 기록한다", async () => {
    asParent();
    const created = await json(
      await h.parentRequests.POST(
        post("/api/correction-requests", {
          videoId: seedVideoIds[2],
          errorType: "WRONG_LEVEL",
          description: "Level 이 너무 낮아요",
        }),
      ),
    );
    asAdmin();
    const rejected = await json(
      await h.adminRequestStatus.PATCH(
        patch(`/api/admin/correction-requests/${created.body.request.id}/status`, {
          status: "REJECTED",
        }),
        params(created.body.request.id),
      ),
    );
    expect(rejected.body.request.status).toBe("REJECTED");
    expect(rejected.body.request.resolvedAt).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Scenario I — 필터
// ---------------------------------------------------------------------------
describe("I. Admin 목록 필터", () => {
  it("Channel / Level / Category / Enabled / 검색이 동작한다", async () => {
    asAdmin();
    const call = async (query: string) =>
      (await json(await h.videos.GET(new Request(url(`/api/admin/videos${query}`))))).body;

    const all = await call("");
    expect(all.count).toBeGreaterThan(0);

    const byChannel = await call("?channel=alphablocks");
    expect(byChannel.videos.every((v: { channelSlug: string }) => v.channelSlug === "alphablocks")).toBe(true);

    const byLevel = await call("?level=3");
    expect(byLevel.videos.every((v: { level: number }) => v.level === 3)).toBe(true);

    const byCategory = await call("?category=PHONICS");
    expect(byCategory.videos.every((v: { category: string }) => v.category === "PHONICS")).toBe(true);

    await h.videoEnabled.PATCH(
      patch(`/api/admin/videos/${seedVideoIds[3]}/enabled`, { enabled: false }),
      params(seedVideoIds[3]),
    );
    const disabled = await call("?enabled=false");
    expect(disabled.videos.every((v: { enabled: boolean }) => v.enabled === false)).toBe(true);
    expect(disabled.videos.some((v: { id: number }) => v.id === seedVideoIds[3])).toBe(true);

    const enabled = await call("?enabled=true");
    expect(enabled.videos.some((v: { id: number }) => v.id === seedVideoIds[3])).toBe(false);

    const search = await call("?q=Camping");
    expect(search.videos.some((v: { title: string }) => v.title.includes("Camping"))).toBe(true);

    const byPublisher = await call("?q=Alphablocks");
    expect(byPublisher.count).toBeGreaterThan(0);

    const byVideoId = await call("?q=aaaaaaaaaa2");
    expect(byVideoId.videos[0].youtubeVideoId).toBe("aaaaaaaaaa2");

    await h.videoEnabled.PATCH(
      patch(`/api/admin/videos/${seedVideoIds[3]}/enabled`, { enabled: true }),
      params(seedVideoIds[3]),
    );
  });
});

// ---------------------------------------------------------------------------
// Channel CRUD
// ---------------------------------------------------------------------------
describe("Channel 관리", () => {
  let createdChannelId = 0;

  it("이름으로 slug 를 자동 생성한다", async () => {
    asAdmin();
    const result = await json(
      await h.channels.POST(post("/api/admin/channels", { name: "Thomas & Friends" })),
    );
    expect(result.status).toBe(201);
    expect(result.body.channel.slug).toBe("thomas-and-friends");
    createdChannelId = result.body.channel.id;
  });

  it("같은 slug/이름은 거부한다", async () => {
    asAdmin();
    const result = await json(
      await h.channels.POST(post("/api/admin/channels", { name: "Thomas & Friends" })),
    );
    expect(result.status).toBe(400);
    expect(result.body.error).toContain("이미 같은 Channel");
  });

  it("이름을 바꿔도 slug 는 유지된다", async () => {
    asAdmin();
    const result = await json(
      await h.channel.PUT(
        new Request(url(`/api/admin/channels/${createdChannelId}`), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Thomas and Friends UK" }),
        }),
        params(createdChannelId),
      ),
    );
    expect(result.body.channel.name).toBe("Thomas and Friends UK");
    expect(result.body.channel.slug).toBe("thomas-and-friends");
  });

  it("Channel enable/disable 은 Video.enabled 를 바꾸지 않는다", async () => {
    asAdmin();
    const before = await m.prisma.video.findMany({
      where: { channelId: caillouId },
      select: { id: true, enabled: true },
    });
    await h.channelEnabled.PATCH(
      patch(`/api/admin/channels/${caillouId}/enabled`, { enabled: false }),
      params(caillouId),
    );
    const after = await m.prisma.video.findMany({
      where: { channelId: caillouId },
      select: { id: true, enabled: true },
    });
    expect(after).toEqual(before);
    await h.channelEnabled.PATCH(
      patch(`/api/admin/channels/${caillouId}/enabled`, { enabled: true }),
      params(caillouId),
    );
  });

  it("영상이 남아 있는 Channel 은 삭제하지 않는다", async () => {
    asAdmin();
    const result = await json(
      await h.channel.DELETE(
        new Request(url(`/api/admin/channels/${caillouId}`), { method: "DELETE" }),
        params(caillouId),
      ),
    );
    expect(result.status).toBe(400);
    expect(result.body.error).toContain("영상");
    expect(await m.prisma.channel.findUnique({ where: { id: caillouId } })).not.toBeNull();
  });

  it("빈 Channel 은 삭제할 수 있다", async () => {
    asAdmin();
    const result = await json(
      await h.channel.DELETE(
        new Request(url(`/api/admin/channels/${createdChannelId}`), { method: "DELETE" }),
        params(createdChannelId),
      ),
    );
    expect(result.status).toBe(200);
    expect(
      await m.prisma.channel.findUnique({ where: { id: createdChannelId } }),
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 기존 흐름 회귀
// ---------------------------------------------------------------------------
describe("기존 Child/Parent 흐름 회귀", () => {
  it("아이 진행 기록과 Household 격리가 유지된다", async () => {
    const catalog = await m.childContent.getChildCatalog(parentHouseholdId, childId);
    expect(catalog.items.length).toBeGreaterThan(0);

    const videoId = catalog.items[0].id;
    await m.progress.recordProgressTick({
      childId,
      videoId,
      positionSeconds: 300,
      durationSeconds: 300,
      watchDeltaSeconds: 10,
    });
    const progress = await m.prisma.videoProgress.findUnique({
      where: { childId_videoId: { childId, videoId } },
    });
    expect(progress?.status).toBe(PROGRESS_STATUS.COMPLETED);

    await expect(
      m.auth.authorizeChild(adminHouseholdId, childId),
    ).rejects.toThrow();
  });

  it("content-library 응답 계약이 그대로다", async () => {
    asAnonymous();
    const result = await json(
      await h.contentLibrary.GET(new Request(url("/api/content-library?level=3"))),
    );
    expect(result.status).toBe(200);
    expect(Object.keys(result.body.videos[0]).sort()).toEqual([
      "category",
      "channel",
      "enabled",
      "level",
      "title",
      "youtubeUrl",
    ]);
  });
});
