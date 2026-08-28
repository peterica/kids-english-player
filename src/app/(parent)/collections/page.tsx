import Link from "next/link";
import { requirePageSession } from "@/lib/guard";
import { listCollections, getOrCreateChildCollection } from "@/lib/collections";
import { listChildren } from "@/lib/children";
import { listChannels } from "@/lib/library";
import { CollectionManager } from "./CollectionManager";

export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const session = await requirePageSession();

  // 아이마다 Collection 이 하나씩 있도록 보장한다.
  const children = (await listChildren(session.householdId)).filter((c) => c.enabled);
  for (const child of children) {
    await getOrCreateChildCollection(session.householdId, child.id);
  }

  const [collections, channels] = await Promise.all([
    listCollections(session.householdId),
    listChannels(),
  ]);

  return (
    <>
      <div className="topbar">
        <div>
          <h1>My Collection</h1>
          <p>
            기본 Library에서 가져온 콘텐츠를 우리 가족에 맞게 수정합니다. 원본 Library는
            바뀌지 않습니다.
          </p>
        </div>
        <Link href="/library" className="btn primary">
          Library에서 추가
        </Link>
      </div>

      {collections.length === 0 ? (
        <div className="card">
          <p className="muted small">
            아이를 먼저 등록하면 아이별 Collection이 만들어집니다.{" "}
            <Link href="/admin/children">아이 관리</Link>
          </p>
        </div>
      ) : (
        <CollectionManager
          collections={collections.map((collection) => ({
            id: collection.id,
            title: collection.title,
            childId: collection.childId,
            childName: collection.child?.name ?? "가족 공용",
            videos: collection.videos.map((row) => ({
              videoId: row.videoId,
              title: row.video.title,
              channelName: row.video.channel.name,
              level: row.video.level,
              category: row.video.category,
              enabled: row.enabled,
              isCustom: row.video.householdId !== null,
            })),
          }))}
          channels={channels.map((channel) => ({ id: channel.id, name: channel.name }))}
        />
      )}
    </>
  );
}
