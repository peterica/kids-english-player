import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

/**
 * Content Library 를 사람이 읽고 다시 가져올 수 있는 문서로 내보낸다.
 *
 *   npm run content:export                 # content-backup/ 에 생성
 *   npm run content:export -- <디렉터리>
 *
 * 채널별 Markdown 은 운영자 화면의 일괄등록 형식
 * (| Level | Title | Category | Publisher | YouTube URL |) 과 같으므로
 * 그대로 다시 붙여넣어 복구할 수 있다.
 *
 * 개인정보(계정·아이·시청기록)는 내보내지 않는다. 공용 Content 만 대상이다.
 */
const prisma = new PrismaClient();

const watchUrl = (videoId: string) => `https://www.youtube.com/watch?v=${videoId}`;
/** 표 안에서 셀 구분자로 오해되지 않도록 파이프만 이스케이프한다. */
const cell = (value: string) => (value ?? "").replace(/\|/g, "\\|").trim();

async function main() {
  const outDir = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "content-backup";

  const channels = await prisma.channel.findMany({
    orderBy: { id: "asc" },
    include: {
      videos: {
        // 공용 Library 만 백업한다. 가정이 직접 등록한 영상은 개인 데이터다.
        where: { householdId: null },
        orderBy: [{ level: "asc" }, { sequence: "asc" }, { id: "asc" }],
      },
    },
  });

  const total = channels.reduce((sum, c) => sum + c.videos.length, 0);
  const exportedAt = new Date().toISOString().slice(0, 19).replace("T", " ");

  rmSync(join(outDir, "channels"), { recursive: true, force: true });
  mkdirSync(join(outDir, "channels"), { recursive: true });

  // ── 채널별 Markdown (그대로 재등록 가능) ──
  for (const channel of channels) {
    const lines: string[] = [
      `# ${channel.name}`,
      "",
      `- slug: \`${channel.slug}\``,
      `- 영상: ${channel.videos.length}편`,
      `- 노출: ${channel.enabled ? "사용" : "해제"}`,
      channel.description ? `- 설명: ${channel.description}` : null,
      "",
      "운영자 화면 → Content Library → 일괄등록에 아래 표를 그대로 붙여 넣으면 복구된다.",
      "",
      "| Level | Title | Category | Publisher | YouTube URL |",
      "| --- | --- | --- | --- | --- |",
    ].filter((line): line is string => line !== null);

    for (const video of channel.videos) {
      lines.push(
        `| ${video.level} | ${cell(video.title)} | ${cell(video.category)} | ${cell(
          video.publisher,
        )} | ${watchUrl(video.youtubeVideoId)} |`,
      );
    }
    lines.push("");
    writeFileSync(join(outDir, "channels", `${channel.slug}.md`), lines.join("\n"), "utf8");
  }

  // ── 전체 목록(읽기용 색인) ──
  const index: string[] = [
    "# Content Library 백업",
    "",
    `- 내보낸 시각: ${exportedAt}`,
    `- 채널 ${channels.length}개 / 영상 ${total}편`,
    "- 대상: 공용 Content Library (계정·아이·시청기록은 포함하지 않는다)",
    "",
    "## 복구 방법",
    "",
    "```text",
    "1. seed 로 복구  : prisma/seed-content.ts 가 원본이며 npm run db:seed 는 여러 번 실행해도 안전하다",
    "2. 문서로 복구   : channels/<slug>.md 의 표를 운영자 일괄등록에 붙여 넣는다",
    "3. 파일로 복구   : data/app.db 를 복사해 둔 백업으로 되돌린다 (가장 빠름)",
    "```",
    "",
    "## 채널",
    "",
    "| # | 채널 | slug | 영상 | 노출 | Level 분포 |",
    "| --- | --- | --- | --- | --- | --- |",
  ];

  channels.forEach((channel, i) => {
    const levels = channel.videos.reduce<Record<number, number>>((acc, v) => {
      acc[v.level] = (acc[v.level] ?? 0) + 1;
      return acc;
    }, {});
    const dist = Object.keys(levels)
      .map(Number)
      .sort((a, b) => a - b)
      .map((level) => `L${level}:${levels[level]}`)
      .join(" ");
    index.push(
      `| ${i + 1} | [${channel.name}](channels/${channel.slug}.md) | \`${channel.slug}\` | ${
        channel.videos.length
      } | ${channel.enabled ? "사용" : "해제"} | ${dist || "-"} |`,
    );
  });
  index.push("");
  writeFileSync(join(outDir, "README.md"), index.join("\n"), "utf8");

  // ── 기계 판독용 스냅샷 ──
  writeFileSync(
    join(outDir, "content-library.json"),
    JSON.stringify(
      {
        exportedAt,
        channelCount: channels.length,
        videoCount: total,
        channels: channels.map((channel) => ({
          slug: channel.slug,
          name: channel.name,
          description: channel.description,
          colorKey: channel.colorKey,
          enabled: channel.enabled,
          videos: channel.videos.map((v) => ({
            youtubeVideoId: v.youtubeVideoId,
            title: v.title,
            publisher: v.publisher,
            category: v.category,
            level: v.level,
            durationSeconds: v.durationSeconds,
            sequence: v.sequence,
            enabled: v.enabled,
          })),
        })),
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  console.log(`${outDir}/ 에 백업했습니다.`);
  console.log(`  채널 ${channels.length}개 / 영상 ${total}편`);
  console.log(`  README.md · content-library.json · channels/*.md`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
