import { describe, expect, it } from "vitest";
import { PROGRESS_STATUS } from "@/lib/constants";
import {
  selectCurrentVideo,
  selectNextVideo,
  type SelectableVideo,
} from "@/lib/video-selection";

const video = (
  id: number,
  sequence: number,
  status: SelectableVideo["status"],
  enabled = true,
): SelectableVideo => ({ id, sequence, status, enabled });

describe("selectCurrentVideo", () => {
  it("IN_PROGRESS 영상을 가장 먼저 고른다", () => {
    const videos = [
      video(1, 10, PROGRESS_STATUS.COMPLETED),
      video(2, 20, PROGRESS_STATUS.NOT_STARTED),
      video(3, 30, PROGRESS_STATUS.IN_PROGRESS),
    ];
    expect(selectCurrentVideo(videos)?.id).toBe(3);
  });

  it("IN_PROGRESS 가 없으면 sequence 가 가장 빠른 NOT_STARTED 를 고른다", () => {
    const videos = [
      video(1, 30, PROGRESS_STATUS.NOT_STARTED),
      video(2, 10, PROGRESS_STATUS.COMPLETED),
      video(3, 20, PROGRESS_STATUS.NOT_STARTED),
    ];
    expect(selectCurrentVideo(videos)?.id).toBe(3);
  });

  it("IN_PROGRESS 가 여러 개면 sequence 가 빠른 쪽을 고른다", () => {
    const videos = [
      video(1, 30, PROGRESS_STATUS.IN_PROGRESS),
      video(2, 20, PROGRESS_STATUS.IN_PROGRESS),
    ];
    expect(selectCurrentVideo(videos)?.id).toBe(2);
  });

  it("비활성 영상은 제외한다", () => {
    const videos = [
      video(1, 10, PROGRESS_STATUS.IN_PROGRESS, false),
      video(2, 20, PROGRESS_STATUS.NOT_STARTED),
    ];
    expect(selectCurrentVideo(videos)?.id).toBe(2);
  });

  it("모두 완료면 null 을 반환한다", () => {
    const videos = [
      video(1, 10, PROGRESS_STATUS.COMPLETED),
      video(2, 20, PROGRESS_STATUS.COMPLETED),
      video(3, 30, PROGRESS_STATUS.NOT_STARTED, false),
    ];
    expect(selectCurrentVideo(videos)).toBeNull();
    expect(selectCurrentVideo([])).toBeNull();
  });
});

describe("selectNextVideo", () => {
  it("방금 본 영상을 제외하고 다음 영상을 고른다", () => {
    const videos = [
      video(1, 10, PROGRESS_STATUS.IN_PROGRESS),
      video(2, 20, PROGRESS_STATUS.NOT_STARTED),
    ];
    expect(selectNextVideo(videos, 1)?.id).toBe(2);
  });

  it("남은 영상이 없으면 null 을 반환한다", () => {
    const videos = [video(1, 10, PROGRESS_STATUS.IN_PROGRESS)];
    expect(selectNextVideo(videos, 1)).toBeNull();
  });
});
