import { prisma } from "./db";
import { getDayRange } from "./day";
import { PROGRESS_STATUS, type ProgressStatus } from "./constants";
import { selectCurrentVideo, selectNextVideo } from "./video-selection";
import { getCompletionThreshold } from "./settings";

export type VideoWithProgress = {
  id: number;
  youtubeVideoId: string;
  youtubeUrl: string;
  title: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  sequence: number;
  enabled: boolean;
  status: ProgressStatus;
  progressPercent: number;
  lastPositionSeconds: number;
  watchSeconds: number;
  lastWatchedAt: Date | null;
  completedAt: Date | null;
};

export type TodayStats = {
  watchedVideoCount: number;
  watchSeconds: number;
  completedCount: number;
};

export type HistoryEntry = {
  videoId: number;
  title: string;
  at: Date;
  status: ProgressStatus;
  progressPercent: number;
};

export async function listVideosWithProgress(): Promise<VideoWithProgress[]> {
  const videos = await prisma.video.findMany({
    orderBy: [{ sequence: "asc" }, { id: "asc" }],
    include: { progress: true },
  });

  return videos.map((video) => ({
    id: video.id,
    youtubeVideoId: video.youtubeVideoId,
    youtubeUrl: video.youtubeUrl,
    title: video.title,
    thumbnailUrl: video.thumbnailUrl,
    durationSeconds: video.durationSeconds,
    sequence: video.sequence,
    enabled: video.enabled,
    status: (video.progress?.status ?? PROGRESS_STATUS.NOT_STARTED) as ProgressStatus,
    progressPercent: video.progress?.progressPercent ?? 0,
    lastPositionSeconds: video.progress?.lastPositionSeconds ?? 0,
    watchSeconds: video.progress?.watchSeconds ?? 0,
    lastWatchedAt: video.progress?.lastWatchedAt ?? null,
    completedAt: video.progress?.completedAt ?? null,
  }));
}

export async function getCurrentVideo(): Promise<VideoWithProgress | null> {
  return selectCurrentVideo(await listVideosWithProgress());
}

export async function getNextVideo(
  currentVideoId: number,
): Promise<VideoWithProgress | null> {
  return selectNextVideo(await listVideosWithProgress(), currentVideoId);
}

export async function getTodayStats(now: Date = new Date()): Promise<TodayStats> {
  const { start, end } = getDayRange(now);

  const sessions = await prisma.watchSession.findMany({
    where: { startedAt: { gte: start, lt: end } },
    select: { videoId: true, watchSeconds: true },
  });

  const completedCount = await prisma.videoProgress.count({
    where: { completedAt: { gte: start, lt: end } },
  });

  return {
    watchedVideoCount: new Set(sessions.map((s) => s.videoId)).size,
    watchSeconds: sessions.reduce((sum, s) => sum + s.watchSeconds, 0),
    completedCount,
  };
}

export async function getRecentHistory(limit = 8): Promise<HistoryEntry[]> {
  const rows = await prisma.videoProgress.findMany({
    where: { lastWatchedAt: { not: null } },
    orderBy: { lastWatchedAt: "desc" },
    take: limit,
    include: { video: { select: { title: true } } },
  });

  return rows.map((row) => ({
    videoId: row.videoId,
    title: row.video.title,
    at: row.lastWatchedAt as Date,
    status: row.status as ProgressStatus,
    progressPercent: row.progressPercent,
  }));
}

export type LearningOverview = {
  videos: VideoWithProgress[];
  activeCount: number;
  completedCount: number;
  overallPercent: number;
  currentVideo: VideoWithProgress | null;
  today: TodayStats;
  completionThreshold: number;
};

export async function getLearningOverview(): Promise<LearningOverview> {
  const [videos, today, completionThreshold] = await Promise.all([
    listVideosWithProgress(),
    getTodayStats(),
    getCompletionThreshold(),
  ]);

  const activeVideos = videos.filter((video) => video.enabled);
  const completedCount = activeVideos.filter(
    (video) => video.status === PROGRESS_STATUS.COMPLETED,
  ).length;

  return {
    videos,
    activeCount: activeVideos.length,
    completedCount,
    overallPercent:
      activeVideos.length === 0
        ? 0
        : Math.floor((completedCount / activeVideos.length) * 100),
    currentVideo: selectCurrentVideo(videos),
    today,
    completionThreshold,
  };
}
