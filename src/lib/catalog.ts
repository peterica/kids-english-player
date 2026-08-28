import { PROGRESS_STATUS, type ProgressStatus } from "./constants";

/** 카탈로그 판정에 필요한 최소 영상 정보 */
export type CatalogVideo = {
  id: number;
  channelId: number;
  level: number;
  category: string;
  enabled: boolean;
  sequence: number;
  title: string;
};

/** 아이에게 허용된 범위 (ChildPreference) */
export type ChildScope = {
  minLevel: number;
  maxLevel: number;
  /** 비어 있으면 "채널 제한 없음" 으로 본다 */
  preferredChannelIds: number[];
};

/** 부모가 Collection 에서 명시적으로 넣거나 뺀 영상 */
export type CollectionEntry = {
  videoId: number;
  enabled: boolean;
};

export type WatchState = {
  status: ProgressStatus;
  progressPercent: number;
  lastPositionSeconds: number;
};

export type CatalogItem<T extends CatalogVideo = CatalogVideo> = T & {
  watch: WatchState;
};

export const NO_WATCH: WatchState = {
  status: PROGRESS_STATUS.NOT_STARTED,
  progressPercent: 0,
  lastPositionSeconds: 0,
};

/**
 * 아이가 볼 수 있는 영상을 결정한다.
 *
 * 규칙:
 * 1. 비활성(enabled=false) 영상은 언제나 제외한다.
 * 2. 부모가 Collection 에서 제외한 영상(enabled=false)은 언제나 제외한다.
 * 3. 부모가 Collection 에 담은 영상은 허용 범위를 벗어나도 볼 수 있다(명시적 허용).
 * 4. 그 밖에는 허용 Level 범위 + 선호 Channel(있을 때) 안에서만 볼 수 있다.
 */
export function resolveChildCatalog<T extends CatalogVideo>(
  videos: readonly T[],
  scope: ChildScope,
  collectionEntries: readonly CollectionEntry[] = [],
): T[] {
  const excluded = new Set(
    collectionEntries.filter((entry) => !entry.enabled).map((entry) => entry.videoId),
  );
  const included = new Set(
    collectionEntries.filter((entry) => entry.enabled).map((entry) => entry.videoId),
  );

  return videos
    .filter((video) => {
      if (!video.enabled) return false;
      if (excluded.has(video.id)) return false;
      if (included.has(video.id)) return true;
      return isWithinScope(video, scope);
    })
    .sort(compareForBrowse);
}

export function isWithinScope(video: CatalogVideo, scope: ChildScope): boolean {
  if (video.level < scope.minLevel || video.level > scope.maxLevel) return false;
  if (scope.preferredChannelIds.length === 0) return true;
  return scope.preferredChannelIds.includes(video.channelId);
}

export type BrowseFilter = {
  level?: number | null;
  channelId?: number | null;
  category?: string | null;
  query?: string | null;
};

/** Library / Browse 공통 필터 */
export function applyFilters<T extends CatalogVideo>(
  videos: readonly T[],
  filter: BrowseFilter,
): T[] {
  const query = filter.query?.trim().toLowerCase() ?? "";
  return videos.filter((video) => {
    if (filter.level && video.level !== filter.level) return false;
    if (filter.channelId && video.channelId !== filter.channelId) return false;
    if (filter.category && video.category !== filter.category) return false;
    if (query && !video.title.toLowerCase().includes(query)) return false;
    return true;
  });
}

export function compareForBrowse(a: CatalogVideo, b: CatalogVideo): number {
  return a.level - b.level || a.sequence - b.sequence || a.id - b.id;
}
