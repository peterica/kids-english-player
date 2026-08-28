import Link from "next/link";
import { getLearningOverview, getRecentHistory } from "@/lib/learning";
import { PROGRESS_STATUS } from "@/lib/constants";
import {
  formatKoreanDate,
  formatKoreanDuration,
  formatTimeOfDay,
} from "@/lib/format";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusBadge } from "@/components/StatusBadge";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const overview = await getLearningOverview();
  const history = await getRecentHistory(8);

  return (
    <>
      <div className="topbar">
        <div>
          <h1>부모 대시보드</h1>
          <p>{formatKoreanDate(new Date())} · 학습 진행 상황</p>
        </div>
        <div className="pill">Parent Mode</div>
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
          <div className="label">오늘 학습 시간</div>
          <div className="metric">{formatKoreanDuration(overview.today.watchSeconds)}</div>
          <div className="hint">
            오늘 시청한 영상 {overview.today.watchedVideoCount}개 · 완료{" "}
            {overview.today.completedCount}개
          </div>
        </div>
        <div className="card">
          <div className="label">현재 학습 영상</div>
          <div className="metric" style={{ fontSize: 22, lineHeight: 1.3 }}>
            {overview.currentVideo ? overview.currentVideo.title : "모두 완료"}
          </div>
          {overview.currentVideo ? (
            <>
              <ProgressBar percent={overview.currentVideo.progressPercent} />
              <div className="hint">
                {overview.currentVideo.status === PROGRESS_STATUS.IN_PROGRESS
                  ? `${overview.currentVideo.progressPercent}% 시청 중`
                  : "아직 시작 전"}{" "}
                · <Link href={`/watch/${overview.currentVideo.id}`}>영상 열기</Link>
              </div>
            </>
          ) : (
            <div className="hint">등록된 활성 영상을 모두 완료했습니다.</div>
          )}
        </div>
      </div>

      <div className="grid two" style={{ marginTop: 20 }}>
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

        <div className="card">
          <div className="section-title">
            <h3>학습 설정</h3>
          </div>
          <SettingsForm completionThreshold={overview.completionThreshold} />
        </div>
      </div>
    </>
  );
}
