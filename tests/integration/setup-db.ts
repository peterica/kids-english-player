import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SCHEMA = join(ROOT, "prisma/schema.prisma");
const PRISMA_CLI = join(ROOT, "node_modules/prisma/build/index.js");

/**
 * Prisma CLI 를 현재 테스트와 같은 Node 실행 파일로 직접 호출한다.
 * `npx` 를 쓰면 워커마다 npm 캐시/레지스트리 경로를 거쳐 실패할 수 있어 경로를 고정한다.
 */
function runPrismaCli(args: string[], databaseUrl: string) {
  try {
    execFileSync(process.execPath, [PRISMA_CLI, ...args], {
      cwd: ROOT,
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        PRISMA_HIDE_UPDATE_MESSAGE: "1",
        CHECKPOINT_DISABLE: "1",
      },
      stdio: "pipe",
    });
  } catch (error) {
    const detail = error as { stderr?: Buffer; stdout?: Buffer; message?: string };
    const stderr = detail.stderr?.toString() ?? "";
    const stdout = detail.stdout?.toString() ?? "";
    throw new Error(
      [
        `prisma ${args.join(" ")} 실패 (node ${process.version})`,
        `DATABASE_URL=${databaseUrl}`,
        stderr.trim(),
        stdout.trim(),
        detail.message ?? "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
}

/**
 * schema 로 만든 빈 DB 템플릿을 한 번만 만들고 재사용한다.
 * 테스트 파일이 병렬로 돌아도 schema engine 을 여러 번 띄우지 않는다.
 * 완성된 파일만 최종 경로로 rename 해 반쯤 쓰인 템플릿을 읽는 일이 없게 한다.
 */
function ensureSchemaTemplate(): string {
  const hash = createHash("sha1").update(readFileSync(SCHEMA)).digest("hex").slice(0, 12);
  const template = join(tmpdir(), `kep2-schema-${hash}.db`);
  if (existsSync(template)) return template;

  const buildDir = mkdtempSync(join(tmpdir(), "kep2-schema-build-"));
  const building = join(buildDir, "schema.db");
  try {
    runPrismaCli(["db", "push", "--skip-generate", "--accept-data-loss"], `file:${building}`);
    renameSync(building, template);
  } finally {
    rmSync(buildDir, { recursive: true, force: true });
  }
  return template;
}

/**
 * 통합 테스트용 임시 SQLite DB.
 * 개발 DB(data/app.db)는 열지도 않고, 템플릿 파일을 복사해서 쓴다.
 */
export function createTestDatabase() {
  const dir = mkdtempSync(join(tmpdir(), "kep2-test-"));
  const file = join(dir, "test.db");
  const url = `file:${file}`;

  copyFileSync(ensureSchemaTemplate(), file);

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
      { youtubeVideoId: "aaaaaaaaaa1", title: "Caillou Goes to School", publisher: "Caillou - WildBrain", channelId: caillou.id, level: 3, category: "SCHOOL", sequence: 10 },
      { youtubeVideoId: "aaaaaaaaaa2", title: "Caillou the Chef", publisher: "Caillou - WildBrain", channelId: caillou.id, level: 3, category: "DAILY_LIFE", sequence: 20 },
      { youtubeVideoId: "aaaaaaaaaa3", title: "Caillou Goes Camping", publisher: "Caillou - WildBrain", channelId: caillou.id, level: 4, category: "STORY", sequence: 30 },
      { youtubeVideoId: "bbbbbbbbbb1", title: "Word Magic", publisher: "Alphablocks", channelId: alpha.id, level: 2, category: "PHONICS", sequence: 40 },
      { youtubeVideoId: "bbbbbbbbbb2", title: "CVC Words", publisher: "Alphablocks", channelId: alpha.id, level: 1, category: "PHONICS", sequence: 50 },
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
