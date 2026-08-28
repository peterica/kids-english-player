import { describe, expect, it } from "vitest";
import { PLAY_MODE, PROGRESS_STATUS } from "@/lib/constants";
import { NO_WATCH, type CatalogItem, type CatalogVideo } from "@/lib/catalog";
import {
  isAutoPlayExpired,
  pickNextAutoPlayVideo,
  remainingSeconds,
  selectAutoPlayCandidates,
  type AutoPlayConfig,
} from "@/lib/autoplay-rules";

const item = (
  id: number,
  channelId: number,
  level: number,
  completed = false,
  enabled = true,
): CatalogItem<CatalogVideo> => ({
  id,
  channelId,
  level,
  category: "STORY",
  enabled,
  sequence: id * 10,
  title: `Video ${id}`,
  watch: completed
    ? { status: PROGRESS_STATUS.COMPLETED, progressPercent: 100, lastPositionSeconds: 0 }
    : NO_WATCH,
});

const ITEMS = [
  item(1, 1, 3),
  item(2, 1, 4, true),
  item(3, 1, 5),
  item(4, 2, 3),
  item(5, 1, 3, false, false),
];

const config = (overrides: Partial<AutoPlayConfig> = {}): AutoPlayConfig => ({
  channelId: 1,
  minLevel: 3,
  maxLevel: 4,
  playMode: PLAY_MODE.SEQUENTIAL,
  replayCompleted: true,
  ...overrides,
});

describe("selectAutoPlayCandidates", () => {
  it("Channel 과 Level 범위로 거른다", () => {
    expect(selectAutoPlayCandidates(ITEMS, config()).map((v) => v.id)).toEqual([1, 2]);
  });

  it("Channel 전체(null)면 Level 범위만 본다", () => {
    expect(
      selectAutoPlayCandidates(ITEMS, config({ channelId: null })).map((v) => v.id),
    ).toEqual([1, 4, 2]);
  });

  it("replayCompleted=false 면 이미 본 영상을 제외한다", () => {
    expect(
      selectAutoPlayCandidates(ITEMS, config({ replayCompleted: false })).map((v) => v.id),
    ).toEqual([1]);
  });

  it("replayCompleted=true 면 이미 본 영상도 포함한다", () => {
    expect(
      selectAutoPlayCandidates(ITEMS, config({ replayCompleted: true })).map((v) => v.id),
    ).toContain(2);
  });

  it("비활성 영상은 언제나 제외한다", () => {
    expect(selectAutoPlayCandidates(ITEMS, config()).some((v) => v.id === 5)).toBe(false);
  });
});

describe("pickNextAutoPlayVideo", () => {
  const candidates = [item(1, 1, 3), item(2, 1, 3), item(3, 1, 4)];

  it("SEQUENTIAL 은 현재 영상 다음을 고르고 끝에서 순환한다", () => {
    expect(pickNextAutoPlayVideo(candidates, null, PLAY_MODE.SEQUENTIAL)?.id).toBe(1);
    expect(pickNextAutoPlayVideo(candidates, 1, PLAY_MODE.SEQUENTIAL)?.id).toBe(2);
    expect(pickNextAutoPlayVideo(candidates, 3, PLAY_MODE.SEQUENTIAL)?.id).toBe(1);
  });

  it("RANDOM 은 현재 영상을 바로 다시 고르지 않는다", () => {
    for (const r of [0, 0.4, 0.99]) {
      const next = pickNextAutoPlayVideo(candidates, 2, PLAY_MODE.RANDOM, () => r);
      expect(next?.id).not.toBe(2);
    }
  });

  it("RANDOM 은 후보 안에서 고른다", () => {
    const next = pickNextAutoPlayVideo(candidates, null, PLAY_MODE.RANDOM, () => 0.5);
    expect(candidates.map((c) => c.id)).toContain(next?.id);
  });

  it("후보가 하나뿐이면 그 영상을 계속 재생한다", () => {
    const single = [item(9, 1, 3)];
    expect(pickNextAutoPlayVideo(single, 9, PLAY_MODE.RANDOM, () => 0)?.id).toBe(9);
  });

  it("후보가 없으면 null", () => {
    expect(pickNextAutoPlayVideo([], null, PLAY_MODE.SEQUENTIAL)).toBeNull();
  });
});

describe("재생 시간 제한", () => {
  const started = new Date("2026-08-28T10:00:00.000Z");

  it("maxMinutes 를 넘기면 만료된다", () => {
    expect(isAutoPlayExpired(started, 30, new Date("2026-08-28T10:29:59.000Z"))).toBe(false);
    expect(isAutoPlayExpired(started, 30, new Date("2026-08-28T10:30:00.000Z"))).toBe(true);
  });

  it("maxMinutes 가 없으면 제한 없음", () => {
    expect(isAutoPlayExpired(started, null, new Date("2036-01-01T00:00:00.000Z"))).toBe(
      false,
    );
    expect(remainingSeconds(started, null)).toBeNull();
  });

  it("남은 시간을 초로 돌려준다", () => {
    expect(remainingSeconds(started, 30, new Date("2026-08-28T10:10:00.000Z"))).toBe(1200);
    expect(remainingSeconds(started, 30, new Date("2026-08-28T11:00:00.000Z"))).toBe(0);
  });
});
