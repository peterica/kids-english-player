import Link from "next/link";
import { requirePageChild } from "@/lib/guard";
import { getChildOverview, getRecentHistoryForChild } from "@/lib/learning";
import { PROGRESS_STATUS } from "@/lib/constants";
import {
  formatClock,
  formatKoreanDate,
  formatKoreanDuration,
  formatTimeOfDay,
} from "@/lib/format";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function ChildHomePage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = await params;
  const { child } = await requirePageChild(Number(childId));

  const overview = await getChildOverview(child.id);
  const history = await getRecentHistoryForChild(child.id, 5);
  const current = overview.currentVideo;

  return (
    <main className="page child">
      <div className="topbar">
        <div>
          <h1>{child.name}의 오늘 영어</h1>
          <p>
            {formatKoreanDate(new Date())}
            {overview.playlist ? ` · ${overview.playlist.title}` : ""}
          </p>
        </div>
        <Link href="/kids" className="pill">
          다른 아이
        </Link>
      </div>

      <div className="grid two">
        <section className="card hero">
          <span className="eyebrow">
            {current
              ? current.status === PROGRESS_STATUS.IN_PROGRESS
                ? "이어서 보기"
                : "다음 영상"
              : "완료"}
          </span>
          {current ? (
            <>
              <h2>{current.title}</h2>
              <p>
                {current.status === PROGRESS_STATUS.IN_PROGRESS
                  ? `지난번 ${formatClock(current.lastPositionSeconds)}까지 봤어요.`
                  : "새 영상을 시작해 볼까요?"}
              </p>
              <Link href={`/kids/${child.id}/watch/${current.id}`} className="btn big">
                ▶ {current.status === PROGRESS_STATUS.IN_PROGRESS ? "이어서 보기" : "시작하기"}
              </Link>
            </>
          ) : (
            <>
              <h2>오늘 볼 영상을 모두 마쳤어요! 🎉</h2>
              <p>
                {overview.activeCount === 0
                  ? "아직 학습 과정이 정해지지 않았어요. 부모님께 알려주세요."
                  : "새 학습 과정이 열리면 여기에 나타나요."}
              </p>
            </>
          )}

          <div className="stats">
            <div className="stat">
              <span className="label">오늘 본 영상</span>
              <strong>{overview.today.watchedVideoCount}개</strong>
            </div>
            <div className="stat">
              <span className="label">오늘 학습 시간</span>
              <strong>{formatKoreanDuration(overview.today.watchSeconds)}</strong>
            </div>
            <div className="stat">
              <span className="label">전체 완료</span>
              <strong>
                {overview.completedCount} / {overview.activeCount}
              </strong>
            </div>
          </div>
        </section>

        <section className="card">
          {current ? (
            <>
              {current.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="thumb" src={current.thumbnailUrl} alt="" />
              ) : (
                <div className="thumb" />
              )}
              <div style={{ marginTop: 18 }}>
                <div className="section-title">
                  <h3>{current.title}</h3>
                  <StatusBadge status={current.status} />
                </div>
                <ProgressBar percent={current.progressPercent} />
                <div className="hint">
                  {current.progressPercent}% 시청 · {overview.completionThreshold}% 이상 보면 완료돼요.
                </div>
              </div>
            </>
          ) : (
            <>
              <span className="eyebrow">전체 진행률</span>
              <div className="metric">{overview.overallPercent}%</div>
              <ProgressBar percent={overview.overallPercent} />
              <div className="hint">
                {overview.completedCount} / {overview.activeCount} 영상 완료
              </div>
            </>
          )}
        </section>
      </div>

      <section className="card" style={{ marginTop: 20 }}>
        <div className="section-title">
          <h3>최근 학습</h3>
          <span className="label">최근 {history.length}건</span>
        </div>
        {history.length === 0 ? (
          <p className="hint">아직 학습 기록이 없어요.</p>
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
      </section>
    </main>
  );
}
