import Link from "next/link";
import { formatCategory } from "@/lib/format";
import { WatchStatus } from "./WatchStatus";
import type { ProgressStatus } from "@/lib/constants";

export type VideoCardData = {
  id: number;
  title: string;
  thumbnailUrl: string | null;
  channelName: string;
  channelColor: string;
  level: number;
  category: string;
};

export function VideoCard({
  video,
  href,
  watch,
  action,
}: {
  video: VideoCardData;
  href?: string;
  watch?: { status: ProgressStatus; progressPercent: number };
  action?: React.ReactNode;
}) {
  const body = (
    <>
      {video.thumbnailUrl ? (
        // 외부 썸네일은 최적화 없이 사용한다.
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
          {watch ? (
            <WatchStatus status={watch.status} percent={watch.progressPercent} />
          ) : null}
        </div>
        <div className="muted small">{video.channelName}</div>
        {action}
      </div>
    </>
  );

  if (href) {
    return (
      <Link className="video-card" href={href}>
        {body}
      </Link>
    );
  }
  return <div className="video-card">{body}</div>;
}
