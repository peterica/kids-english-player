/** 진행 상태 값. PRD 7장 VideoProgress.status 와 동일하다. */
export const PROGRESS_STATUS = {
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
} as const;

export type ProgressStatus =
  (typeof PROGRESS_STATUS)[keyof typeof PROGRESS_STATUS];

export const SETTING_KEYS = {
  completionThreshold: "completion_threshold",
  parentPinHash: "parent_pin_hash",
} as const;

/** 완료 기준 기본값(%). Settings 에 값이 없을 때만 사용한다. */
export const DEFAULT_COMPLETION_THRESHOLD = 90;

/** 진행률 저장 주기(초). Player heartbeat 간격. */
export const PROGRESS_SAVE_INTERVAL_SECONDS = 10;

/**
 * heartbeat 1회에 인정하는 최대 시청 시간(초).
 * 탭 비활성화/시간 점프로 시청 시간이 부풀려지는 것을 막는다.
 */
export const MAX_WATCH_DELTA_PER_TICK_SECONDS =
  PROGRESS_SAVE_INTERVAL_SECONDS * 3;

/** 영상 순서 기본 간격. 중간 삽입 여유를 위해 10 단위를 쓴다. */
export const SEQUENCE_STEP = 10;

/** 부모 세션 유지 시간(초). */
export const PARENT_SESSION_TTL_SECONDS = 60 * 60 * 12;

export const PARENT_SESSION_COOKIE = "kep_parent";
