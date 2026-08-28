import Link from "next/link";
import { redirect } from "next/navigation";
import { hasParentSession } from "@/lib/session";
import { logout } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await hasParentSession())) redirect("/parent");

  return (
    <div className="page">
      <nav className="admin-nav">
        <Link href="/admin">대시보드</Link>
        <Link href="/admin/videos">영상 관리</Link>
        <Link href="/">아이 홈</Link>
        <form action={logout} style={{ marginLeft: "auto" }}>
          <button type="submit" className="btn ghost small">
            부모 모드 종료
          </button>
        </form>
      </nav>
      {children}
    </div>
  );
}
