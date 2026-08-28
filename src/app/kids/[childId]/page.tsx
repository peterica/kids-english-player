import Link from "next/link";
import { requirePageChild } from "@/lib/guard";
import { getChildCatalog } from "@/lib/child-content";
import { getTodayStatsForChild } from "@/lib/stats";
import { pickContinueWatching, recommendVideos } from "@/lib/recommendation";
import { formatKoreanDuration } from "@/lib/format";
import { ProgressBar } from "@/components/ProgressBar";
import { VideoCard } from "@/components/VideoCard";

export const dynamic = "force-dynamic";

export default async function ChildHomePage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = await params;
  const { session, child } = await requirePageChild(Number(childId));

  const catalog = await getChildCatalog(session.householdId, child.id);
  const today = await getTodayStatsForChild(child.id);

  const continueWatching = pickContinueWatching(catalog.items, catalog.lastWatchedAt);
  const recommended = recommendVideos(
    catalog.items,
    catalog.scope.preferredChannelIds,
    4,
    continueWatching?.id ?? null,
  );

  return (
    <main className="page child-home">
      <div className="topbar">
        <div>
          <h1>안녕, {child.name}!</h1>
          <p>
            오늘은 어떤 영어 영상을 볼까요? · 오늘 {today.watchedVideoCount}편 ·{" "}
            {formatKoreanDuration(today.watchSeconds)}
          </p>
        </div>
        <div className="top-actions">
          <Link href="/kids" className="btn">
            아이 바꾸기
          </Link>
        </div>
      </div>

      {continueWatching ? (
        <div className="card continue-card">
          <div className="continue-info">
            <span className="tag blue">이어서 보기</span>
            <h2>{continueWatching.title}</h2>
            <p className="muted">
              {continueWatching.channelName} · Level {continueWatching.level} ·{" "}
              {continueWatching.watch.progressPercent}% 시청
            </p>
            <div style={{ margin: "18px 0" }}>
              <ProgressBar percent={continueWatching.watch.progressPercent} />
            </div>
            <Link
              href={`/kids/${child.id}/watch/${continueWatching.id}`}
              className="btn primary big"
            >
              ▶ 이어서 보기
            </Link>
          </div>
          <div className="continue-visual">
            {continueWatching.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={continueWatching.thumbnailUrl} alt="" />
            ) : (
              continueWatching.channelName
            )}
          </div>
        </div>
      ) : (
        <div className="hero">
          <span className="eyebrow">오늘의 영어</span>
          <h2>보고 싶은 영상을 골라 볼까요?</h2>
          <p>
            좋아하는 Channel을 고르거나, 계속 틀어놓기로 영어를 들으면서 놀 수도 있어요.
          </p>
          <div style={{ marginTop: 22, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href={`/kids/${child.id}/browse`} className="btn primary big">
              원하는 영상 찾기
            </Link>
            <Link href={`/kids/${child.id}/autoplay`} className="btn big">
              ▶ 계속 틀어놓기
            </Link>
          </div>
        </div>
      )}

      <div className="grid two" style={{ marginTop: 18 }}>
        <div className="card">
          <div className="section-title">
            <h2>오늘 추천</h2>
            <span className="tag blue">
              Level {catalog.scope.minLevel}–{catalog.scope.maxLevel}
            </span>
          </div>

          {recommended.length === 0 ? (
            <p className="muted small">
              볼 수 있는 영상이 아직 없어요. 부모님께 알려주세요.
            </p>
          ) : (
            <div className="video-grid two">
              {recommended.map((item) => (
                <VideoCard
                  key={item.id}
                  video={item}
                  href={`/kids/${child.id}/watch/${item.id}`}
                  watch={item.watch}
                />
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="section-title">
            <h2>내가 좋아하는 Channel</h2>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {catalog.channels.slice(0, 4).map((channel, index) => (
              <Link
                key={channel.id}
                href={`/kids/${child.id}/browse?channel=${channel.id}`}
                className={`btn ${index === 0 ? "soft" : ""}`}
              >
                {channel.name} 보기 ({channel.count}편)
              </Link>
            ))}
            <Link href={`/kids/${child.id}/browse`} className="btn">
              다른 Channel 찾기
            </Link>
            <Link href={`/kids/${child.id}/autoplay`} className="btn primary">
              ▶ 계속 틀어놓기
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
