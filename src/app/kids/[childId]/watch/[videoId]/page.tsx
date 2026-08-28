import Link from "next/link";
import { requirePageChild } from "@/lib/guard";
import { canWatch, getChildCatalog } from "@/lib/child-content";
import { recommendVideos } from "@/lib/recommendation";
import { getCompletionThreshold } from "@/lib/settings";
import { formatCategory } from "@/lib/format";
import { WatchPlayer } from "@/components/WatchPlayer";

export const dynamic = "force-dynamic";

export default async function WatchPage({
  params,
}: {
  params: Promise<{ childId: string; videoId: string }>;
}) {
  const { childId, videoId } = await params;
  const { session, child } = await requirePageChild(Number(childId));

  const catalog = await getChildCatalog(session.householdId, child.id);
  const id = Number(videoId);
  const item = catalog.items.find((row) => row.id === id);

  // 허용 범위 밖 영상은 재생하지 않는다.
  if (!item || !canWatch(catalog, id)) {
    return (
      <main className="page">
        <div className="card">
          <h1>지금은 볼 수 없는 영상이에요</h1>
          <p className="muted">
            부모님이 허용한 Level과 Channel 안에서만 볼 수 있어요.
          </p>
          <Link href={`/kids/${child.id}/browse`} className="btn primary" style={{ marginTop: 16 }}>
            다른 영상 찾기
          </Link>
        </div>
      </main>
    );
  }

  const [completionThreshold] = await Promise.all([getCompletionThreshold()]);
  const next = recommendVideos(catalog.items, catalog.scope.preferredChannelIds, 1, id)[0];

  return (
    <main className="page">
      <div className="topbar">
        <div>
          <h1>{item.title}</h1>
          <p>
            {item.channelName} · Level {item.level} · {formatCategory(item.category)}
          </p>
        </div>
        <div className="top-actions">
          <Link href={`/kids/${child.id}/browse`} className="btn">
            목록으로
          </Link>
        </div>
      </div>

      <WatchPlayer
        childId={child.id}
        videoId={item.id}
        youtubeVideoId={item.youtubeVideoId}
        initialPositionSeconds={
          item.watch.status === "COMPLETED" ? 0 : item.watch.lastPositionSeconds
        }
        initialPercent={item.watch.progressPercent}
        initialStatus={item.watch.status}
        completionThreshold={completionThreshold}
        nextVideo={
          next
            ? { id: next.id, title: next.title, thumbnailUrl: next.thumbnailUrl }
            : null
        }
      />
    </main>
  );
}
