import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PROGRESS_STATUS, type ProgressStatus } from "@/lib/constants";
import { getCompletionThreshold } from "@/lib/settings";
import { getNextVideo } from "@/lib/learning";
import { formatClock } from "@/lib/format";
import { WatchPlayer } from "@/components/WatchPlayer";

export const dynamic = "force-dynamic";

export default async function WatchPage({
  params,
}: {
  params: Promise<{ videoId: string }>;
}) {
  const { videoId } = await params;
  const id = Number(videoId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const video = await prisma.video.findUnique({
    where: { id },
    include: { progress: true },
  });
  if (!video) notFound();

  if (!video.enabled) {
    return (
      <main className="page child">
        <div className="card">
          <h1>지금은 볼 수 없는 영상이에요</h1>
          <p className="hint">이 영상은 비활성 상태입니다. 부모님께 알려주세요.</p>
          <Link href="/" className="btn" style={{ marginTop: 16 }}>
            홈으로 가기
          </Link>
        </div>
      </main>
    );
  }

  const [completionThreshold, nextVideo] = await Promise.all([
    getCompletionThreshold(),
    getNextVideo(video.id),
  ]);

  const status = (video.progress?.status ?? PROGRESS_STATUS.NOT_STARTED) as ProgressStatus;
  const lastPosition = video.progress?.lastPositionSeconds ?? 0;

  return (
    <main className="page child">
      <div className="topbar">
        <div>
          <h1>{video.title}</h1>
          <p>
            {status === PROGRESS_STATUS.IN_PROGRESS && lastPosition > 0
              ? `지난번 ${formatClock(lastPosition)}까지 봤어요.`
              : "재생 버튼을 눌러 시작해요."}
          </p>
        </div>
        <div className="pill">진행률 {video.progress?.progressPercent ?? 0}%</div>
      </div>

      <WatchPlayer
        videoId={video.id}
        youtubeVideoId={video.youtubeVideoId}
        initialPositionSeconds={
          status === PROGRESS_STATUS.COMPLETED ? 0 : lastPosition
        }
        initialPercent={video.progress?.progressPercent ?? 0}
        initialStatus={status}
        completionThreshold={completionThreshold}
        nextVideo={nextVideo ? { id: nextVideo.id, title: nextVideo.title } : null}
      />
    </main>
  );
}
