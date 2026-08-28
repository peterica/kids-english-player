import { PROGRESS_STATUS, type ProgressStatus } from "./constants";

export type SelectableVideo = {
  id: number;
  sequence: number;
  enabled: boolean;
  status: ProgressStatus;
};

/**
 * 아이가 지금 봐야 할 영상을 고른다.
 * 우선순위: IN_PROGRESS → NOT_STARTED → 없음(모두 완료).
 * 같은 상태끼리는 sequence 가 빠른 영상, sequence 가 같으면 id 가 작은 영상.
 * 비활성 영상은 후보에서 제외한다.
 */
export function selectCurrentVideo<T extends SelectableVideo>(
  videos: readonly T[],
): T | null {
  const candidates = videos.filter((video) => video.enabled);
  return (
    pickFirst(candidates, PROGRESS_STATUS.IN_PROGRESS) ??
    pickFirst(candidates, PROGRESS_STATUS.NOT_STARTED) ??
    null
  );
}

/**
 * 방금 본 영상 다음에 이어서 볼 영상을 고른다.
 * 해당 영상 자신은 제외하고 동일한 우선순위 규칙을 적용한다.
 */
export function selectNextVideo<T extends SelectableVideo>(
  videos: readonly T[],
  currentVideoId: number,
): T | null {
  return selectCurrentVideo(videos.filter((video) => video.id !== currentVideoId));
}

function pickFirst<T extends SelectableVideo>(
  videos: readonly T[],
  status: ProgressStatus,
): T | null {
  const matched = videos
    .filter((video) => video.status === status)
    .sort((a, b) => a.sequence - b.sequence || a.id - b.id);
  return matched[0] ?? null;
}
