import {
  MAX_WATCH_DELTA_PER_TICK_SECONDS,
  PROGRESS_STATUS,
  type ProgressStatus,
} from "./constants";

export type ProgressSnapshot = {
  status: ProgressStatus;
  lastPositionSeconds: number;
  durationSeconds: number;
  progressPercent: number;
  watchSeconds: number;
  startedAt: Date | null;
  completedAt: Date | null;
};

export type ProgressTick = {
  /** 현재 재생 위치(초). */
  positionSeconds: number;
  /** 영상 전체 길이(초). 0 이면 아직 모르는 상태로 본다. */
  durationSeconds: number;
  /** 이번 heartbeat 동안 PLAYING 상태로 실제 흐른 시간(초). */
  watchDeltaSeconds: number;
  /** YouTube ENDED 이벤트 여부. */
  ended?: boolean;
  /** 완료 기준(%) */
  completionThreshold: number;
  now: Date;
};

/**
 * seek 로 시청 시간이 부풀려지지 않도록 heartbeat 당 증가분을 제한한다.
 * 위치 차이가 아니라 "PLAYING 상태로 흐른 실제 시간"만 인정한다.
 */
export function sanitizeWatchDelta(deltaSeconds: number): number {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return 0;
  return Math.min(Math.round(deltaSeconds), MAX_WATCH_DELTA_PER_TICK_SECONDS);
}

/**
 * 이 heartbeat 를 기록해야 하는지 판단한다.
 * 아직 진행 기록이 없는 영상에서, 실제 재생 시간도 없고 종료 이벤트도 아니라면
 * (= 페이지만 열었다가 나간 경우) 기록을 만들지 않는다.
 */
export function shouldRecordTick(
  hasExistingProgress: boolean,
  watchDeltaSeconds: number,
  ended: boolean,
): boolean {
  if (hasExistingProgress || ended) return true;
  return sanitizeWatchDelta(watchDeltaSeconds) > 0;
}

export function calculateProgressPercent(
  positionSeconds: number,
  durationSeconds: number,
): number {
  if (!durationSeconds || durationSeconds <= 0) return 0;
  const percent = (positionSeconds / durationSeconds) * 100;
  return clamp(Math.floor(percent), 0, 100);
}

export function isCompletionReached(
  progressPercent: number,
  ended: boolean,
  completionThreshold: number,
): boolean {
  return ended || progressPercent >= completionThreshold;
}

/**
 * 현재 저장된 진행 상태에 heartbeat 1건을 반영한 다음 상태를 계산한다.
 * 순수 함수이며 DB 를 알지 못한다.
 *
 * 규칙:
 * - COMPLETED 는 재생만으로 이전 상태로 돌아가지 않는다.
 * - watchSeconds 는 실제 재생 경과 시간만 누적한다.
 * - progressPercent 는 COMPLETED 이후에는 낮아지지 않는다.
 */
export function applyProgressTick(
  current: ProgressSnapshot,
  tick: ProgressTick,
): ProgressSnapshot {
  const durationSeconds =
    tick.durationSeconds > 0 ? Math.round(tick.durationSeconds) : current.durationSeconds;
  // 위치는 내림한다. 반올림으로 완료 기준을 앞당기지 않기 위함이다.
  const lastPositionSeconds = clamp(
    Math.floor(tick.positionSeconds),
    0,
    durationSeconds > 0 ? durationSeconds : Number.MAX_SAFE_INTEGER,
  );
  const tickPercent = calculateProgressPercent(lastPositionSeconds, durationSeconds);
  const ended = tick.ended === true;
  const watchSeconds =
    current.watchSeconds + sanitizeWatchDelta(tick.watchDeltaSeconds);

  const alreadyCompleted = current.status === PROGRESS_STATUS.COMPLETED;
  const completed =
    alreadyCompleted ||
    isCompletionReached(tickPercent, ended, tick.completionThreshold);

  const status: ProgressStatus = completed
    ? PROGRESS_STATUS.COMPLETED
    : PROGRESS_STATUS.IN_PROGRESS;

  const progressPercent = completed
    ? Math.max(current.progressPercent, tickPercent, ended ? 100 : tickPercent)
    : tickPercent;

  return {
    status,
    lastPositionSeconds,
    durationSeconds,
    progressPercent,
    watchSeconds,
    startedAt: current.startedAt ?? tick.now,
    completedAt: alreadyCompleted
      ? current.completedAt
      : completed
        ? tick.now
        : null,
  };
}

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}
