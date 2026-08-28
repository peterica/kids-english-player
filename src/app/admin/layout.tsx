import Link from "next/link";
import { requirePageSession } from "@/lib/guard";
import { logoutAction } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requirePageSession();

  return (
    <div className="page">
      <nav className="admin-nav">
        <Link href="/admin">대시보드</Link>
        <Link href="/admin/children">아이 관리</Link>
        <Link href="/admin/playlists">학습 과정</Link>
        <Link href="/admin/videos">영상 관리</Link>
        <Link href="/kids">아이 화면</Link>
        <form action={logoutAction} style={{ marginLeft: "auto" }}>
          <button type="submit" className="btn ghost small">
            {session.displayName} 로그아웃
          </button>
        </form>
      </nav>
      {children}
    </div>
  );
}
