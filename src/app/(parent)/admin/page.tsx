import Link from "next/link";
import { requirePageSession } from "@/lib/guard";
import { getChildSummaries, avatarClass } from "@/lib/household";
import { getHouseholdSummary, getRecentWatchForHousehold } from "@/lib/stats";
import { getCompletionThreshold } from "@/lib/settings";
import { formatKoreanDuration, formatTimeOfDay } from "@/lib/format";
import { PROGRESS_STATUS } from "@/lib/constants";
import { ProgressBar } from "@/components/ProgressBar";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requirePageSession();
  const [summary, children, recent, completionThreshold] = await Promise.all([
    getHouseholdSummary(session.householdId),
    getChildSummaries(session.householdId),
    getRecentWatchForHousehold(session.householdId, 8),
    getCompletionThreshold(),
  ]);

  const activeChildren = children.filter((child) => child.enabled);

  return (
    <>
      <div className="topbar">
        <div>
          <h1>부모 Dashboard</h1>
          <p>아이별 학습 상태와 콘텐츠 선호를 한눈에 확인합니다.</p>
        </div>
        <div className="top-actions">
          <Link href="/admin/children" className="btn">
            아이 추가
          </Link>
          <Link href="/library" className="btn primary">
            콘텐츠 찾기
          </Link>
        </div>
      </div>

      <div className="grid four">
        <div className="stat">
          <span className="label">아이</span>
          <strong>{summary.childCount}명</strong>
        </div>
        <div className="stat">
          <span className="label">오늘 학습</span>
          <strong>{formatKoreanDuration(summary.todayWatchSeconds)}</strong>
        </div>
        <div className="stat">
          <span className="label">이번 주 완료</span>
          <strong>{summary.weeklyCompletedCount}편</strong>
        </div>
        <div className="stat">
          <span className="label">사용 Collection</span>
          <strong>{summary.collectionCount}개</strong>
        </div>
      </div>

      <div className="grid two" style={{ marginTop: 18 }}>
        <div className="card">
          <div className="section-title">
            <h2>아이별 진행</h2>
            <span className="muted small">허용 Level · 선호 Channel</span>
          </div>

          {activeChildren.length === 0 ? (
            <p className="muted small">
              아직 등록된 아이가 없습니다. <Link href="/admin/children">아이를 등록</Link>해 주세요.
            </p>
          ) : (
            activeChildren.map((child, index) => (
              <div className="profile-row" key={child.id}>
                <div className={`avatar ${avatarClass(index)}`}>{child.name.slice(0, 2)}</div>
                <div style={{ minWidth: 0 }}>
                  <strong>{child.name}</strong>
                  <div className="muted small" style={{ margin: "5px 0 9px" }}>
                    Level {child.minLevel}–{child.maxLevel}
                    {child.preferredChannels.length > 0
                      ? ` · ${child.preferredChannels.map((c) => c.name).join(", ")} 선호`
                      : " · 모든 Channel"}
                    {" · "}
                    {child.completedCount} / {child.catalogSize} 완료 · 오늘{" "}
                    {formatKoreanDuration(child.today.watchSeconds)}
                  </div>
                  <ProgressBar percent={child.percent} />
                </div>
                <div className="row-actions">
                  <Link href={`/admin/children/${child.id}`} className="btn soft small">
                    상세
                  </Link>
                  <Link href={`/kids/${child.id}`} className="btn small">
                    아이 화면
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <div className="section-title">
            <h2>최근 시청</h2>
            <span className="muted small">Household</span>
          </div>
          {recent.length === 0 ? (
            <p className="muted small">아직 시청 기록이 없습니다.</p>
          ) : (
            recent.map((row) => (
              <div className="collection-row" key={`${row.childId}-${row.videoId}`}>
                <div className="order">{formatTimeOfDay(row.at)}</div>
                <div style={{ minWidth: 0 }}>
                  <strong>{row.title}</strong>
                  <div className="muted small">
                    {row.childName} · {row.progressPercent}%
                  </div>
                </div>
                {row.status === PROGRESS_STATUS.COMPLETED ? (
                  <span className="status done">완료</span>
                ) : (
                  <span className="status doing">진행 중</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="section-title">
          <h2>아이별 콘텐츠 설정</h2>
          <Link href="/collections" className="btn">
            Collection 관리
          </Link>
        </div>
        <div className="grid equal2">
          {activeChildren.map((child) => (
            <div className="stat" key={child.id}>
              <span className="label">{child.name}</span>
              <strong style={{ fontSize: 23 }}>
                Level {child.minLevel}–{child.maxLevel}
              </strong>
              <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {child.preferredChannels.length === 0 ? (
                  <span className="tag">모든 Channel 허용</span>
                ) : (
                  child.preferredChannels.map((channel) => (
                    <span className="tag blue" key={channel.id}>
                      {channel.name}
                    </span>
                  ))
                )}
              </div>
              <div className="muted small" style={{ marginTop: 10 }}>
                볼 수 있는 영상 {child.catalogSize}편 · Collection {child.collectionCount}편
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="section-title">
          <h2>재생 설정</h2>
        </div>
        <SettingsForm completionThreshold={completionThreshold} />
      </div>
    </>
  );
}
