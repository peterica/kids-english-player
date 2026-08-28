import Link from "next/link";
import { requirePageChild } from "@/lib/guard";
import { filterCatalog, getChildCatalog } from "@/lib/child-content";
import { VideoCard } from "@/components/VideoCard";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ level?: string; channel?: string }>;

export default async function BrowsePage({
  params,
  searchParams,
}: {
  params: Promise<{ childId: string }>;
  searchParams: SearchParams;
}) {
  const { childId } = await params;
  const query = await searchParams;
  const { session, child } = await requirePageChild(Number(childId));

  const catalog = await getChildCatalog(session.householdId, child.id);

  // 아이가 실제로 볼 수 있는 Level 만 탭으로 보여준다.
  const availableLevels = [...new Set(catalog.items.map((item) => item.level))].sort(
    (a, b) => a - b,
  );
  const level = Number(query.level) || null;
  const channelId = Number(query.channel) || null;
  const items = filterCatalog(catalog, { level, channelId });

  const base = `/kids/${child.id}/browse`;
  const withParams = (next: { level?: number | null; channel?: number | null }) => {
    const search = new URLSearchParams();
    const nextLevel = next.level === undefined ? level : next.level;
    const nextChannel = next.channel === undefined ? channelId : next.channel;
    if (nextLevel) search.set("level", String(nextLevel));
    if (nextChannel) search.set("channel", String(nextChannel));
    const qs = search.toString();
    return qs ? `${base}?${qs}` : base;
  };

  return (
    <main className="page">
      <div className="topbar">
        <div>
          <h1>원하는 영상 고르기</h1>
          <p>Level과 Channel을 직접 선택해서 보고 싶은 영상을 찾아요.</p>
        </div>
        <div className="top-actions">
          <Link href={`/kids/${child.id}`} className="btn">
            아이 Home
          </Link>
          <Link href={`/kids/${child.id}/autoplay`} className="btn primary">
            ▶ 계속 틀어놓기
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="section-title">
          <h2>Level 선택</h2>
          <span className="muted small">
            {child.name} 허용 범위: Level {catalog.scope.minLevel}–{catalog.scope.maxLevel}
          </span>
        </div>
        <div className="browse-tabs">
          <Link href={withParams({ level: null })} className={level ? "" : "active"}>
            전체
          </Link>
          {availableLevels.map((value) => (
            <Link
              key={value}
              href={withParams({ level: value })}
              className={level === value ? "active" : ""}
            >
              Level {value}
            </Link>
          ))}
        </div>

        <div className="section-title" style={{ marginTop: 24 }}>
          <h2>Channel 선택</h2>
        </div>
        <div className="browse-tabs">
          <Link href={withParams({ channel: null })} className={channelId ? "" : "active"}>
            전체
          </Link>
          {catalog.channels.map((channel) => (
            <Link
              key={channel.id}
              href={withParams({ channel: channel.id })}
              className={channelId === channel.id ? "active" : ""}
            >
              {channel.name}
            </Link>
          ))}
        </div>

        <div className="muted small" style={{ marginBottom: 12 }}>
          {items.length}편
        </div>

        {items.length === 0 ? (
          <p className="muted small">
            이 조건에 맞는 영상이 없어요. 다른 Level이나 Channel을 눌러 보세요.
          </p>
        ) : (
          <div className="video-grid">
            {items.map((item) => (
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
    </main>
  );
}
