import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePageChild } from "@/lib/guard";
import { PROGRESS_STATUS, type ProgressStatus } from "@/lib/constants";
import { getCompletionThreshold } from "@/lib/settings";
import { getNextVideoForChild } from "@/lib/learning";
import { getActiveChildPlaylist } from "@/lib/playlists";
import { formatClock } from "@/lib/format";
import { WatchPlayer } from "@/components/WatchPlayer";

export const dynamic = "force-dynamic";

export default async function WatchPage({
  params,
}: {
  params: Promise<{ childId: string; videoId: string }>;
}) {
  const { childId, videoId } = await params;
  const { child } = await requirePageChild(Number(childId));

  const id = Number(videoId);
  const video = Number.isInteger(id)
    ? await prisma.video.findUnique({
        where: { id },
        include: { progress: { where: { childId: child.id } } },
      })
    : null;

  if (!video) return <PlayerNotice childId={child.id} title="영상을 찾을 수 없어요" />;
  if (!video.enabled) {
    return (
      <PlayerNotice
        childId={child.id}
        title="지금은 볼 수 없는 영상이에요"
        description="이 영상은 비활성 상태입니다. 부모님께 알려주세요."
      />
    );
  }

  // 현재 학습 과정에 속한 영상만 재생한다.
  const playlist = await getActiveChildPlaylist(child.id);
  const inPlaylist = playlist
    ? await prisma.playlistVideo.findFirst({
        where: { playlistId: playlist.id, videoId: video.id },
      })
    : null;
  if (!inPlaylist) {
    return (
      <PlayerNotice
        childId={child.id}
        title="지금 학습 과정에 없는 영상이에요"
        description="부모님이 학습 과정을 바꾸면 볼 수 있어요."
      />
    );
  }

  const [completionThreshold, nextVideo] = await Promise.all([
    getCompletionThreshold(),
    getNextVideoForChild(child.id, video.id),
  ]);

  const progress = video.progress[0];
  const status = (progress?.status ?? PROGRESS_STATUS.NOT_STARTED) as ProgressStatus;
  const lastPosition = progress?.lastPositionSeconds ?? 0;

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
        <div className="pill">
          {child.name} · 진행률 {progress?.progressPercent ?? 0}%
        </div>
      </div>

      <WatchPlayer
        childId={child.id}
        videoId={video.id}
        youtubeVideoId={video.youtubeVideoId}
        initialPositionSeconds={status === PROGRESS_STATUS.COMPLETED ? 0 : lastPosition}
        initialPercent={progress?.progressPercent ?? 0}
        initialStatus={status}
        completionThreshold={completionThreshold}
        nextVideo={nextVideo ? { id: nextVideo.id, title: nextVideo.title } : null}
      />
    </main>
  );
}

function PlayerNotice({
  childId,
  title,
  description,
}: {
  childId: number;
  title: string;
  description?: string;
}) {
  return (
    <main className="page child">
      <div className="card">
        <h1>{title}</h1>
        {description ? <p className="hint">{description}</p> : null}
        <Link href={`/kids/${childId}`} className="btn" style={{ marginTop: 16 }}>
          홈으로 가기
        </Link>
      </div>
    </main>
  );
}
