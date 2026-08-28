import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePageSession } from "@/lib/guard";
import { listChildren } from "@/lib/children";

export const dynamic = "force-dynamic";

export default async function ChildSelectPage() {
  const session = await requirePageSession();
  const children = (await listChildren(session.householdId)).filter((c) => c.enabled);

  if (children.length === 0) redirect("/admin/children");
  if (children.length === 1) redirect(`/kids/${children[0].id}`);

  return (
    <main className="page child">
      <div className="topbar">
        <div>
          <h1>누가 영어를 볼까요?</h1>
          <p>{session.householdName}</p>
        </div>
        <Link href="/admin" className="pill">
          부모 화면
        </Link>
      </div>

      <div className="grid three">
        {children.map((child) => (
          <Link key={child.id} href={`/kids/${child.id}`} className="card hero" style={{ textAlign: "center" }}>
            <div className="metric" style={{ fontSize: 32 }}>
              {child.name}
            </div>
            <span className="btn big" style={{ marginTop: 8 }}>
              ▶ 시작하기
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
