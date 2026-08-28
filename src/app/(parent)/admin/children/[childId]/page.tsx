import Link from "next/link";
import { requirePageChild } from "@/lib/guard";
import { getChildCatalog } from "@/lib/child-content";
import { getTodayStatsForChild } from "@/lib/stats";
import { getOrCreateChildCollection, getCollectionDetail } from "@/lib/collections";
import { prisma } from "@/lib/db";
import { PROGRESS_STATUS } from "@/lib/constants";
import { formatCategory, formatKoreanDuration, formatTimeOfDay } from "@/lib/format";
import { ProgressBar } from "@/components/ProgressBar";
import { WatchStatus } from "@/components/WatchStatus";

export const dynamic = "force-dynamic";

export default async function ChildDetailPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = await params;
  const { session, child } = await requirePageChild(Number(childId));

  const catalog = await getChildCatalog(session.householdId, child.id);
  const collection = await getOrCreateChildCollection(session.householdId, child.id);
  const [today, detail, completedCount, recent] = await Promise.all([
    getTodayStatsForChild(child.id),
    getCollectionDetail(session.householdId, collection.id),
    prisma.videoProgress.count({
      where: { childId: child.id, status: PROGRESS_STATUS.COMPLETED },
    }),
    prisma.videoProgress.findMany({
      where: { childId: child.id, lastWatchedAt: { not: null } },
      orderBy: { lastWatchedAt: "desc" },
      take: 8,
      include: { video: { select: { title: true } } },
    }),
  ]);

  const percent =
    catalog.items.length === 0
      ? 0
      : Math.min(100, Math.floor((completedCount / catalog.items.length) * 100));

  return (
    <>
      <div className="topbar">
        <div>
          <h1>{child.name}</h1>
          <p>
            Level {catalog.scope.minLevel}–{catalog.scope.maxLevel} ·{" "}
            {catalog.scope.preferredChannelIds.length === 0
              ? "모든 Channel"
              : `${catalog.channels.map((c) => c.name).join(", ")} 선호`}
          </p>
        </div>
        <div className="top-actions">
          <Link href="/admin/children" className="btn">
            설정 변경
          </Link>
          <Link href={`/kids/${child.id}`} className="btn primary">
            아이 화면 열기
          </Link>
        </div>
      </div>

      <div className="grid four">
        <div className="stat">
          <span className="label">전체 진행률</span>
          <strong>{percent}%</strong>
          <div style={{ marginTop: 10 }}>
            <ProgressBar percent={percent} />
          </div>
        </div>
        <div className="stat">
          <span className="label">완료한 영상</span>
          <strong>
            {completedCount} / {catalog.items.length}
          </strong>
        </div>
        <div className="stat">
          <span className="label">오늘 학습</span>
          <strong>{formatKoreanDuration(today.watchSeconds)}</strong>
        </div>
        <div className="stat">
          <span className="label">오늘 본 영상</span>
          <strong>{today.watchedVideoCount}편</strong>
        </div>
      </div>

      <div className="grid two" style={{ marginTop: 18 }}>
        <div className="card">
          <div className="section-title">
            <h2>최근 시청</h2>
            <span className="muted small">최근 {recent.length}건</span>
          </div>
          {recent.length === 0 ? (
            <p className="muted small">아직 시청 기록이 없습니다.</p>
          ) : (
            recent.map((row) => (
              <div className="collection-row" key={row.id}>
                <div className="order">
                  {formatTimeOfDay(row.lastWatchedAt as Date)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <strong>{row.video.title}</strong>
                  <div className="muted small">{row.progressPercent}% 시청</div>
                </div>
                <WatchStatus
                  status={row.status as never}
                  percent={row.progressPercent}
                />
              </div>
            ))
          )}
        </div>

        <div className="card">
          <div className="section-title">
            <h2>{child.name} Collection</h2>
            <Link href="/collections" className="btn small">
              관리
            </Link>
          </div>
          {!detail || detail.videos.length === 0 ? (
            <p className="muted small">
              아직 담은 영상이 없습니다. <Link href="/library">Content Library</Link> 에서
              가져오세요. 담지 않아도 허용 Level·Channel 범위의 영상은 볼 수 있습니다.
            </p>
          ) : (
            detail.videos.map((row, index) => (
              <div className="collection-row" key={row.id}>
                <div className="order">{index + 1}</div>
                <div style={{ minWidth: 0 }}>
                  <strong>{row.video.title}</strong>
                  <div className="muted small">
                    {row.video.channel.name} · Level {row.video.level}
                  </div>
                </div>
                <span className={`status ${row.enabled ? "done" : "wait"}`}>
                  {row.enabled ? "보임" : "숨김"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <section className="card" style={{ marginTop: 18 }}>
        <div className="section-title">
          <h2>볼 수 있는 영상</h2>
          <span className="muted small">{catalog.items.length}편</span>
        </div>
        {catalog.items.length === 0 ? (
          <p className="muted small">
            허용 범위에 맞는 영상이 없습니다. Level 범위나 선호 Channel을 넓혀 주세요.
          </p>
        ) : (
          catalog.items.map((item, index) => (
            <div className="collection-row" key={item.id}>
              <div className="order">{index + 1}</div>
              <div style={{ minWidth: 0 }}>
                <strong>{item.title}</strong>
                <div className="muted small">
                  {item.channelName} · Level {item.level} · {formatCategory(item.category)}
                </div>
              </div>
              <div className="row-actions">
                <WatchStatus
                  status={item.watch.status}
                  percent={item.watch.progressPercent}
                />
                <Link
                  href={`/kids/${child.id}/watch/${item.id}`}
                  className="btn small"
                >
                  열기
                </Link>
              </div>
            </div>
          ))
        )}
      </section>
    </>
  );
}
