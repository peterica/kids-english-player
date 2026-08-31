import { prisma } from "./db";
import { AppError } from "./errors";
import {
  CORRECTION_ERROR_TYPES,
  CORRECTION_STATUS,
  MAX_CORRECTION_DESCRIPTION_LENGTH,
  type CorrectionErrorType,
  type CorrectionStatus,
} from "./constants";

export type CreateCorrectionRequestInput = {
  requesterId: number;
  videoId: number;
  errorType: string;
  description: string;
};

export function validateErrorType(value: unknown): CorrectionErrorType {
  const type = String(value ?? "").trim();
  if (!(CORRECTION_ERROR_TYPES as readonly string[]).includes(type)) {
    throw new AppError(
      `오류 종류는 다음 중 하나여야 합니다: ${CORRECTION_ERROR_TYPES.join(", ")}`,
    );
  }
  return type as CorrectionErrorType;
}

export function validateDescription(value: unknown): string {
  const description = String(value ?? "").trim();
  if (!description) throw new AppError("어떤 문제인지 설명을 입력해 주세요.");
  if (description.length > MAX_CORRECTION_DESCRIPTION_LENGTH) {
    throw new AppError(
      `설명은 ${MAX_CORRECTION_DESCRIPTION_LENGTH}자 이내로 입력해 주세요.`,
    );
  }
  return description;
}

/**
 * 부모가 공용 Content Library 영상의 오류를 신고한다.
 * 상태(OPEN)와 requesterId 는 서버가 정한다.
 */
export async function createCorrectionRequest(input: CreateCorrectionRequestInput) {
  const errorType = validateErrorType(input.errorType);
  const description = validateDescription(input.description);

  if (!Number.isInteger(input.videoId) || input.videoId <= 0) {
    throw new AppError("영상을 찾을 수 없습니다.");
  }
  const video = await prisma.video.findFirst({
    where: { id: input.videoId, householdId: null },
  });
  if (!video) throw new AppError("영상을 찾을 수 없습니다.");

  return prisma.correctionRequest.create({
    data: {
      videoId: video.id,
      requesterId: input.requesterId,
      errorType,
      description,
      status: CORRECTION_STATUS.OPEN,
    },
  });
}

/** 본인이 낸 요청만 본다. */
export async function listMyCorrectionRequests(requesterId: number) {
  const rows = await prisma.correctionRequest.findMany({
    where: { requesterId },
    orderBy: { createdAt: "desc" },
    include: { video: { select: { id: true, title: true } } },
  });
  return rows.map(toCorrectionRequest);
}

export type AdminCorrectionFilter = {
  status?: string | null;
  errorType?: string | null;
  videoId?: number | null;
};

export async function listCorrectionRequestsForAdmin(
  filter: AdminCorrectionFilter = {},
) {
  const rows = await prisma.correctionRequest.findMany({
    where: {
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.errorType ? { errorType: filter.errorType } : {}),
      ...(filter.videoId ? { videoId: filter.videoId } : {}),
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      video: { select: { id: true, title: true } },
      requester: { select: { id: true, displayName: true } },
    },
  });
  return rows.map(toCorrectionRequest);
}

/**
 * Admin 처리. OPEN → RESOLVED / REJECTED 만 허용한다.
 * 두 종료 상태로 바뀌는 시점에 resolvedAt 을 기록한다(재오픈·이력은 만들지 않는다).
 */
export async function updateCorrectionRequestStatus(id: number, status: string) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError("수정 요청을 찾을 수 없습니다.");
  }
  if (status !== CORRECTION_STATUS.RESOLVED && status !== CORRECTION_STATUS.REJECTED) {
    throw new AppError("상태는 RESOLVED 또는 REJECTED 여야 합니다.");
  }

  const request = await prisma.correctionRequest.findUnique({ where: { id } });
  if (!request) throw new AppError("수정 요청을 찾을 수 없습니다.");
  if (request.status !== CORRECTION_STATUS.OPEN) {
    throw new AppError("이미 처리된 요청입니다.");
  }

  return prisma.correctionRequest.update({
    where: { id },
    data: { status: status as CorrectionStatus, resolvedAt: new Date() },
  });
}

type CorrectionRow = {
  id: number;
  videoId: number;
  requesterId: number;
  errorType: string;
  description: string;
  status: string;
  createdAt: Date;
  resolvedAt: Date | null;
  video?: { id: number; title: string } | null;
  requester?: { id: number; displayName: string } | null;
};

function toCorrectionRequest(row: CorrectionRow) {
  return {
    id: row.id,
    videoId: row.videoId,
    videoTitle: row.video?.title ?? null,
    requesterId: row.requesterId,
    requesterName: row.requester?.displayName ?? null,
    errorType: row.errorType as CorrectionErrorType,
    description: row.description,
    status: row.status as CorrectionStatus,
    createdAt: row.createdAt,
    resolvedAt: row.resolvedAt,
  };
}

export type CorrectionRequestView = ReturnType<typeof toCorrectionRequest>;
