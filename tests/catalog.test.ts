import { describe, expect, it } from "vitest";
import {
  applyFilters,
  isWithinScope,
  resolveChildCatalog,
  type CatalogVideo,
  type ChildScope,
} from "@/lib/catalog";

const video = (
  id: number,
  channelId: number,
  level: number,
  category = "STORY",
  enabled = true,
): CatalogVideo => ({
  id,
  channelId,
  level,
  category,
  enabled,
  sequence: id * 10,
  title: `Video ${id}`,
});

const VIDEOS: CatalogVideo[] = [
  video(1, 1, 1, "PHONICS"),
  video(2, 1, 2, "PHONICS"),
  video(3, 2, 3, "STORY"),
  video(4, 2, 4, "FAMILY"),
  video(5, 3, 5, "SCHOOL"),
  video(6, 3, 2, "SONG", false), // 비활성
];

const scope = (overrides: Partial<ChildScope> = {}): ChildScope => ({
  minLevel: 1,
  maxLevel: 5,
  preferredChannelIds: [],
  ...overrides,
});

describe("resolveChildCatalog", () => {
  it("허용 Level 범위 밖 영상은 제외한다", () => {
    const result = resolveChildCatalog(VIDEOS, scope({ minLevel: 2, maxLevel: 3 }));
    expect(result.map((v) => v.id)).toEqual([2, 3]);
  });

  it("선호 Channel 이 지정되면 그 Channel 만 남는다", () => {
    const result = resolveChildCatalog(VIDEOS, scope({ preferredChannelIds: [2] }));
    expect(result.map((v) => v.id)).toEqual([3, 4]);
  });

  it("선호 Channel 이 없으면 모든 Channel 을 허용한다", () => {
    const result = resolveChildCatalog(VIDEOS, scope());
    expect(result.map((v) => v.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it("비활성 영상은 언제나 제외한다", () => {
    const result = resolveChildCatalog(VIDEOS, scope());
    expect(result.some((v) => v.id === 6)).toBe(false);
  });

  it("Collection 에 담은 영상은 허용 범위를 벗어나도 볼 수 있다", () => {
    const result = resolveChildCatalog(
      VIDEOS,
      scope({ minLevel: 1, maxLevel: 2, preferredChannelIds: [1] }),
      [{ videoId: 4, enabled: true }],
    );
    expect(result.map((v) => v.id)).toEqual([1, 2, 4]);
  });

  it("Collection 에서 숨긴 영상은 허용 범위 안이어도 제외한다", () => {
    const result = resolveChildCatalog(VIDEOS, scope(), [
      { videoId: 3, enabled: false },
    ]);
    expect(result.map((v) => v.id)).toEqual([1, 2, 4, 5]);
  });

  it("숨김이 담기보다 우선한다", () => {
    const result = resolveChildCatalog(VIDEOS, scope(), [
      { videoId: 6, enabled: true },
      { videoId: 1, enabled: false },
    ]);
    expect(result.map((v) => v.id)).toEqual([2, 3, 4, 5]);
  });

  it("Level → sequence 순으로 정렬한다", () => {
    const shuffled = [video(9, 1, 3), video(8, 1, 1), video(7, 1, 2)];
    expect(resolveChildCatalog(shuffled, scope()).map((v) => v.id)).toEqual([8, 7, 9]);
  });
});

describe("isWithinScope", () => {
  it("Level 과 Channel 을 함께 본다", () => {
    expect(isWithinScope(video(1, 1, 3), scope({ minLevel: 3, maxLevel: 4 }))).toBe(true);
    expect(isWithinScope(video(1, 1, 2), scope({ minLevel: 3, maxLevel: 4 }))).toBe(false);
    expect(
      isWithinScope(video(1, 1, 3), scope({ preferredChannelIds: [2] })),
    ).toBe(false);
  });
});

describe("applyFilters", () => {
  it("Level / Channel / Category / 검색어로 거른다", () => {
    expect(applyFilters(VIDEOS, { level: 2 }).map((v) => v.id)).toEqual([2, 6]);
    expect(applyFilters(VIDEOS, { channelId: 3 }).map((v) => v.id)).toEqual([5, 6]);
    expect(applyFilters(VIDEOS, { category: "PHONICS" }).map((v) => v.id)).toEqual([1, 2]);
    expect(applyFilters(VIDEOS, { query: "video 4" }).map((v) => v.id)).toEqual([4]);
  });

  it("여러 조건을 함께 적용한다", () => {
    expect(
      applyFilters(VIDEOS, { channelId: 1, category: "PHONICS", level: 1 }).map(
        (v) => v.id,
      ),
    ).toEqual([1]);
  });

  it("조건이 없으면 그대로 돌려준다", () => {
    expect(applyFilters(VIDEOS, {})).toHaveLength(VIDEOS.length);
  });
});
