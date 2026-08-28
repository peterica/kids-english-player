const TIME_ZONE = "Asia/Seoul";

/** 서버 타임존과 무관하게 한국 기준 '오늘'의 [start, end) 범위를 구한다. */
export function getDayRange(reference: Date = new Date()): {
  start: Date;
  end: Date;
} {
  const start = startOfLocalDay(reference);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export function startOfLocalDay(reference: Date): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(reference);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const elapsedMs =
    ((get("hour") % 24) * 3600 + get("minute") * 60 + get("second")) * 1000 +
    reference.getMilliseconds();

  return new Date(reference.getTime() - elapsedMs);
}

/** 최근 n일의 시작 시각(오늘 포함). */
export function startOfDaysAgo(days: number, reference: Date = new Date()): Date {
  const { start } = getDayRange(reference);
  return new Date(start.getTime() - days * 24 * 60 * 60 * 1000);
}
