import { PLAY_MODE, PROGRESS_STATUS, type PlayMode } from "./constants";
import { compareForBrowse, type CatalogItem, type CatalogVideo } from "./catalog";

export type AutoPlayConfig = {
  channelId: number | null;
  minLevel: number;
  maxLevel: number;
  playMode: PlayMode;
  replayCompleted: boolean;
};

/**
 * Auto Play 후보 영상.
 * 아이에게 허용된 카탈로그 안에서 Channel / Level 범위 / 시청 여부로 다시 거른다.
 */
export function selectAutoPlayCandidates<T extends CatalogVideo>(
  items: readonly CatalogItem<T>[],
  config: AutoPlayConfig,
): CatalogItem<T>[] {
  return items
    .filter((item) => {
      if (!item.enabled) return false;
      if (config.channelId && item.channelId !== config.channelId) return false;
      if (item.level < config.minLevel || item.level > config.maxLevel) return false;
      if (!config.replayCompleted && item.watch.status === PROGRESS_STATUS.COMPLETED) {
        return false;
      }
      return true;
    })
    .sort(compareForBrowse);
}

/**
 * 다음 영상 선택.
 * SEQUENTIAL: 현재 영상 다음 순서(끝이면 처음으로 순환)
 * RANDOM: 후보 중 무작위. 같은 영상이 바로 다시 나오지 않게 현재 영상은 제외한다.
 */
export function pickNextAutoPlayVideo<T extends CatalogVideo>(
  candidates: readonly CatalogItem<T>[],
  currentVideoId: number | null,
  playMode: PlayMode,
  random: () => number = Math.random,
): CatalogItem<T> | null {
  if (candidates.length === 0) return null;

  if (playMode === PLAY_MODE.SEQUENTIAL) {
    if (currentVideoId === null) return candidates[0];
    const index = candidates.findIndex((item) => item.id === currentVideoId);
    if (index === -1) return candidates[0];
    return candidates[(index + 1) % candidates.length];
  }

  const pool = candidates.filter((item) => item.id !== currentVideoId);
  const list = pool.length > 0 ? pool : candidates;
  const index = Math.min(Math.floor(random() * list.length), list.length - 1);
  return list[index];
}

/** maxMinutes 를 넘겼는지 판단한다. maxMinutes 가 없으면 제한 없음. */
export function isAutoPlayExpired(
  startedAt: Date,
  maxMinutes: number | null,
  now: Date = new Date(),
): boolean {
  if (!maxMinutes || maxMinutes <= 0) return false;
  return now.getTime() - startedAt.getTime() >= maxMinutes * 60 * 1000;
}

export function remainingSeconds(
  startedAt: Date,
  maxMinutes: number | null,
  now: Date = new Date(),
): number | null {
  if (!maxMinutes || maxMinutes <= 0) return null;
  const left =
    maxMinutes * 60 * 1000 - (now.getTime() - startedAt.getTime());
  return Math.max(0, Math.floor(left / 1000));
}
