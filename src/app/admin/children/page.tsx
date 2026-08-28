import { requirePageSession } from "@/lib/guard";
import { listChildren } from "@/lib/children";
import { listPlaylists } from "@/lib/playlists";
import { getHouseholdOverview } from "@/lib/learning";
import { ChildManager } from "./ChildManager";

export const dynamic = "force-dynamic";

export default async function ChildrenAdminPage() {
  const session = await requirePageSession();
  const [children, playlists, overview] = await Promise.all([
    listChildren(session.householdId),
    listPlaylists(),
    getHouseholdOverview(session.householdId),
  ]);

  const summaryByChildId = new Map(overview.map((row) => [row.child.id, row]));

  return (
    <>
      <div className="topbar">
        <div>
          <h1>아이 관리</h1>
          <p>아이를 등록하고 학습 과정(Level)을 지정합니다.</p>
        </div>
        <div className="pill">{children.length}명</div>
      </div>

      <ChildManager
        kids={children.map((child) => ({
          id: child.id,
          name: child.name,
          enabled: child.enabled,
          playlistTitle: summaryByChildId.get(child.id)?.playlist?.title ?? null,
          completedCount: summaryByChildId.get(child.id)?.completedCount ?? 0,
          activeCount: summaryByChildId.get(child.id)?.activeCount ?? 0,
        }))}
        playlists={playlists.map((playlist) => ({
          id: playlist.id,
          title: playlist.title,
          videoCount: playlist._count.videos,
        }))}
      />
    </>
  );
}
