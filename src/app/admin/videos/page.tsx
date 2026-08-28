import { prisma } from "@/lib/db";
import { requirePageSession } from "@/lib/guard";
import { VideoManager } from "./VideoManager";

export const dynamic = "force-dynamic";

export default async function VideoAdminPage() {
  await requirePageSession();

  const videos = await prisma.video.findMany({
    orderBy: [{ sequence: "asc" }, { id: "asc" }],
    include: {
      playlistVideos: { include: { playlist: { select: { title: true } } } },
    },
  });

  return (
    <>
      <div className="topbar">
        <div>
          <h1>영상 관리</h1>
          <p>YouTube 영상 카탈로그입니다. 학습 순서는 학습 과정(Level)에서 관리합니다.</p>
        </div>
        <div className="pill">{videos.length} videos</div>
      </div>

      <VideoManager
        videos={videos.map((video) => ({
          id: video.id,
          title: video.title,
          youtubeVideoId: video.youtubeVideoId,
          durationSeconds: video.durationSeconds,
          enabled: video.enabled,
          playlistTitles: video.playlistVideos.map((row) => row.playlist.title),
        }))}
      />
    </>
  );
}
