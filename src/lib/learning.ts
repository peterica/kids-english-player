import { prisma } from "./db";
import { getDayRange } from "./day";
import { PROGRESS_STATUS, type ProgressStatus } from "./constants";
import { selectCurrentVideo, selectNextVideo } from "./video-selection";
import { getCompletionThreshold } from "./settings";
import { getActiveChildPlaylist } from "./playlists";

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

/** 아이 기준 특정 학습 과정의 영상 목록. sequence 는 Playlist 순서를 따른다. */
export async function listPlaylistVideosForChild(
  childId: number,
  playlistId: number,
): Promise<VideoWithProgress[]> {
  const rows = await prisma.playlistVideo.findMany({
    where: { playlistId },
    orderBy: { sequence: "asc" },
    include: {
      video: {
        include: { progress: { where: { childId } } },
      },
    },
  });

  return rows.map((row) => {
    const progress = row.video.progress[0];
    return {
      id: row.video.id,
      youtubeVideoId: row.video.youtubeVideoId,
      youtubeUrl: row.video.youtubeUrl,
      title: row.video.title,
      thumbnailUrl: row.video.thumbnailUrl,
      durationSeconds: row.video.durationSeconds,
      sequence: row.sequence,
      enabled: row.video.enabled,
      status: (progress?.status ?? PROGRESS_STATUS.NOT_STARTED) as ProgressStatus,
      progressPercent: progress?.progressPercent ?? 0,
      lastPositionSeconds: progress?.lastPositionSeconds ?? 0,
      watchSeconds: progress?.watchSeconds ?? 0,
      lastWatchedAt: progress?.lastWatchedAt ?? null,
      completedAt: progress?.completedAt ?? null,
    };
  });
}

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
    watchedVideoCount: new Set(sessions.map((s) => s.videoId)).size,
    watchSeconds: sessions.reduce((sum, s) => sum + s.watchSeconds, 0),
    completedCount,
  };
}

export async function getRecentHistoryForChild(
  childId: number,
  limit = 8,
): Promise<HistoryEntry[]> {
  const rows = await prisma.videoProgress.findMany({
    where: { childId, lastWatchedAt: { not: null } },
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

export type ChildOverview = {
  playlist: { id: number; title: string; level: number } | null;
  videos: VideoWithProgress[];
  activeCount: number;
  completedCount: number;
  overallPercent: number;
  currentVideo: VideoWithProgress | null;
  today: TodayStats;
  completionThreshold: number;
};

/** 아이 홈 / 부모 상세 화면이 함께 쓰는 단일 조회. */
export async function getChildOverview(childId: number): Promise<ChildOverview> {
  const [playlist, today, completionThreshold] = await Promise.all([
    getActiveChildPlaylist(childId),
    getTodayStatsForChild(childId),
    getCompletionThreshold(),
  ]);

  const videos = playlist
    ? await listPlaylistVideosForChild(childId, playlist.id)
    : [];
  const activeVideos = videos.filter((video) => video.enabled);
  const completedCount = activeVideos.filter(
    (video) => video.status === PROGRESS_STATUS.COMPLETED,
  ).length;

  return {
    playlist: playlist
      ? { id: playlist.id, title: playlist.title, level: playlist.level }
      : null,
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

/** 재생 화면에서 "다음 영상" 을 구할 때 사용한다. 현재 과정 안에서만 고른다. */
export async function getNextVideoForChild(
  childId: number,
  currentVideoId: number,
): Promise<VideoWithProgress | null> {
  const playlist = await getActiveChildPlaylist(childId);
  if (!playlist) return null;
  const videos = await listPlaylistVideosForChild(childId, playlist.id);
  return selectNextVideo(videos, currentVideoId);
}

export type HouseholdChildSummary = {
  child: { id: number; name: string; enabled: boolean };
  playlist: { id: number; title: string; level: number } | null;
  completedCount: number;
  activeCount: number;
  overallPercent: number;
  today: TodayStats;
  currentVideoTitle: string | null;
};

/** 부모 대시보드: 가정 안의 아이 전체 요약. */
export async function getHouseholdOverview(
  householdId: number,
): Promise<HouseholdChildSummary[]> {
  const children = await prisma.child.findMany({
    where: { householdId },
    orderBy: [{ enabled: "desc" }, { id: "asc" }],
  });

  return Promise.all(
    children.map(async (child) => {
      const overview = await getChildOverview(child.id);
      return {
        child: { id: child.id, name: child.name, enabled: child.enabled },
        playlist: overview.playlist,
        completedCount: overview.completedCount,
        activeCount: overview.activeCount,
        overallPercent: overview.overallPercent,
        today: overview.today,
        currentVideoTitle: overview.currentVideo?.title ?? null,
      };
    }),
  );
}
