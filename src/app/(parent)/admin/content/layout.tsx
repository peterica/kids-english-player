import Link from "next/link";
import { requirePageAdmin } from "@/lib/guard";

export const dynamic = "force-dynamic";

/** 운영자 전용 영역. 서버에서 ADMIN 여부를 확인하고 아니면 Parent Dashboard 로 보낸다. */
export default async function AdminContentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageAdmin();

  return (
    <>
      <div className="browse-tabs" style={{ marginBottom: 20 }}>
        <Link href="/admin/content">영상</Link>
        <Link href="/admin/content/channels">Channel</Link>
        <Link href="/admin/content/import">Markdown Import</Link>
        <Link href="/admin/content/requests">수정 요청</Link>
      </div>
      {children}
    </>
  );
}
