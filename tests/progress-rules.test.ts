import { describe, expect, it } from "vitest";
import {
  DEFAULT_COMPLETION_THRESHOLD,
  MAX_WATCH_DELTA_PER_TICK_SECONDS,
  PROGRESS_STATUS,
} from "@/lib/constants";
import {
  applyProgressTick,
  calculateProgressPercent,
  emptyProgress,
  sanitizeWatchDelta,
  shouldRecordTick,
  type ProgressSnapshot,
} from "@/lib/progress-rules";

const NOW = new Date("2026-08-28T09:00:00.000Z");
const fresh = emptyProgress();

const tick = (overrides: Partial<Parameters<typeof applyProgressTick>[1]>) => ({
  positionSeconds: 0,
  durationSeconds: 600,
  watchDeltaSeconds: 10,
  completionThreshold: DEFAULT_COMPLETION_THRESHOLD,
  now: NOW,
  ...overrides,
});

describe("진행률 계산", () => {
  it("위치/길이 비율을 내림한다", () => {
    expect(calculateProgressPercent(420, 600)).toBe(70);
    expect(calculateProgressPercent(600, 600)).toBe(100);
    expect(calculateProgressPercent(120, 0)).toBe(0);
  });
});

describe("완료 판정", () => {
  it("89% 는 IN_PROGRESS 로 남는다", () => {
    const next = applyProgressTick(fresh, tick({ positionSeconds: 534 }));
    expect(next.progressPercent).toBe(89);
    expect(next.status).toBe(PROGRESS_STATUS.IN_PROGRESS);
    expect(next.completedAt).toBeNull();
  });

  it("90% 는 COMPLETED 가 된다", () => {
    const next = applyProgressTick(fresh, tick({ positionSeconds: 540 }));
    expect(next.progressPercent).toBe(90);
    expect(next.status).toBe(PROGRESS_STATUS.COMPLETED);
    expect(next.completedAt).toEqual(NOW);
  });

  it("ENDED 는 위치와 무관하게 COMPLETED 로 만든다", () => {
    const next = applyProgressTick(fresh, tick({ positionSeconds: 12, ended: true }));
    expect(next.status).toBe(PROGRESS_STATUS.COMPLETED);
    expect(next.progressPercent).toBe(100);
  });

  it("완료 기준값은 설정에서 주입된다", () => {
    const next = applyProgressTick(
      fresh,
      tick({ positionSeconds: 300, completionThreshold: 50 }),
    );
    expect(next.status).toBe(PROGRESS_STATUS.COMPLETED);
  });

  it("COMPLETED 는 다시 재생해도 회귀하지 않는다", () => {
    const completed: ProgressSnapshot = {
      ...fresh,
      status: PROGRESS_STATUS.COMPLETED,
      durationSeconds: 600,
      progressPercent: 100,
      startedAt: NOW,
      completedAt: NOW,
    };
    const later = new Date(NOW.getTime() + 60_000);
    const next = applyProgressTick(
      completed,
      tick({ positionSeconds: 5, watchDeltaSeconds: 5, now: later }),
    );
    expect(next.status).toBe(PROGRESS_STATUS.COMPLETED);
    expect(next.progressPercent).toBe(100);
    expect(next.completedAt).toEqual(NOW);
  });
});

describe("시청 시간", () => {
  it("seek 한 위치 차이가 아니라 재생 경과 시간만 누적한다", () => {
    const before: ProgressSnapshot = {
      ...fresh,
      status: PROGRESS_STATUS.IN_PROGRESS,
      lastPositionSeconds: 60,
      durationSeconds: 600,
      progressPercent: 10,
      watchSeconds: 60,
      startedAt: NOW,
    };
    const next = applyProgressTick(
      before,
      tick({ positionSeconds: 540, watchDeltaSeconds: 10 }),
    );
    expect(next.watchSeconds).toBe(70);
  });

  it("일시정지(경과 0초) 에는 늘지 않는다", () => {
    const before: ProgressSnapshot = { ...fresh, watchSeconds: 42 };
    expect(applyProgressTick(before, tick({ watchDeltaSeconds: 0 })).watchSeconds).toBe(42);
  });

  it("비정상 heartbeat 에는 상한을 적용한다", () => {
    expect(sanitizeWatchDelta(10)).toBe(10);
    expect(sanitizeWatchDelta(600)).toBe(MAX_WATCH_DELTA_PER_TICK_SECONDS);
    expect(sanitizeWatchDelta(-5)).toBe(0);
    expect(sanitizeWatchDelta(Number.NaN)).toBe(0);
  });
});

describe("shouldRecordTick", () => {
  it("재생 없이 화면만 열었다 나가면 기록하지 않는다", () => {
    expect(shouldRecordTick(false, 0, false)).toBe(false);
  });

  it("실제 재생/종료/기존 기록이 있으면 기록한다", () => {
    expect(shouldRecordTick(false, 3, false)).toBe(true);
    expect(shouldRecordTick(false, 0, true)).toBe(true);
    expect(shouldRecordTick(true, 0, false)).toBe(true);
  });
});
