import Link from "next/link";
import { requirePageSession } from "@/lib/guard";
import { listChannels, listVideos } from "@/lib/library";
import { listChildren } from "@/lib/children";
import { CATEGORIES, LEVELS } from "@/lib/constants";
import { formatCategory } from "@/lib/format";
import { AddToCollection } from "./AddToCollection";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  level?: string;
  channel?: string;
  category?: string;
  q?: string;
}>;

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requirePageSession();
  const params = await searchParams;

  const level = Number(params.level) || null;
  const channelId = Number(params.channel) || null;
  const category = params.category || null;
  const query = params.q || null;

  const [channels, videos, children] = await Promise.all([
    listChannels(),
    listVideos({
      householdId: session.householdId,
      filter: { level, channelId, category, query },
    }),
    listChildren(session.householdId),
  ]);

  const activeChildren = children.filter((child) => child.enabled);

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Content Library</h1>
          <p>
            서비스가 기본 제공하는 Channel과 영상을 Level·Category 기준으로 탐색합니다.
            원본은 그대로 두고, 필요한 영상만 아이 Collection으로 가져옵니다.
          </p>
        </div>
        <Link href="/collections" className="btn primary">
          내 Collection 보기
        </Link>
      </div>

      <div className="channel-grid">
        {channels.map((channel) => (
          <Link
            className="channel"
            key={channel.id}
            href={`/library?channel=${channel.id}`}
          >
            <div className={`channel-cover ${channel.colorKey}`}>{channel.name}</div>
            <div className="channel-body">
              <strong>{channel.name}</strong>
              <p>{channel.description}</p>
              <span className="tag blue">
                {channel.minLevel && channel.maxLevel
                  ? `Level ${channel.minLevel}–${channel.maxLevel}`
                  : "준비 중"}
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <form className="filterbar" method="get">
          <select name="level" defaultValue={params.level ?? ""} aria-label="Level">
            <option value="">Level 전체</option>
            {LEVELS.map((value) => (
              <option key={value} value={value}>
                Level {value}
              </option>
            ))}
          </select>
          <select name="channel" defaultValue={params.channel ?? ""} aria-label="Channel">
            <option value="">Channel 전체</option>
            {channels.map((channel) => (
              <option key={channel.id} value={channel.id}>
                {channel.name}
              </option>
            ))}
          </select>
          <select name="category" defaultValue={params.category ?? ""} aria-label="Category">
            <option value="">Category 전체</option>
            {CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {formatCategory(value)}
              </option>
            ))}
          </select>
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="영상 제목 검색"
            aria-label="검색"
          />
          <button type="submit" className="btn primary">
            검색
          </button>
          <Link href="/library" className="btn">
            초기화
          </Link>
        </form>

        <div className="muted small" style={{ marginBottom: 14 }}>
          {videos.length}편
        </div>

        {videos.length === 0 ? (
          <p className="muted small">조건에 맞는 영상이 없습니다.</p>
        ) : (
          <div className="video-grid">
            {videos.map((video) => (
              <div className="video-card" key={video.id}>
                {video.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="thumb-img" src={video.thumbnailUrl} alt="" loading="lazy" />
                ) : (
                  <div className={`thumb ${video.channelColor}`}>{video.channelName}</div>
                )}
                <div className="video-body">
                  <h4>{video.title}</h4>
                  <div className="video-meta">
                    <span className="tag blue">Level {video.level}</span>
                    <span className="tag">{formatCategory(video.category)}</span>
                    {video.householdId ? <span className="tag orange">직접 등록</span> : null}
                  </div>
                  <div className="muted small">{video.channelName}</div>
                  <AddToCollection
                    videoId={video.id}
                    kids={activeChildren.map((child) => ({
                      id: child.id,
                      name: child.name,
                    }))}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
