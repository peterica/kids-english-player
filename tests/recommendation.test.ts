import { describe, expect, it } from "vitest";
import { PROGRESS_STATUS } from "@/lib/constants";
import { NO_WATCH, type CatalogItem, type CatalogVideo } from "@/lib/catalog";
import { pickContinueWatching, recommendVideos } from "@/lib/recommendation";

const item = (
  id: number,
  channelId: number,
  level: number,
  status: CatalogItem["watch"]["status"] = PROGRESS_STATUS.NOT_STARTED,
  percent = 0,
): CatalogItem<CatalogVideo> => ({
  id,
  channelId,
  level,
  category: "STORY",
  enabled: true,
  sequence: id * 10,
  title: `Video ${id}`,
  watch:
    status === PROGRESS_STATUS.NOT_STARTED
      ? NO_WATCH
      : { status, progressPercent: percent, lastPositionSeconds: 0 },
});

describe("pickContinueWatching", () => {
  it("가장 최근에 본 IN_PROGRESS 영상을 고른다", () => {
    const items = [
      item(1, 1, 1, PROGRESS_STATUS.IN_PROGRESS, 20),
      item(2, 1, 2, PROGRESS_STATUS.IN_PROGRESS, 60),
      item(3, 1, 3),
    ];
    const lastWatched = new Map([
      [1, 1000],
      [2, 5000],
    ]);
    expect(pickContinueWatching(items, lastWatched)?.id).toBe(2);
  });

  it("이어볼 영상이 없으면 null", () => {
    expect(pickContinueWatching([item(1, 1, 1), item(2, 1, 2)])).toBeNull();
  });
});

describe("recommendVideos", () => {
  it("IN_PROGRESS → 선호 Channel 의 새 영상 → 나머지 새 영상 → 본 영상 순", () => {
    const items = [
      item(1, 2, 1, PROGRESS_STATUS.COMPLETED, 100),
      item(2, 2, 2),
      item(3, 1, 3),
      item(4, 1, 1, PROGRESS_STATUS.IN_PROGRESS, 40),
    ];
    const result = recommendVideos(items, [1], 4);
    expect(result.map((row) => row.id)).toEqual([4, 3, 2, 1]);
  });

  it("현재 보고 있는 영상은 제외한다", () => {
    const items = [item(1, 1, 1), item(2, 1, 2)];
    expect(recommendVideos(items, [], 4, 1).map((row) => row.id)).toEqual([2]);
  });

  it("limit 만큼만 돌려준다", () => {
    const items = [item(1, 1, 1), item(2, 1, 2), item(3, 1, 3)];
    expect(recommendVideos(items, [], 2)).toHaveLength(2);
  });

  it("볼 수 있는 영상이 없으면 빈 배열", () => {
    expect(recommendVideos([], [], 4)).toEqual([]);
  });
});
