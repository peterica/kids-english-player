import { prisma } from "../db";
import { AppError } from "../errors";
import { SEQUENCE_STEP } from "../constants";
import { buildThumbnailUrl, buildYouTubeWatchUrl } from "../youtube";
import { requireChannel } from "./channels";
import { validateMarkdownImport, type ImportPreview } from "./markdown-import";

export type ImportInput = {
  channelId: number;
  markdown: string;
  /**
   * 등록할 행 번호.
   * - 생략(undefined): VALID 행 전체 등록
   * - 빈 배열([]): 선택한 행이 없으므로 0건 등록
   * - 값이 있으면 그중 VALID 인 행만 등록
   */
  selectedRows?: number[];
};

export type ImportResult = {
  channel: { id: number; name: string; slug: string };
  importedCount: number;
  skippedCount: number;
  preview: ImportPreview;
  importedRows: number[];
};

/** DB 를 변경하지 않는 검증. 파일 업로드와 붙여넣기가 같은 경로를 쓴다. */
export async function validateImport(input: {
  channelId: number;
  markdown: string;
}): Promise<{ channel: { id: number; name: string; slug: string }; preview: ImportPreview }> {
  const channel = await requireChannel(input.channelId);
  if (!input.markdown?.trim()) throw new AppError("Markdown 내용이 비어 있습니다.");

  const existingIds = (
    await prisma.video.findMany({ select: { youtubeVideoId: true } })
  ).map((video) => video.youtubeVideoId);

  return {
    channel: { id: channel.id, name: channel.name, slug: channel.slug },
    preview: validateMarkdownImport(input.markdown, existingIds),
  };
}

/**
 * 실제 등록.
 * 클라이언트가 보낸 Preview 결과를 믿지 않고 원본 Markdown 을 같은 Validator 로 다시 검증한 뒤,
 * 선택된 VALID 행만 트랜잭션으로 저장한다.
 */
export async function runImport(input: ImportInput): Promise<ImportResult> {
  const { channel, preview } = await validateImport({
    channelId: input.channelId,
    markdown: input.markdown,
  });

  if (preview.errors.length > 0) {
    throw new AppError(preview.errors.join(" "));
  }

  // 빈 배열은 "전체 선택"이 아니라 "선택 없음"이다.
  const selected =
    input.selectedRows === undefined ? null : new Set(input.selectedRows);

  const target = preview.rows.filter(
    (row) => row.status === "VALID" && (selected === null || selected.has(row.row)),
  );

  if (target.length === 0) {
    return {
      channel,
      importedCount: 0,
      skippedCount: preview.rows.length,
      preview,
      importedRows: [],
    };
  }

  const last = await prisma.video.findFirst({
    where: { householdId: null },
    orderBy: { sequence: "desc" },
  });
  let sequence = (last?.sequence ?? 0) + SEQUENCE_STEP;

  await prisma.$transaction(
    target.map((row) => {
      const videoId = row.youtubeVideoId as string;
      const data = {
        youtubeVideoId: videoId,
        youtubeUrl: buildYouTubeWatchUrl(videoId),
        title: row.title,
        publisher: row.publisher,
        thumbnailUrl: buildThumbnailUrl(videoId),
        channelId: channel.id,
        level: row.level as number,
        category: row.category,
        sequence: (sequence += SEQUENCE_STEP),
        householdId: null,
      };
      return prisma.video.create({ data });
    }),
  );

  return {
    channel,
    importedCount: target.length,
    skippedCount: preview.rows.length - target.length,
    preview,
    importedRows: target.map((row) => row.row),
  };
}
