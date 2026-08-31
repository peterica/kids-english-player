import { prisma } from "../db";
import { AppError } from "../errors";
import { CATEGORIES, MAX_LEVEL, MIN_LEVEL, SEQUENCE_STEP } from "../constants";
import { buildThumbnailUrl, buildYouTubeWatchUrl } from "../youtube";
import { requireChannel } from "./channels";

/** Admin 입력은 표준 watch URL 만 허용한다. (부모 직접 등록의 허용 범위는 그대로 둔다) */
const CANONICAL_WATCH_URL = /^https:\/\/www\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})$/;

export type AdminVideoInput = {
  channelId: number;
  level: number;
  title: string;
  category: string;
  publisher: string;
  youtubeUrl: string;
  enabled?: boolean;
};

export type AdminVideoFilter = {
  channel?: string | number | null;
  level?: number | null;
  category?: string | null;
  enabled?: boolean | null;
  q?: string | null;
};

export function parseCanonicalYouTubeUrl(url: string): string {
  const trimmed = (url ?? "").trim();
  const matched = CANONICAL_WATCH_URL.exec(trimmed);
  if (!matched) {
    throw new AppError(
      "YouTube 주소는 https://www.youtube.com/watch?v=<11자 ID> 형식이어야 합니다.",
    );
  }
  return matched[1];
}

export function validateLevel(level: unknown): number {
  const value = Number(level);
  if (!Number.isInteger(value) || value < MIN_LEVEL || value > MAX_LEVEL) {
    throw new AppError(`Level 은 ${MIN_LEVEL}~${MAX_LEVEL} 사이의 정수여야 합니다.`);
  }
  return value;
}

export function validateCategory(category: unknown): string {
  const value = String(category ?? "").trim();
  if (!(CATEGORIES as readonly string[]).includes(value)) {
    throw new AppError(`Category 는 다음 중 하나여야 합니다: ${CATEGORIES.join(", ")}`);
  }
  return value;
}

export function validateRequiredText(value: unknown, field: string, max = 200): string {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) throw new AppError(`${field}를 입력해 주세요.`);
  if (trimmed.length > max) throw new AppError(`${field}는 ${max}자 이내여야 합니다.`);
  return trimmed;
}

/** Admin 목록: 공용 Content Library 원본만 다룬다. */
export async function listVideosForAdmin(filter: AdminVideoFilter = {}) {
  const channelId =
    typeof filter.channel === "number"
      ? filter.channel
      : filter.channel
        ? (await prisma.channel.findFirst({
            where: { OR: [{ slug: String(filter.channel) }, { name: String(filter.channel) }] },
            select: { id: true },
          }))?.id ?? -1
        : null;

  const q = filter.q?.trim();
  const videos = await prisma.video.findMany({
    where: {
      householdId: null,
      ...(channelId ? { channelId } : {}),
      ...(filter.level ? { level: filter.level } : {}),
      ...(filter.category ? { category: filter.category } : {}),
      ...(filter.enabled === null || filter.enabled === undefined
        ? {}
        : { enabled: filter.enabled }),
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { publisher: { contains: q } },
              { youtubeUrl: { contains: q } },
              { youtubeVideoId: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: [{ level: "asc" }, { channelId: "asc" }, { title: "asc" }],
    include: { channel: { select: { id: true, name: true, slug: true } } },
  });

  return videos.map(toAdminVideo);
}

export async function getVideoForAdmin(id: number) {
  const video = await prisma.video.findFirst({
    where: { id, householdId: null },
    include: { channel: { select: { id: true, name: true, slug: true } } },
  });
  if (!video) throw new AppError("영상을 찾을 수 없습니다.");
  return toAdminVideo(video);
}

export async function createAdminVideo(input: AdminVideoInput) {
  const channel = await requireChannel(input.channelId);
  const level = validateLevel(input.level);
  const category = validateCategory(input.category);
  const title = validateRequiredText(input.title, "제목");
  const publisher = validateRequiredText(input.publisher, "Publisher", 100);
  const youtubeVideoId = parseCanonicalYouTubeUrl(input.youtubeUrl);

  await assertNotDuplicate(youtubeVideoId);

  const last = await prisma.video.findFirst({
    where: { householdId: null },
    orderBy: { sequence: "desc" },
  });

  const created = await prisma.video.create({
    data: {
      youtubeVideoId,
      youtubeUrl: buildYouTubeWatchUrl(youtubeVideoId),
      title,
      publisher,
      thumbnailUrl: buildThumbnailUrl(youtubeVideoId),
      channelId: channel.id,
      level,
      category,
      enabled: input.enabled ?? true,
      sequence: (last?.sequence ?? 0) + SEQUENCE_STEP,
      householdId: null,
    },
    include: { channel: { select: { id: true, name: true, slug: true } } },
  });
  return toAdminVideo(created);
}

export async function updateAdminVideo(id: number, input: AdminVideoInput) {
  const existing = await requireAdminVideo(id);
  const channel = await requireChannel(input.channelId);
  const level = validateLevel(input.level);
  const category = validateCategory(input.category);
  const title = validateRequiredText(input.title, "제목");
  const publisher = validateRequiredText(input.publisher, "Publisher", 100);
  const youtubeVideoId = parseCanonicalYouTubeUrl(input.youtubeUrl);

  if (youtubeVideoId !== existing.youtubeVideoId) {
    await assertNotDuplicate(youtubeVideoId);
  }

  const updated = await prisma.video.update({
    where: { id: existing.id },
    data: {
      youtubeVideoId,
      youtubeUrl: buildYouTubeWatchUrl(youtubeVideoId),
      thumbnailUrl: buildThumbnailUrl(youtubeVideoId),
      title,
      publisher,
      channelId: channel.id,
      level,
      category,
      ...(input.enabled === undefined ? {} : { enabled: input.enabled }),
    },
    include: { channel: { select: { id: true, name: true, slug: true } } },
  });
  return toAdminVideo(updated);
}

export async function setAdminVideoEnabled(id: number, enabled: boolean) {
  const existing = await requireAdminVideo(id);
  const updated = await prisma.video.update({
    where: { id: existing.id },
    data: { enabled },
    include: { channel: { select: { id: true, name: true, slug: true } } },
  });
  return toAdminVideo(updated);
}

/**
 * 공용 Video 한 건을 완전히 삭제한다.
 * 기존 FK 규칙에 따라 그 영상에 달린 Collection 항목·진행 기록·시청 세션·수정 요청이 함께 삭제되고,
 * Auto Play 세션의 현재 영상 참조는 NULL 이 된다.
 */
export async function deleteAdminVideo(id: number) {
  const existing = await requireAdminVideo(id);
  await prisma.video.delete({ where: { id: existing.id } });
  return existing;
}

/** Admin 은 가정 전용(직접 등록) 영상을 건드리지 않는다. */
export async function requireAdminVideo(id: number) {
  if (!Number.isInteger(id) || id <= 0) throw new AppError("영상을 찾을 수 없습니다.");
  const video = await prisma.video.findUnique({ where: { id } });
  if (!video) throw new AppError("영상을 찾을 수 없습니다.");
  if (video.householdId !== null) {
    throw new AppError("가정에서 직접 등록한 영상은 운영자가 수정할 수 없습니다.");
  }
  return video;
}

async function assertNotDuplicate(youtubeVideoId: string) {
  const duplicate = await prisma.video.findUnique({
    where: { youtubeVideoId },
    include: { channel: { select: { name: true } } },
  });
  if (duplicate) {
    throw new AppError(
      `이미 등록된 영상입니다: [${duplicate.channel.name}] ${duplicate.title} (id ${duplicate.id}, videoId ${duplicate.youtubeVideoId})`,
    );
  }
}

type VideoWithChannel = {
  id: number;
  youtubeVideoId: string;
  youtubeUrl: string;
  title: string;
  publisher: string;
  thumbnailUrl: string | null;
  level: number;
  category: string;
  enabled: boolean;
  channel: { id: number; name: string; slug: string };
};

function toAdminVideo(video: VideoWithChannel) {
  return {
    id: video.id,
    youtubeVideoId: video.youtubeVideoId,
    youtubeUrl: video.youtubeUrl,
    title: video.title,
    publisher: video.publisher,
    thumbnailUrl: video.thumbnailUrl,
    level: video.level,
    category: video.category,
    enabled: video.enabled,
    channelId: video.channel.id,
    channelName: video.channel.name,
    channelSlug: video.channel.slug,
  };
}

export type AdminVideo = Awaited<ReturnType<typeof getVideoForAdmin>>;
