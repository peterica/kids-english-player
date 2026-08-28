import { prisma } from "./db";
import { AppError } from "./errors";
import { SEQUENCE_STEP } from "./constants";
import {
  buildThumbnailUrl,
  buildYouTubeWatchUrl,
  fetchYouTubeTitle,
  parseYouTubeVideoId,
} from "./youtube";

export type AddVideoInput = {
  url: string;
  title?: string;
};

export async function addVideoFromUrl(input: AddVideoInput) {
  const videoId = parseYouTubeVideoId(input.url);
  if (!videoId) {
    throw new AppError(
      "YouTube 주소를 인식하지 못했습니다. watch, youtu.be, shorts, embed 형식의 주소를 입력해 주세요.",
    );
  }

  const duplicate = await prisma.video.findUnique({
    where: { youtubeVideoId: videoId },
  });
  if (duplicate) {
    throw new AppError(`이미 등록된 영상입니다: ${duplicate.title}`);
  }

  const manualTitle = input.title?.trim();
  const fetchedTitle = manualTitle ? null : await fetchYouTubeTitle(videoId);
  const title = manualTitle || fetchedTitle || `제목 없음 (${videoId})`;

  const last = await prisma.video.findFirst({ orderBy: { sequence: "desc" } });
  const sequence = (last?.sequence ?? 0) + SEQUENCE_STEP;

  const created = await prisma.video.create({
    data: {
      youtubeVideoId: videoId,
      youtubeUrl: buildYouTubeWatchUrl(videoId),
      title,
      thumbnailUrl: buildThumbnailUrl(videoId),
      sequence,
    },
  });

  return {
    video: created,
    titleFetched: Boolean(fetchedTitle),
  };
}

export async function renameVideo(videoId: number, title: string) {
  const trimmed = title.trim();
  if (!trimmed) throw new AppError("제목을 입력해 주세요.");
  if (trimmed.length > 200) throw new AppError("제목이 너무 깁니다. (최대 200자)");
  await requireVideo(videoId);
  await prisma.video.update({ where: { id: videoId }, data: { title: trimmed } });
}

export async function setVideoEnabled(videoId: number, enabled: boolean) {
  await requireVideo(videoId);
  await prisma.video.update({ where: { id: videoId }, data: { enabled } });
}

export async function deleteVideo(videoId: number) {
  await requireVideo(videoId);
  await prisma.video.delete({ where: { id: videoId } });
}

/** 위/아래 버튼으로 순서를 바꾼다. 인접한 영상과 sequence 를 교환한다. */
export async function moveVideo(videoId: number, direction: "up" | "down") {
  const video = await requireVideo(videoId);
  const neighbor = await prisma.video.findFirst({
    where:
      direction === "up"
        ? { sequence: { lt: video.sequence } }
        : { sequence: { gt: video.sequence } },
    orderBy: { sequence: direction === "up" ? "desc" : "asc" },
  });
  if (!neighbor) return;

  await prisma.$transaction([
    prisma.video.update({
      where: { id: video.id },
      data: { sequence: neighbor.sequence },
    }),
    prisma.video.update({
      where: { id: neighbor.id },
      data: { sequence: video.sequence },
    }),
  ]);
}

export async function requireVideo(videoId: number) {
  const video = await prisma.video.findUnique({ where: { id: videoId } });
  if (!video) throw new AppError("영상을 찾을 수 없습니다.");
  return video;
}
