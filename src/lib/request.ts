import { AppError } from "./errors";

/** API 입력 검증: 유한한 0 이상의 숫자만 허용한다. */
export function readNumber(value: unknown, field: string): number {
  const parsed = typeof value === "string" ? Number(value) : value;
  if (typeof parsed !== "number" || !Number.isFinite(parsed) || parsed < 0) {
    throw new AppError(`잘못된 요청입니다. (${field})`);
  }
  return parsed;
}

export function readOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) && parsed > 0
    ? parsed
    : null;
}
