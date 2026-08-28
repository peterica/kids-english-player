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
  positionSeconds: number;
  durationSeconds: number;
  /** 이번 heartbeat 동안 PLAYING 상태로 실제 흐른 시간(초) */
  watchDeltaSeconds: number;
  ended?: boolean;
  completionThreshold: number;
  now: Date;
};

/** seek 로 시청 시간이 부풀지 않도록 heartbeat 당 증가분에 상한을 둔다. */
export function sanitizeWatchDelta(deltaSeconds: number): number {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return 0;
  return Math.min(Math.round(deltaSeconds), MAX_WATCH_DELTA_PER_TICK_SECONDS);
}

export function calculateProgressPercent(
  positionSeconds: number,
  durationSeconds: number,
): number {
  if (!durationSeconds || durationSeconds <= 0) return 0;
  return clamp(Math.floor((positionSeconds / durationSeconds) * 100), 0, 100);
}

export function isCompletionReached(
  progressPercent: number,
  ended: boolean,
  completionThreshold: number,
): boolean {
  return ended || progressPercent >= completionThreshold;
}

/**
 * 재생하지 않고 화면만 열었다 나간 경우에는 기록을 만들지 않는다.
 * (0% IN_PROGRESS 기록이 추천/최근 시청을 오염시키는 것을 막는다)
 */
export function shouldRecordTick(
  hasExistingProgress: boolean,
  watchDeltaSeconds: number,
  ended: boolean,
): boolean {
  if (hasExistingProgress || ended) return true;
  return sanitizeWatchDelta(watchDeltaSeconds) > 0;
}

/**
 * 저장된 진행 상태에 heartbeat 1건을 반영한 다음 상태를 계산하는 순수 함수.
 * - COMPLETED 는 재생만으로 되돌아가지 않는다
 * - watchSeconds 는 실제 재생 경과 시간만 누적한다
 */
export function applyProgressTick(
  current: ProgressSnapshot,
  tick: ProgressTick,
): ProgressSnapshot {
  const durationSeconds =
    tick.durationSeconds > 0
      ? Math.round(tick.durationSeconds)
      : current.durationSeconds;

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

  return {
    status: completed ? PROGRESS_STATUS.COMPLETED : PROGRESS_STATUS.IN_PROGRESS,
    lastPositionSeconds,
    durationSeconds,
    progressPercent: completed
      ? Math.max(current.progressPercent, tickPercent, ended ? 100 : tickPercent)
      : tickPercent,
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

export function emptyProgress(): ProgressSnapshot {
  return {
    status: PROGRESS_STATUS.NOT_STARTED,
    lastPositionSeconds: 0,
    durationSeconds: 0,
    progressPercent: 0,
    watchSeconds: 0,
    startedAt: null,
    completedAt: null,
  };
}
