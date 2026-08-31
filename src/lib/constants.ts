/** 영상 시청 상태. VideoProgress.status 에 저장한다. */
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
  /** 운영자. Parent 기능을 그대로 쓰면서 Content Library 원본을 관리한다. */
  ADMIN: "ADMIN",
} as const;

export type HouseholdRole =
  (typeof HOUSEHOLD_ROLE)[keyof typeof HOUSEHOLD_ROLE];

/** 부모가 신고할 수 있는 오류 종류 */
export const CORRECTION_ERROR_TYPES = [
  "PLAYBACK_UNAVAILABLE",
  "WRONG_LEVEL",
  "WRONG_CATEGORY",
  "TITLE_ERROR",
  "OTHER",
] as const;

export type CorrectionErrorType = (typeof CORRECTION_ERROR_TYPES)[number];

/** 수정 요청 상태. 생성 시 OPEN, Admin 이 RESOLVED 또는 REJECTED 로 종료한다. */
export const CORRECTION_STATUS = {
  OPEN: "OPEN",
  RESOLVED: "RESOLVED",
  REJECTED: "REJECTED",
} as const;

export type CorrectionStatus =
  (typeof CORRECTION_STATUS)[keyof typeof CORRECTION_STATUS];

export const MAX_CORRECTION_DESCRIPTION_LENGTH = 500;

/** Auto Play 재생 순서 */
export const PLAY_MODE = {
  SEQUENTIAL: "SEQUENTIAL",
  RANDOM: "RANDOM",
} as const;

export type PlayMode = (typeof PLAY_MODE)[keyof typeof PLAY_MODE];

/** 영상 난이도. Level 은 경로가 아니라 필터용 속성이다. */
export const MIN_LEVEL = 1;
export const MAX_LEVEL = 5;
export const LEVELS = [1, 2, 3, 4, 5] as const;

/** 영상 카테고리 */
export const CATEGORIES = [
  "STORY",
  "PHONICS",
  "SONG",
  "DAILY_LIFE",
  "FEELINGS",
  "SCHOOL",
  "FAMILY",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const SETTING_KEYS = {
  completionThreshold: "completion_threshold",
} as const;

/** 완료 기준(%) 기본값. Setting 에 값이 없을 때만 사용한다. */
export const DEFAULT_COMPLETION_THRESHOLD = 90;

/** Player heartbeat 주기(초) */
export const PROGRESS_SAVE_INTERVAL_SECONDS = 10;

/** heartbeat 1회에 인정하는 최대 시청 시간(초). 비정상 delta 상한. */
export const MAX_WATCH_DELTA_PER_TICK_SECONDS =
  PROGRESS_SAVE_INTERVAL_SECONDS * 3;

/** Collection / 직접 등록 영상의 순서 간격 */
export const SEQUENCE_STEP = 10;

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
export const SESSION_COOKIE = "kep2_session";

export const MAX_NAME_LENGTH = 20;
export const MIN_PASSWORD_LENGTH = 8;
/** 로그인 아이디. 인스턴스 내부에서만 쓰며 개인 식별정보를 담지 않는다. */
export const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 20;
/** 단일 가정 인스턴스의 기본 가정 이름. 개인 실명을 쓰지 않는다. */
export const DEFAULT_HOUSEHOLD_NAME = "우리 가족";
export const MAX_CHILDREN_PER_HOUSEHOLD = 10;

/** Auto Play 재생 시간 선택지(분). null 은 제한 없음. */
export const AUTO_PLAY_DURATION_OPTIONS = [15, 30, 60, null] as const;
