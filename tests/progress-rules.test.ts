import { describe, expect, it } from "vitest";
import {
  DEFAULT_COMPLETION_THRESHOLD,
  MAX_WATCH_DELTA_PER_TICK_SECONDS,
  PROGRESS_STATUS,
} from "@/lib/constants";
import {
  applyProgressTick,
  calculateProgressPercent,
  sanitizeWatchDelta,
  shouldRecordTick,
  type ProgressSnapshot,
} from "@/lib/progress-rules";

const NOW = new Date("2026-08-28T09:00:00.000Z");

const fresh: ProgressSnapshot = {
  status: PROGRESS_STATUS.NOT_STARTED,
  lastPositionSeconds: 0,
  durationSeconds: 0,
  progressPercent: 0,
  watchSeconds: 0,
  startedAt: null,
  completedAt: null,
};

const tick = (overrides: Partial<Parameters<typeof applyProgressTick>[1]>) => ({
  positionSeconds: 0,
  durationSeconds: 600,
  watchDeltaSeconds: 10,
  completionThreshold: DEFAULT_COMPLETION_THRESHOLD,
  now: NOW,
  ...overrides,
});

describe("calculateProgressPercent", () => {
  it("위치/길이 비율을 내림하여 계산한다", () => {
    expect(calculateProgressPercent(420, 600)).toBe(70);
    expect(calculateProgressPercent(0, 600)).toBe(0);
    expect(calculateProgressPercent(600, 600)).toBe(100);
  });

  it("길이를 모르면 0 이다", () => {
    expect(calculateProgressPercent(120, 0)).toBe(0);
  });
});

describe("완료 판정", () => {
  it("89% 는 IN_PROGRESS 로 남는다", () => {
    const next = applyProgressTick(fresh, tick({ positionSeconds: 534 })); // 89%
    expect(next.progressPercent).toBe(89);
    expect(next.status).toBe(PROGRESS_STATUS.IN_PROGRESS);
    expect(next.completedAt).toBeNull();
  });

  it("90% 는 COMPLETED 가 된다", () => {
    const next = applyProgressTick(fresh, tick({ positionSeconds: 540 })); // 90%
    expect(next.progressPercent).toBe(90);
    expect(next.status).toBe(PROGRESS_STATUS.COMPLETED);
    expect(next.completedAt).toEqual(NOW);
  });

  it("ENDED 이벤트는 위치와 무관하게 COMPLETED 로 만든다", () => {
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

  it("COMPLETED 는 다시 재생해도 되돌아가지 않는다", () => {
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
    expect(next.completedAt).toEqual(NOW); // 최초 완료 시각을 유지한다
  });
});

describe("시청 시간 누적", () => {
  it("seek 한 위치 차이가 아니라 재생 경과 시간만 누적한다", () => {
    // 1분 위치에서 9분 위치로 seek 했지만 실제 재생은 10초였던 상황
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
      tick({ positionSeconds: 540 - 60, watchDeltaSeconds: 10 }),
    );
    expect(next.watchSeconds).toBe(70); // 8분(480초)이 더해지지 않는다
  });

  it("heartbeat 당 인정 시간에 상한이 있다", () => {
    expect(sanitizeWatchDelta(10)).toBe(10);
    expect(sanitizeWatchDelta(600)).toBe(MAX_WATCH_DELTA_PER_TICK_SECONDS);
    expect(sanitizeWatchDelta(-5)).toBe(0);
    expect(sanitizeWatchDelta(Number.NaN)).toBe(0);
  });

  it("일시정지 중(경과 0초) 에는 시청 시간이 늘지 않는다", () => {
    const before: ProgressSnapshot = { ...fresh, watchSeconds: 42 };
    const next = applyProgressTick(before, tick({ watchDeltaSeconds: 0 }));
    expect(next.watchSeconds).toBe(42);
  });
});

describe("첫 재생", () => {
  it("startedAt 을 최초 tick 시각으로 설정하고 이후에는 유지한다", () => {
    const first = applyProgressTick(fresh, tick({ positionSeconds: 30 }));
    expect(first.startedAt).toEqual(NOW);

    const later = new Date(NOW.getTime() + 3_600_000);
    const second = applyProgressTick(first, tick({ positionSeconds: 60, now: later }));
    expect(second.startedAt).toEqual(NOW);
  });
});

describe("shouldRecordTick", () => {
  it("재생하지 않고 페이지만 열었다 나가면 기록하지 않는다", () => {
    expect(shouldRecordTick(false, 0, false)).toBe(false);
  });

  it("실제 재생 시간이 있으면 기록한다", () => {
    expect(shouldRecordTick(false, 3, false)).toBe(true);
  });

  it("종료 이벤트는 재생 시간이 0이어도 기록한다", () => {
    expect(shouldRecordTick(false, 0, true)).toBe(true);
  });

  it("이미 진행 기록이 있으면 마지막 위치 저장을 위해 기록한다", () => {
    expect(shouldRecordTick(true, 0, false)).toBe(true);
  });
});
