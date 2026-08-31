import { prisma } from "./db";
import { getDayRange, startOfDaysAgo } from "./day";
import { PROGRESS_STATUS, type ProgressStatus } from "./constants";

export type TodayStats = {
  watchedVideoCount: number;
  watchSeconds: number;
  completedCount: number;
};

export async function getTodayStatsForChild(
  childId: number,
  now: Date = new Date(),
): Promise<TodayStats> {
  const { start, end } = getDayRange(now);
  const [sessions, completedCount] = await Promise.all([
    prisma.watchSession.findMany({
      where: { childId, startedAt: { gte: start, lt: end } },
      select: { videoId: true, watchSeconds: true },
    }),
    prisma.videoProgress.count({
      where: { childId, completedAt: { gte: start, lt: end } },
    }),
  ]);

  return {
    watchedVideoCount: new Set(sessions.map((row) => row.videoId)).size,
    watchSeconds: sessions.reduce((sum, row) => sum + row.watchSeconds, 0),
    completedCount,
  };
}

export type RecentWatch = {
  childId: number;
  childName: string;
  videoId: number;
  title: string;
  at: Date;
  status: ProgressStatus;
  progressPercent: number;
};

export async function getRecentWatchForHousehold(
  householdId: number,
  limit = 8,
): Promise<RecentWatch[]> {
  const rows = await prisma.videoProgress.findMany({
    where: { child: { householdId }, lastWatchedAt: { not: null } },
    orderBy: { lastWatchedAt: "desc" },
    take: limit,
    include: { child: true, video: { select: { title: true } } },
  });

  return rows.map((row) => ({
    childId: row.childId,
    childName: row.child.name,
    videoId: row.videoId,
    title: row.video.title,
    at: row.lastWatchedAt as Date,
    status: row.status as ProgressStatus,
    progressPercent: row.progressPercent,
  }));
}

export type HouseholdSummary = {
  childCount: number;
  todayWatchSeconds: number;
  weeklyCompletedCount: number;
  collectionCount: number;
};

export async function getHouseholdSummary(
  householdId: number,
  now: Date = new Date(),
): Promise<HouseholdSummary> {
  const { start, end } = getDayRange(now);
  const weekStart = startOfDaysAgo(6, now);

  const [childCount, sessions, weeklyCompletedCount, collectionCount] =
    await Promise.all([
      prisma.child.count({ where: { householdId, enabled: true } }),
      prisma.watchSession.findMany({
        where: { child: { householdId }, startedAt: { gte: start, lt: end } },
        select: { watchSeconds: true },
      }),
      prisma.videoProgress.count({
        where: {
          child: { householdId },
          status: PROGRESS_STATUS.COMPLETED,
          completedAt: { gte: weekStart, lt: end },
        },
      }),
      prisma.collection.count({ where: { householdId } }),
    ]);

  return {
    childCount,
    todayWatchSeconds: sessions.reduce((sum, row) => sum + row.watchSeconds, 0),
    weeklyCompletedCount,
    collectionCount,
  };
}
