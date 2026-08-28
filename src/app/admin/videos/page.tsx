import { listVideosWithProgress } from "@/lib/learning";
import { VideoManager } from "./VideoManager";

export const dynamic = "force-dynamic";

export default async function VideoAdminPage() {
  const videos = await listVideosWithProgress();

  return (
    <>
      <div className="topbar">
        <div>
          <h1>영상 관리</h1>
          <p>YouTube 영상을 등록하고 학습 순서를 관리합니다.</p>
        </div>
        <div className="pill">{videos.length} videos</div>
      </div>

      <VideoManager
        videos={videos.map((video) => ({
          id: video.id,
          title: video.title,
          youtubeVideoId: video.youtubeVideoId,
          thumbnailUrl: video.thumbnailUrl,
          durationSeconds: video.durationSeconds,
          enabled: video.enabled,
          status: video.status,
          progressPercent: video.progressPercent,
        }))}
      />
    </>
  );
}
