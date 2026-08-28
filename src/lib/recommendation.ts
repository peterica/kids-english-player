import { PROGRESS_STATUS } from "./constants";
import { compareForBrowse, type CatalogItem, type CatalogVideo } from "./catalog";

/**
 * 추천 규칙 (AI 없음).
 *
 * 1. 이어보기: IN_PROGRESS 중 가장 최근에 본 영상
 * 2. 추천 목록: 아직 안 본 영상(NOT_STARTED) 우선, 선호 Channel 먼저, 그다음 Level/sequence
 * 3. 볼 게 없으면 이미 본 영상도 제안한다
 */
export function pickContinueWatching<T extends CatalogVideo>(
  items: readonly CatalogItem<T>[],
  lastWatchedAtByVideoId: ReadonlyMap<number, number> = new Map(),
): CatalogItem<T> | null {
  const inProgress = items.filter(
    (item) => item.watch.status === PROGRESS_STATUS.IN_PROGRESS,
  );
  if (inProgress.length === 0) return null;

  return [...inProgress].sort((a, b) => {
    const aAt = lastWatchedAtByVideoId.get(a.id) ?? 0;
    const bAt = lastWatchedAtByVideoId.get(b.id) ?? 0;
    return bAt - aAt || compareForBrowse(a, b);
  })[0];
}

export function recommendVideos<T extends CatalogVideo>(
  items: readonly CatalogItem<T>[],
  preferredChannelIds: readonly number[],
  limit = 4,
  excludeVideoId?: number | null,
): CatalogItem<T>[] {
  const candidates = items.filter((item) => item.id !== excludeVideoId);
  const preferred = new Set(preferredChannelIds);

  const rank = (item: CatalogItem<T>) => {
    if (item.watch.status === PROGRESS_STATUS.IN_PROGRESS) return 0;
    if (item.watch.status === PROGRESS_STATUS.NOT_STARTED) {
      return preferred.has(item.channelId) ? 1 : 2;
    }
    return 3; // COMPLETED 는 마지막
  };

  return [...candidates]
    .sort((a, b) => rank(a) - rank(b) || compareForBrowse(a, b))
    .slice(0, limit);
}
