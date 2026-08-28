import { prisma } from "./db";
import { AppError } from "./errors";
import { MAX_LEVEL, MIN_LEVEL, PLAY_MODE, type PlayMode } from "./constants";
import { authorizeAutoPlaySession, authorizeChild } from "./auth";
import { getChildCatalog } from "./child-content";
import {
  isAutoPlayExpired,
  pickNextAutoPlayVideo,
  remainingSeconds,
  selectAutoPlayCandidates,
  type AutoPlayConfig,
} from "./autoplay-rules";

export type StartAutoPlayInput = {
  channelId: number | null;
  minLevel: number;
  maxLevel: number;
  playMode: PlayMode;
  replayCompleted: boolean;
  maxMinutes: number | null;
};

export async function startAutoPlaySession(
  householdId: number,
  childId: number,
  input: StartAutoPlayInput,
) {
  await authorizeChild(householdId, childId);

  const minLevel = clampLevel(input.minLevel);
  const maxLevel = clampLevel(input.maxLevel);
  if (minLevel > maxLevel) throw new AppError("Level 범위를 확인해 주세요.");

  const catalog = await getChildCatalog(householdId, childId);
  const config: AutoPlayConfig = {
    channelId: input.channelId,
    minLevel,
    maxLevel,
    playMode: input.playMode,
    replayCompleted: input.replayCompleted,
  };

  const candidates = selectAutoPlayCandidates(catalog.items, config);
  if (candidates.length === 0) {
    throw new AppError("조건에 맞는 영상이 없습니다. Channel 이나 Level 을 바꿔 보세요.");
  }

  const first = pickNextAutoPlayVideo(candidates, null, input.playMode);

  // 이전에 켜 둔 세션은 정리한다.
  await prisma.autoPlaySession.updateMany({
    where: { childId, endedAt: null },
    data: { endedAt: new Date() },
  });

  return prisma.autoPlaySession.create({
    data: {
      childId,
      channelId: input.channelId,
      minLevel,
      maxLevel,
      playMode: input.playMode,
      replayCompleted: input.replayCompleted,
      maxMinutes: input.maxMinutes,
      currentVideoId: first?.id ?? null,
      playedVideoCount: first ? 1 : 0,
    },
  });
}

export async function getActiveAutoPlaySession(householdId: number, childId: number) {
  await authorizeChild(householdId, childId);
  return prisma.autoPlaySession.findFirst({
    where: { childId, endedAt: null },
    orderBy: { startedAt: "desc" },
    include: { channel: true, video: true },
  });
}

export type AutoPlayNextResult = {
  ended: boolean;
  reason?: "EXPIRED" | "NO_CANDIDATE";
  videoId: number | null;
  title: string | null;
  remainingSeconds: number | null;
  playedVideoCount: number;
};

/** 현재 영상이 끝났을 때 다음 영상을 정한다. */
export async function advanceAutoPlaySession(
  householdId: number,
  sessionId: number,
  now: Date = new Date(),
): Promise<AutoPlayNextResult> {
  const session = await authorizeAutoPlaySession(householdId, sessionId);
  if (session.endedAt) {
    return {
      ended: true,
      reason: "EXPIRED",
      videoId: null,
      title: null,
      remainingSeconds: 0,
      playedVideoCount: session.playedVideoCount,
    };
  }

  if (isAutoPlayExpired(session.startedAt, session.maxMinutes, now)) {
    await prisma.autoPlaySession.update({
      where: { id: session.id },
      data: { endedAt: now },
    });
    return {
      ended: true,
      reason: "EXPIRED",
      videoId: null,
      title: null,
      remainingSeconds: 0,
      playedVideoCount: session.playedVideoCount,
    };
  }

  const catalog = await getChildCatalog(householdId, session.childId);
  const candidates = selectAutoPlayCandidates(catalog.items, {
    channelId: session.channelId,
    minLevel: session.minLevel,
    maxLevel: session.maxLevel,
    playMode: session.playMode as PlayMode,
    replayCompleted: session.replayCompleted,
  });

  const next = pickNextAutoPlayVideo(
    candidates,
    session.currentVideoId,
    session.playMode as PlayMode,
  );

  if (!next) {
    await prisma.autoPlaySession.update({
      where: { id: session.id },
      data: { endedAt: now },
    });
    return {
      ended: true,
      reason: "NO_CANDIDATE",
      videoId: null,
      title: null,
      remainingSeconds: 0,
      playedVideoCount: session.playedVideoCount,
    };
  }

  const updated = await prisma.autoPlaySession.update({
    where: { id: session.id },
    data: {
      currentVideoId: next.id,
      playedVideoCount: session.playedVideoCount + 1,
    },
  });

  return {
    ended: false,
    videoId: next.id,
    title: next.title,
    remainingSeconds: remainingSeconds(session.startedAt, session.maxMinutes, now),
    playedVideoCount: updated.playedVideoCount,
  };
}

export async function endAutoPlaySession(householdId: number, sessionId: number) {
  const session = await authorizeAutoPlaySession(householdId, sessionId);
  if (session.endedAt) return session;
  return prisma.autoPlaySession.update({
    where: { id: session.id },
    data: { endedAt: new Date() },
  });
}

/** 설정 화면에서 "재생 예정" 목록을 보여주기 위한 미리보기 */
export async function previewAutoPlayQueue(
  householdId: number,
  childId: number,
  config: AutoPlayConfig,
  limit = 5,
) {
  const catalog = await getChildCatalog(householdId, childId);
  return selectAutoPlayCandidates(catalog.items, config).slice(0, limit);
}

export const DEFAULT_PLAY_MODE = PLAY_MODE.SEQUENTIAL;

function clampLevel(level: number): number {
  const value = Math.round(Number(level));
  if (!Number.isFinite(value)) return MIN_LEVEL;
  return Math.min(Math.max(value, MIN_LEVEL), MAX_LEVEL);
}
