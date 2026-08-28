/** 진행 상태 값. VideoProgress.status / ChildPlaylist.status 에서 함께 사용한다. */
export const PROGRESS_STATUS = {
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
} as const;

export type ProgressStatus =
  (typeof PROGRESS_STATUS)[keyof typeof PROGRESS_STATUS];

export const HOUSEHOLD_ROLE = {
  OWNER: "OWNER",
  PARENT: "PARENT",
} as const;

export type HouseholdRole =
  (typeof HOUSEHOLD_ROLE)[keyof typeof HOUSEHOLD_ROLE];

export const SETTING_KEYS = {
  completionThreshold: "completion_threshold",
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

/** 로그인 세션 유지 시간(초). 가정용 공용 기기라 길게 잡는다. */
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export const SESSION_COOKIE = "kep_session";

/** 아이 이름 등 입력 길이 제한. */
export const MAX_NAME_LENGTH = 20;
export const MIN_PASSWORD_LENGTH = 8;
