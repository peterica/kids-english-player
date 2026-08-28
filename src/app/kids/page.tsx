import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePageSession } from "@/lib/guard";
import { getChildSummaries, avatarClass } from "@/lib/household";

export const dynamic = "force-dynamic";

export default async function ChildSelectPage() {
  const session = await requirePageSession();
  const children = (await getChildSummaries(session.householdId)).filter(
    (child) => child.enabled,
  );

  if (children.length === 0) redirect("/admin/children");

  return (
    <main className="page">
      <div className="child-select">
        <div className="child-select-box">
          <span className="tag blue">CHILD MODE</span>
          <h1>누가 영어를 볼까요?</h1>
          <p className="muted">아이를 선택하면 자기 Level과 좋아하는 Channel로 이동해요.</p>

          <div className="child-cards">
            {children.map((child, index) => (
              <Link className="child-card" key={child.id} href={`/kids/${child.id}`}>
                <div className={`avatar ${avatarClass(index)}`}>{child.name.slice(0, 2)}</div>
                <strong>{child.name}</strong>
                <div className="muted small" style={{ marginTop: 5 }}>
                  Level {child.minLevel}–{child.maxLevel}
                  {child.preferredChannels.length > 0
                    ? ` · ${child.preferredChannels[0].name}`
                    : ""}
                </div>
              </Link>
            ))}

            <Link className="child-card" href="/admin/children">
              <div className="avatar orange">+</div>
              <strong>아이 추가</strong>
              <div className="muted small" style={{ marginTop: 5 }}>
                부모 화면에서 등록
              </div>
            </Link>
          </div>

          <div style={{ marginTop: 24 }}>
            <Link href="/admin" className="btn">
              부모 화면으로
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
