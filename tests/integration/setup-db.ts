import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * 통합 테스트용 임시 SQLite DB 를 만든다.
 * 개발 DB(data/app.db)를 건드리지 않기 위해 테스트마다 별도 파일을 쓴다.
 */
export function createTestDatabase() {
  const dir = mkdtempSync(join(tmpdir(), "kep-test-"));
  const file = join(dir, "test.db");
  const url = `file:${file}`;

  execFileSync("npx", ["prisma", "db", "push", "--skip-generate", "--accept-data-loss"], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });

  process.env.DATABASE_URL = url;
  return {
    url,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}
