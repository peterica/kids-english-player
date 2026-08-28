import { prisma } from "./db";
import { applyFilters, type BrowseFilter } from "./catalog";

export type LibraryVideo = {
  id: number;
  youtubeVideoId: string;
  title: string;
  thumbnailUrl: string | null;
  channelId: number;
  channelName: string;
  channelSlug: string;
  channelColor: string;
  level: number;
  category: string;
  durationSeconds: number | null;
  sequence: number;
  enabled: boolean;
  householdId: number | null;
};

export async function listChannels() {
  const channels = await prisma.channel.findMany({
    where: { enabled: true },
    orderBy: { id: "asc" },
    include: { _count: { select: { videos: true } } },
  });

  const levels = await prisma.video.groupBy({
    by: ["channelId"],
    _min: { level: true },
    _max: { level: true },
    where: { enabled: true, householdId: null },
  });
  const levelByChannel = new Map(levels.map((row) => [row.channelId, row]));

  return channels.map((channel) => ({
    ...channel,
    minLevel: levelByChannel.get(channel.id)?._min.level ?? null,
    maxLevel: levelByChannel.get(channel.id)?._max.level ?? null,
    videoCount: channel._count.videos,
  }));
}

/**
 * 공용 Library + (요청한 가정이 직접 등록한) 영상을 함께 돌려준다.
 * 다른 가정이 등록한 영상은 절대 포함하지 않는다.
 */
export async function listVideos(options: {
  householdId?: number | null;
  includeDisabled?: boolean;
  filter?: BrowseFilter;
}): Promise<LibraryVideo[]> {
  const rows = await prisma.video.findMany({
    where: {
      OR: [
        { householdId: null },
        ...(options.householdId ? [{ householdId: options.householdId }] : []),
      ],
      ...(options.includeDisabled ? {} : { enabled: true }),
    },
    orderBy: [{ level: "asc" }, { sequence: "asc" }, { id: "asc" }],
    include: { channel: true },
  });

  const videos: LibraryVideo[] = rows.map((row) => ({
    id: row.id,
    youtubeVideoId: row.youtubeVideoId,
    title: row.title,
    thumbnailUrl: row.thumbnailUrl,
    channelId: row.channelId,
    channelName: row.channel.name,
    channelSlug: row.channel.slug,
    channelColor: row.channel.colorKey,
    level: row.level,
    category: row.category,
    durationSeconds: row.durationSeconds,
    sequence: row.sequence,
    enabled: row.enabled,
    householdId: row.householdId,
  }));

  return options.filter ? applyFilters(videos, options.filter) : videos;
}

export async function getVideoForHousehold(householdId: number, videoId: number) {
  return prisma.video.findFirst({
    where: {
      id: videoId,
      OR: [{ householdId: null }, { householdId }],
    },
    include: { channel: true },
  });
}
