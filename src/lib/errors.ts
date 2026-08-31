/** 사용자에게 그대로 보여줘도 안전한 오류. 서버 stack trace 는 노출하지 않는다. */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppError";
  }
}

/** 로그인하지 않은 요청 (HTTP 401) */
export class UnauthorizedError extends Error {
  constructor(message = "로그인이 필요합니다.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/** 로그인했지만 권한이 없는 요청 (HTTP 403) */
export class ForbiddenError extends Error {
  constructor(message = "권한이 없습니다.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** 오류를 API 응답 상태 코드와 메시지로 변환한다. */
export function toApiError(error: unknown): { status: number; message: string } {
  if (error instanceof UnauthorizedError) return { status: 401, message: error.message };
  if (error instanceof ForbiddenError) return { status: 403, message: error.message };
  return { status: 400, message: toUserMessage(error) };
}

export function toUserMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  console.error("[kids-english-player-v2]", error);
  return "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}
