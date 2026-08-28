import { prisma } from "./db";
import { AppError } from "./errors";
import { SEQUENCE_STEP } from "./constants";
import { authorizeChild, authorizeCollection } from "./auth";
import {
  buildThumbnailUrl,
  buildYouTubeWatchUrl,
  fetchYouTubeTitle,
  parseYouTubeVideoId,
} from "./youtube";
import { getVideoForHousehold } from "./library";

/** 아이별 Collection. 없으면 만들어 준다. */
export async function getOrCreateChildCollection(
  householdId: number,
  childId: number,
) {
  const child = await authorizeChild(householdId, childId);
  const existing = await prisma.collection.findFirst({
    where: { householdId, childId },
    orderBy: { id: "asc" },
  });
  if (existing) return existing;

  return prisma.collection.create({
    data: { householdId, childId, title: `${child.name} Collection` },
  });
}

export async function listCollections(householdId: number) {
  return prisma.collection.findMany({
    where: { householdId },
    orderBy: [{ childId: "asc" }, { id: "asc" }],
    include: {
      child: true,
      videos: {
        orderBy: { sequence: "asc" },
        include: { video: { include: { channel: true } } },
      },
    },
  });
}

export async function getCollectionDetail(householdId: number, collectionId: number) {
  await authorizeCollection(householdId, collectionId);
  return prisma.collection.findUnique({
    where: { id: collectionId },
    include: {
      child: true,
      videos: {
        orderBy: { sequence: "asc" },
        include: { video: { include: { channel: true } } },
      },
    },
  });
}

/** 공용 Library 영상을 아이 Collection 에 담는다. 원본 Library 는 바뀌지 않는다. */
export async function addVideoToCollection(
  householdId: number,
  collectionId: number,
  videoId: number,
) {
  await authorizeCollection(householdId, collectionId);
  const video = await getVideoForHousehold(householdId, videoId);
  if (!video) throw new AppError("영상을 찾을 수 없습니다.");

  const existing = await prisma.collectionVideo.findUnique({
    where: { collectionId_videoId: { collectionId, videoId } },
  });
  if (existing) {
    // 이미 담겨 있으면 다시 보이도록 되돌린다.
    if (!existing.enabled) {
      await prisma.collectionVideo.update({
        where: { id: existing.id },
        data: { enabled: true },
      });
      return { added: false, restored: true, title: video.title };
    }
    return { added: false, restored: false, title: video.title };
  }

  const last = await prisma.collectionVideo.findFirst({
    where: { collectionId },
    orderBy: { sequence: "desc" },
  });

  await prisma.collectionVideo.create({
    data: {
      collectionId,
      videoId,
      sequence: (last?.sequence ?? 0) + SEQUENCE_STEP,
    },
  });
  return { added: true, restored: false, title: video.title };
}

/** 아이에게 보여주지 않기(차단). Library 원본과 다른 아이에게는 영향이 없다. */
export async function setCollectionVideoEnabled(
  householdId: number,
  collectionId: number,
  videoId: number,
  enabled: boolean,
) {
  await authorizeCollection(householdId, collectionId);
  const entry = await prisma.collectionVideo.findUnique({
    where: { collectionId_videoId: { collectionId, videoId } },
  });
  if (!entry) throw new AppError("Collection 에 없는 영상입니다.");
  await prisma.collectionVideo.update({ where: { id: entry.id }, data: { enabled } });
}

/** Collection 목록에서 완전히 뺀다(허용 범위 규칙으로 되돌아간다). */
export async function removeVideoFromCollection(
  householdId: number,
  collectionId: number,
  videoId: number,
) {
  await authorizeCollection(householdId, collectionId);
  await prisma.collectionVideo.deleteMany({ where: { collectionId, videoId } });
}

export async function moveCollectionVideo(
  householdId: number,
  collectionId: number,
  videoId: number,
  direction: "up" | "down",
) {
  await authorizeCollection(householdId, collectionId);
  const current = await prisma.collectionVideo.findUnique({
    where: { collectionId_videoId: { collectionId, videoId } },
  });
  if (!current) throw new AppError("Collection 에 없는 영상입니다.");

  const neighbor = await prisma.collectionVideo.findFirst({
    where: {
      collectionId,
      sequence:
        direction === "up" ? { lt: current.sequence } : { gt: current.sequence },
    },
    orderBy: { sequence: direction === "up" ? "desc" : "asc" },
  });
  if (!neighbor) return;

  await prisma.$transaction([
    prisma.collectionVideo.update({
      where: { id: current.id },
      data: { sequence: neighbor.sequence },
    }),
    prisma.collectionVideo.update({
      where: { id: neighbor.id },
      data: { sequence: current.sequence },
    }),
  ]);
}

export type CustomVideoInput = {
  url: string;
  title?: string;
  channelId: number;
  level: number;
  category: string;
};

/**
 * 부모가 YouTube URL 로 직접 등록한다.
 * 공용 Library 를 오염시키지 않도록 householdId 를 붙여 그 가정에서만 보이게 한다.
 */
export async function addCustomVideo(
  householdId: number,
  collectionId: number,
  input: CustomVideoInput,
) {
  await authorizeCollection(householdId, collectionId);

  const youtubeVideoId = parseYouTubeVideoId(input.url);
  if (!youtubeVideoId) {
    throw new AppError(
      "YouTube 주소를 인식하지 못했습니다. watch, youtu.be, shorts, embed 형식을 입력해 주세요.",
    );
  }

  const channel = await prisma.channel.findFirst({
    where: { id: input.channelId, enabled: true },
  });
  if (!channel) throw new AppError("Channel 을 선택해 주세요.");

  const duplicate = await prisma.video.findUnique({ where: { youtubeVideoId } });
  if (duplicate) {
    if (duplicate.householdId !== null && duplicate.householdId !== householdId) {
      throw new AppError("이미 등록된 영상입니다.");
    }
    const result = await addVideoToCollection(householdId, collectionId, duplicate.id);
    return { video: duplicate, titleFetched: false, ...result };
  }

  const manualTitle = input.title?.trim();
  const fetchedTitle = manualTitle ? null : await fetchYouTubeTitle(youtubeVideoId);
  const title = manualTitle || fetchedTitle || `제목 없음 (${youtubeVideoId})`;

  const last = await prisma.video.findFirst({
    where: { householdId },
    orderBy: { sequence: "desc" },
  });

  const video = await prisma.video.create({
    data: {
      youtubeVideoId,
      youtubeUrl: buildYouTubeWatchUrl(youtubeVideoId),
      title,
      thumbnailUrl: buildThumbnailUrl(youtubeVideoId),
      channelId: channel.id,
      level: clampLevel(input.level),
      category: input.category,
      sequence: (last?.sequence ?? 0) + SEQUENCE_STEP,
      householdId,
    },
  });

  await addVideoToCollection(householdId, collectionId, video.id);
  return { video, titleFetched: Boolean(fetchedTitle), added: true, restored: false };
}

function clampLevel(level: number): number {
  const value = Math.round(Number(level));
  if (!Number.isFinite(value)) return 1;
  return Math.min(Math.max(value, 1), 5);
}
