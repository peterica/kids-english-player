import Link from "next/link";
import { requirePageChild } from "@/lib/guard";
import { getChildOverview, getRecentHistoryForChild } from "@/lib/learning";
import { listChildPlaylistStates } from "@/lib/playlists";
import { PROGRESS_STATUS } from "@/lib/constants";
import { formatKoreanDuration, formatTimeOfDay } from "@/lib/format";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusBadge } from "@/components/StatusBadge";
import { ChildPlaylistControls } from "./ChildPlaylistControls";

export const dynamic = "force-dynamic";

export default async function ChildDetailPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = await params;
  const { child } = await requirePageChild(Number(childId));

  const [overview, history, playlistStates] = await Promise.all([
    getChildOverview(child.id),
    getRecentHistoryForChild(child.id, 10),
    listChildPlaylistStates(child.id),
  ]);

  return (
    <>
      <div className="topbar">
        <div>
          <h1>{child.name}</h1>
          <p>
            {overview.playlist ? overview.playlist.title : "학습 과정 미지정"} ·{" "}
            {child.enabled ? "활성" : "비활성"}
          </p>
        </div>
        <Link href={`/kids/${child.id}`} className="pill">
          아이 화면 열기
        </Link>
      </div>

      <div className="grid three">
        <div className="card">
          <div className="label">전체 진행률</div>
          <div className="metric">{overview.overallPercent}%</div>
          <ProgressBar percent={overview.overallPercent} />
          <div className="hint">
            {overview.completedCount} / {overview.activeCount} 영상 완료
          </div>
        </div>
        <div className="card">
          <div className="label">오늘 학습</div>
          <div className="metric">{formatKoreanDuration(overview.today.watchSeconds)}</div>
          <div className="hint">
            영상 {overview.today.watchedVideoCount}개 · 완료 {overview.today.completedCount}개
          </div>
        </div>
        <div className="card">
          <div className="label">현재 학습 영상</div>
          <div className="metric" style={{ fontSize: 20, lineHeight: 1.35 }}>
            {overview.currentVideo ? overview.currentVideo.title : "모두 완료"}
          </div>
          {overview.currentVideo ? (
            <div className="hint">
              {overview.currentVideo.status === PROGRESS_STATUS.IN_PROGRESS
                ? `${overview.currentVideo.progressPercent}% 시청 중`
                : "아직 시작 전"}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid two" style={{ marginTop: 20 }}>
        <div className="card">
          <div className="section-title">
            <h3>학습 과정</h3>
          </div>
          <ChildPlaylistControls
            childId={child.id}
            activePlaylistId={overview.playlist?.id ?? null}
            playlists={playlistStates.map((state) => ({
              id: state.playlist.id,
              title: state.playlist.title,
              description: state.playlist.description,
              videoCount: state.videoCount,
              status: state.status,
            }))}
          />
        </div>

        <div className="card">
          <div className="section-title">
            <h3>최근 학습 기록</h3>
            <span className="label">최근 {history.length}건</span>
          </div>
          {history.length === 0 ? (
            <p className="hint">아직 학습 기록이 없습니다.</p>
          ) : (
            <div className="history">
              {history.map((entry) => (
                <div className="history-row" key={`${entry.videoId}-${entry.at.getTime()}`}>
                  <strong>{formatTimeOfDay(entry.at)}</strong>
                  <div>{entry.title}</div>
                  {entry.status === PROGRESS_STATUS.COMPLETED ? (
                    <StatusBadge status={entry.status} />
                  ) : (
                    <span className="status doing">{entry.progressPercent}%</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <section className="card" style={{ marginTop: 20 }}>
        <div className="section-title">
          <h3>{overview.playlist?.title ?? "학습 과정"} 영상별 진행</h3>
        </div>
        {overview.videos.length === 0 ? (
          <p className="hint">학습 과정을 먼저 선택해 주세요.</p>
        ) : (
          <div className="list">
            {overview.videos.map((video, index) => (
              <div className="list-row" key={video.id}>
                <div className="num">{index + 1}</div>
                <div style={{ minWidth: 0 }}>
                  <strong>{video.title}</strong>
                  <div className="hint">
                    {video.progressPercent}% · 시청 {formatKoreanDuration(video.watchSeconds)}
                  </div>
                </div>
                <StatusBadge status={video.status} enabled={video.enabled} />
                <div className="row-actions">
                  <Link
                    href={`/kids/${child.id}/watch/${video.id}`}
                    className="btn ghost small"
                  >
                    열기
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
