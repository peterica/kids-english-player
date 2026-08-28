import { prisma } from "./db";
import { PROGRESS_STATUS } from "./constants";

export async function listPlaylists() {
  return prisma.playlist.findMany({
    where: { enabled: true },
    orderBy: [{ level: "asc" }, { id: "asc" }],
    include: { _count: { select: { videos: true } } },
  });
}

export async function getPlaylistWithVideos(playlistId: number) {
  return prisma.playlist.findUnique({
    where: { id: playlistId },
    include: {
      videos: {
        orderBy: { sequence: "asc" },
        include: { video: true },
      },
    },
  });
}

/**
 * 아이가 지금 학습 중인 과정.
 * 부모가 선택한 IN_PROGRESS 과정을 우선하고, 없으면 가장 낮은 Level 을 기본값으로 본다.
 */
export async function getActiveChildPlaylist(childId: number) {
  const active = await prisma.childPlaylist.findFirst({
    where: { childId, status: PROGRESS_STATUS.IN_PROGRESS },
    orderBy: { updatedAt: "desc" },
    include: { playlist: true },
  });
  if (active) return active.playlist;

  return prisma.playlist.findFirst({
    where: { enabled: true },
    orderBy: [{ level: "asc" }, { id: "asc" }],
  });
}

export async function listChildPlaylistStates(childId: number) {
  const [playlists, states] = await Promise.all([
    listPlaylists(),
    prisma.childPlaylist.findMany({ where: { childId } }),
  ]);

  const byPlaylistId = new Map(states.map((s) => [s.playlistId, s]));
  return playlists.map((playlist) => ({
    playlist,
    status: byPlaylistId.get(playlist.id)?.status ?? PROGRESS_STATUS.NOT_STARTED,
    videoCount: playlist._count.videos,
  }));
}
