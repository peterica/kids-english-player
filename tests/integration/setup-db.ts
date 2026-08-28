import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * 통합 테스트용 임시 SQLite DB.
 * 개발 DB(data/app.db)를 건드리지 않도록 테스트 파일마다 별도 파일을 쓴다.
 */
export function createTestDatabase() {
  const dir = mkdtempSync(join(tmpdir(), "kep2-test-"));
  const file = join(dir, "test.db");
  const url = `file:${file}`;

  execFileSync("npx", ["prisma", "db", "push", "--skip-generate", "--accept-data-loss"], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });

  process.env.DATABASE_URL = url;
  return { url, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

export type TestModules = {
  prisma: (typeof import("@/lib/db"))["prisma"];
  auth: typeof import("@/lib/auth");
  children: typeof import("@/lib/children");
  collections: typeof import("@/lib/collections");
  library: typeof import("@/lib/library");
  childContent: typeof import("@/lib/child-content");
  progress: typeof import("@/lib/progress-service");
  autoplay: typeof import("@/lib/autoplay-service");
  stats: typeof import("@/lib/stats");
};

export async function importModules(): Promise<TestModules> {
  return {
    prisma: (await import("@/lib/db")).prisma,
    auth: await import("@/lib/auth"),
    children: await import("@/lib/children"),
    collections: await import("@/lib/collections"),
    library: await import("@/lib/library"),
    childContent: await import("@/lib/child-content"),
    progress: await import("@/lib/progress-service"),
    autoplay: await import("@/lib/autoplay-service"),
    stats: await import("@/lib/stats"),
  };
}

/** 테스트용 공용 Library (Channel 2개 + 영상 5편) */
export async function seedTestLibrary(m: TestModules) {
  const caillou = await m.prisma.channel.create({
    data: { slug: "caillou", name: "Caillou", colorKey: "c1" },
  });
  const alpha = await m.prisma.channel.create({
    data: { slug: "alphablocks", name: "Alphablocks", colorKey: "c2" },
  });

  const videos = await Promise.all(
    [
      { youtubeVideoId: "aaaaaaaaaa1", title: "Caillou Goes to School", channelId: caillou.id, level: 3, category: "SCHOOL", sequence: 10 },
      { youtubeVideoId: "aaaaaaaaaa2", title: "Caillou the Chef", channelId: caillou.id, level: 3, category: "DAILY_LIFE", sequence: 20 },
      { youtubeVideoId: "aaaaaaaaaa3", title: "Caillou Goes Camping", channelId: caillou.id, level: 4, category: "STORY", sequence: 30 },
      { youtubeVideoId: "bbbbbbbbbb1", title: "Word Magic", channelId: alpha.id, level: 2, category: "PHONICS", sequence: 40 },
      { youtubeVideoId: "bbbbbbbbbb2", title: "CVC Words", channelId: alpha.id, level: 1, category: "PHONICS", sequence: 50 },
    ].map((data) =>
      m.prisma.video.create({
        data: {
          ...data,
          youtubeUrl: `https://www.youtube.com/watch?v=${data.youtubeVideoId}`,
        },
      }),
    ),
  );

  return { caillou, alpha, videos };
}
