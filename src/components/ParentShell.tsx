import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";

/** 부모 화면 공통 셸. Mockup 의 좌측 사이드바 구조를 따른다. */
export function ParentShell({
  username,
  householdName,
  isAdmin = false,
  children,
}: {
  username: string;
  householdName: string;
  isAdmin?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          Kids English V2
          <small>{householdName}</small>
        </div>

        <div className="nav-group-title">Parent</div>
        <nav className="nav">
          <Link href="/admin">Dashboard</Link>
          <Link href="/admin/children">아이 관리</Link>
          <Link href="/library">Content Library</Link>
          <Link href="/collections">My Collection</Link>
          <Link href="/requests">내 수정 요청</Link>
        </nav>

        {isAdmin ? (
          <>
            <div className="nav-group-title">Admin</div>
            <nav className="nav">
              <Link href="/admin/content">Content Library</Link>
              <Link href="/admin/content/channels">Channels</Link>
              <Link href="/admin/content/import">Markdown Import</Link>
              <Link href="/admin/content/requests">수정 요청</Link>
            </nav>
          </>
        ) : null}

        <div className="nav-group-title">Child</div>
        <nav className="nav">
          <Link href="/kids">아이 화면</Link>
        </nav>

        <div className="nav-group-title">Account</div>
        <nav className="nav">
          <Link href="/intro">서비스 소개</Link>
          <form action={logoutAction}>
            <button type="submit">로그아웃</button>
          </form>
        </nav>

        <div className="sidebar-footer">
          {username}
          <br />
          Library → Channel → Level → Collection → Child
        </div>
      </aside>

      <main className="content">{children}</main>
    </div>
  );
}
