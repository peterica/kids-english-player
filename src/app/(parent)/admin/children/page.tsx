import { requirePageSession } from "@/lib/guard";
import { getChildSummaries } from "@/lib/household";
import { listChannels } from "@/lib/library";
import { ChildManager } from "./ChildManager";

export const dynamic = "force-dynamic";

export default async function ChildrenPage() {
  const session = await requirePageSession();
  const [children, channels] = await Promise.all([
    getChildSummaries(session.householdId),
    listChannels(),
  ]);

  return (
    <>
      <div className="topbar">
        <div>
          <h1>아이 관리</h1>
          <p>아이를 등록하고 허용 Level 범위와 선호 Channel을 정합니다.</p>
        </div>
        <div className="tag blue">{children.length}명</div>
      </div>

      <ChildManager
        kids={children}
        channels={channels.map((channel) => ({
          id: channel.id,
          name: channel.name,
          colorKey: channel.colorKey,
        }))}
      />
    </>
  );
}
