import { NextResponse } from "next/server";
import { toApiError } from "./errors";

/** 오류를 상태 코드(401/403/400)와 사용자 메시지로 변환해 응답한다. */
export function errorResponse(error: unknown) {
  const { status, message } = toApiError(error);
  return NextResponse.json({ error: message }, { status });
}

export function readBoolean(value: string | null): boolean | null {
  if (value === null || value.trim() === "") return null;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

export function readInt(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}
