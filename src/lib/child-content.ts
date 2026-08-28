import { prisma } from "./db";
import { authorizeChild } from "./auth";
import { PROGRESS_STATUS, type ProgressStatus } from "./constants";
import {
  NO_WATCH,
  applyFilters,
  resolveChildCatalog,
  type BrowseFilter,
  type CatalogItem,
  type ChildScope,
} from "./catalog";
import { listVideos, type LibraryVideo } from "./library";

export type ChildCatalogItem = CatalogItem<LibraryVideo>;

export type ChildCatalog = {
  child: { id: number; name: string; householdId: number };
  scope: ChildScope;
  items: ChildCatalogItem[];
  /** 아이가 실제로 볼 수 있는 영상이 있는 Channel 목록 */
  channels: { id: number; name: string; slug: string; colorKey: string; count: number }[];
  lastWatchedAt: Map<number, number>;
};

/**
 * 아이 화면(홈/Browse/Auto Play)이 공통으로 쓰는 카탈로그.
 * 허용 Level·선호 Channel·부모 Collection 규칙을 모두 반영한 뒤 시청 상태를 붙인다.
 */
export async function getChildCatalog(
  householdId: number,
  childId: number,
): Promise<ChildCatalog> {
  const child = await authorizeChild(householdId, childId);

  const [preference, collectionEntries, videos, progressRows] = await Promise.all([
    prisma.childPreference.findUnique({
      where: { childId },
      include: { preferredChannels: true },
    }),
    prisma.collectionVideo.findMany({
      where: { collection: { householdId, childId } },
      select: { videoId: true, enabled: true },
    }),
    listVideos({ householdId }),
    prisma.videoProgress.findMany({ where: { childId } }),
  ]);

  const scope: ChildScope = {
    minLevel: preference?.minLevel ?? 1,
    maxLevel: preference?.maxLevel ?? 5,
    preferredChannelIds:
      preference?.preferredChannels.map((row) => row.channelId) ?? [],
  };

  const progressByVideoId = new Map(progressRows.map((row) => [row.videoId, row]));
  const lastWatchedAt = new Map(
    progressRows
      .filter((row) => row.lastWatchedAt)
      .map((row) => [row.videoId, (row.lastWatchedAt as Date).getTime()]),
  );

  const allowed = resolveChildCatalog(videos, scope, collectionEntries);
  const items: ChildCatalogItem[] = allowed.map((video) => {
    const progress = progressByVideoId.get(video.id);
    return {
      ...video,
      watch: progress
        ? {
            status: progress.status as ProgressStatus,
            progressPercent: progress.progressPercent,
            lastPositionSeconds: progress.lastPositionSeconds,
          }
        : NO_WATCH,
    };
  });

  const channelMap = new Map<number, ChildCatalog["channels"][number]>();
  for (const item of items) {
    const current = channelMap.get(item.channelId);
    if (current) current.count += 1;
    else
      channelMap.set(item.channelId, {
        id: item.channelId,
        name: item.channelName,
        slug: item.channelSlug,
        colorKey: item.channelColor,
        count: 1,
      });
  }

  return {
    child: { id: child.id, name: child.name, householdId: child.householdId },
    scope,
    items,
    channels: [...channelMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
    lastWatchedAt,
  };
}

/** Browse 필터 적용 결과 */
export function filterCatalog(
  catalog: ChildCatalog,
  filter: BrowseFilter,
): ChildCatalogItem[] {
  return applyFilters(catalog.items, filter);
}

/** 아이가 이 영상을 볼 수 있는지 (Player 접근 검증에 사용) */
export function canWatch(catalog: ChildCatalog, videoId: number): boolean {
  return catalog.items.some((item) => item.id === videoId);
}

export function watchStatusLabel(status: ProgressStatus, percent: number): string {
  if (status === PROGRESS_STATUS.COMPLETED) return "봤어요";
  if (status === PROGRESS_STATUS.IN_PROGRESS) return `${percent}%`;
  return "새 영상";
}
