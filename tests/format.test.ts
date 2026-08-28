import { describe, expect, it } from "vitest";
import { formatClock, formatKoreanDuration } from "@/lib/format";
import { getDayRange } from "@/lib/day";

describe("formatClock", () => {
  it("mm:ss 와 h:mm:ss 를 만든다", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(312)).toBe("5:12");
    expect(formatClock(3725)).toBe("1:02:05");
  });
});

describe("formatKoreanDuration", () => {
  it("초/분/시간 단위를 표기한다", () => {
    expect(formatKoreanDuration(45)).toBe("45초");
    expect(formatKoreanDuration(1440)).toBe("24분");
    expect(formatKoreanDuration(3600)).toBe("1시간");
    expect(formatKoreanDuration(3960)).toBe("1시간 6분");
  });
});

describe("getDayRange", () => {
  it("한국 시간 기준 하루 범위를 만든다", () => {
    const { start, end } = getDayRange(new Date("2026-08-28T01:30:00.000Z"));
    // 2026-08-28 10:30 KST → 하루 시작은 2026-08-27T15:00Z (= 08-28 00:00 KST)
    expect(start.toISOString()).toBe("2026-08-27T15:00:00.000Z");
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});
