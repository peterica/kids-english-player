import Link from "next/link";
import { requirePageSession } from "@/lib/guard";
import { getHouseholdOverview } from "@/lib/learning";
import { getCompletionThreshold } from "@/lib/settings";
import { formatKoreanDate, formatKoreanDuration } from "@/lib/format";
import { ProgressBar } from "@/components/ProgressBar";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await requirePageSession();
  const [children, completionThreshold] = await Promise.all([
    getHouseholdOverview(session.householdId),
    getCompletionThreshold(),
  ]);

  const activeChildren = children.filter((row) => row.child.enabled);
  const todaySeconds = activeChildren.reduce(
    (sum, row) => sum + row.today.watchSeconds,
    0,
  );

  return (
    <>
      <div className="topbar">
        <div>
          <h1>{session.householdName}</h1>
          <p>{formatKoreanDate(new Date())} · 우리 가족 학습 현황</p>
        </div>
        <div className="pill">아이 {activeChildren.length}명</div>
      </div>

      <div className="grid three">
        <div className="card">
          <div className="label">오늘 가족 전체 학습 시간</div>
          <div className="metric">{formatKoreanDuration(todaySeconds)}</div>
          <div className="hint">
            오늘 시청한 영상{" "}
            {activeChildren.reduce((sum, row) => sum + row.today.watchedVideoCount, 0)}개
          </div>
        </div>
        <div className="card">
          <div className="label">등록된 아이</div>
          <div className="metric">{activeChildren.length}명</div>
          <div className="hint">
            <Link href="/admin/children">아이 추가 / 학습 과정 변경</Link>
          </div>
        </div>
        <div className="card">
          <div className="label">완료 기준</div>
          <SettingsForm completionThreshold={completionThreshold} />
        </div>
      </div>

      <section className="card" style={{ marginTop: 20 }}>
        <div className="section-title">
          <h3>아이별 진행 상황</h3>
          <Link href="/admin/children" className="label">
            아이 관리
          </Link>
        </div>

        {activeChildren.length === 0 ? (
          <p className="hint">
            아직 등록된 아이가 없습니다. <Link href="/admin/children">아이를 등록</Link>해 주세요.
          </p>
        ) : (
          <div className="list">
            {activeChildren.map((row) => (
              <div className="list-row" key={row.child.id}>
                <div className="num">{row.child.name.slice(0, 1)}</div>
                <div style={{ minWidth: 0 }}>
                  <strong>{row.child.name}</strong>
                  <div className="hint">
                    {row.playlist ? row.playlist.title : "학습 과정 미지정"} ·{" "}
                    {row.completedCount} / {row.activeCount} 완료 · 오늘{" "}
                    {formatKoreanDuration(row.today.watchSeconds)}
                  </div>
                  <div style={{ marginTop: 8, maxWidth: 320 }}>
                    <ProgressBar percent={row.overallPercent} />
                  </div>
                  <div className="hint">
                    현재 영상: {row.currentVideoTitle ?? "없음 (모두 완료)"}
                  </div>
                </div>
                <span className="status doing">{row.overallPercent}%</span>
                <div className="row-actions">
                  <Link href={`/admin/children/${row.child.id}`} className="btn ghost small">
                    상세
                  </Link>
                  <Link href={`/kids/${row.child.id}`} className="btn ghost small">
                    아이 화면
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
