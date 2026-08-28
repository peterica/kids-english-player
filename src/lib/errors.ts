/** 사용자에게 그대로 보여줘도 안전한 오류. 서버 stack trace 는 노출하지 않는다. */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppError";
  }
}

export function toUserMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  console.error("[kids-english-player-v2]", error);
  return "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}
