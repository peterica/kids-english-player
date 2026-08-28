import { prisma } from "./db";
import { PROGRESS_STATUS, type ProgressStatus } from "./constants";
import {
  applyProgressTick,
  emptyProgress,
  sanitizeWatchDelta,
  shouldRecordTick,
  type ProgressSnapshot,
} from "./progress-rules";
import { getCompletionThreshold } from "./settings";

export type ProgressTickInput = {
  childId: number;
  videoId: number;
  sessionId?: number | null;
  positionSeconds: number;
  durationSeconds: number;
  watchDeltaSeconds: number;
  ended?: boolean;
};

export type ProgressTickResult = {
  status: ProgressStatus;
  progressPercent: number;
  watchSeconds: number;
  lastPositionSeconds: number;
  completed: boolean;
  sessionId: number | null;
};

/** 재생을 시작할 때 시청 세션을 연다. 세션은 항상 아이 단위로 남는다. */
export async function startWatchSession(
  childId: number,
  videoId: number,
  startPositionSeconds: number,
): Promise<number> {
  const position = Math.max(0, Math.round(startPositionSeconds));
  const session = await prisma.watchSession.create({
    data: {
      childId,
      videoId,
      startPositionSeconds: position,
      endPositionSeconds: position,
    },
  });
  return session.id;
}

/** Player heartbeat 1건을 반영한다. */
export async function recordProgressTick(
  input: ProgressTickInput,
): Promise<ProgressTickResult> {
  const now = new Date();
  const completionThreshold = await getCompletionThreshold();

  const existing = await prisma.videoProgress.findUnique({
    where: { childId_videoId: { childId: input.childId, videoId: input.videoId } },
  });

  if (
    !shouldRecordTick(Boolean(existing), input.watchDeltaSeconds, input.ended === true)
  ) {
    return {
      status: PROGRESS_STATUS.NOT_STARTED,
      progressPercent: 0,
      watchSeconds: 0,
      lastPositionSeconds: 0,
      completed: false,
      sessionId: null,
    };
  }

  const current: ProgressSnapshot = existing
    ? {
        status: existing.status as ProgressStatus,
        lastPositionSeconds: existing.lastPositionSeconds,
        durationSeconds: existing.durationSeconds,
        progressPercent: existing.progressPercent,
        watchSeconds: existing.watchSeconds,
        startedAt: existing.startedAt,
        completedAt: existing.completedAt,
      }
    : emptyProgress();

  const next = applyProgressTick(current, {
    positionSeconds: input.positionSeconds,
    durationSeconds: input.durationSeconds,
    watchDeltaSeconds: input.watchDeltaSeconds,
    ended: input.ended,
    completionThreshold,
    now,
  });

  const data = {
    status: next.status,
    lastPositionSeconds: next.lastPositionSeconds,
    durationSeconds: next.durationSeconds,
    progressPercent: next.progressPercent,
    watchSeconds: next.watchSeconds,
    startedAt: next.startedAt,
    lastWatchedAt: now,
    completedAt: next.completedAt,
  };

  await prisma.videoProgress.upsert({
    where: { childId_videoId: { childId: input.childId, videoId: input.videoId } },
    create: { childId: input.childId, videoId: input.videoId, ...data },
    update: data,
  });

  if (next.durationSeconds > 0) {
    await prisma.video.update({
      where: { id: input.videoId },
      data: { durationSeconds: next.durationSeconds },
    });
  }

  const sessionId = await updateSession(input, now);

  return {
    status: next.status,
    progressPercent: next.progressPercent,
    watchSeconds: next.watchSeconds,
    lastPositionSeconds: next.lastPositionSeconds,
    completed:
      next.status === PROGRESS_STATUS.COMPLETED &&
      current.status !== PROGRESS_STATUS.COMPLETED,
    sessionId,
  };
}

async function updateSession(
  input: ProgressTickInput,
  now: Date,
): Promise<number | null> {
  if (!input.sessionId) return null;
  const session = await prisma.watchSession.findUnique({
    where: { id: input.sessionId },
  });
  // 세션 id 도 요청 body 로 들어오므로 아이/영상 소유 관계를 다시 확인한다.
  if (
    !session ||
    session.childId !== input.childId ||
    session.videoId !== input.videoId
  ) {
    return null;
  }

  await prisma.watchSession.update({
    where: { id: session.id },
    data: {
      endedAt: now,
      endPositionSeconds: Math.max(0, Math.round(input.positionSeconds)),
      watchSeconds:
        session.watchSeconds + sanitizeWatchDelta(input.watchDeltaSeconds),
    },
  });
  return session.id;
}

/** 부모만 실행한다. 그 아이의 그 영상 기록만 지운다. */
export async function resetChildVideoProgress(childId: number, videoId: number) {
  await prisma.videoProgress.deleteMany({ where: { childId, videoId } });
  await prisma.watchSession.deleteMany({ where: { childId, videoId } });
}
