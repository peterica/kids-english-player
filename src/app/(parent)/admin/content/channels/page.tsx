import { requirePageAdmin } from "@/lib/guard";
import { listChannelsForAdmin } from "@/lib/admin/channels";
import { ChannelAdmin } from "./ChannelAdmin";

export const dynamic = "force-dynamic";

export default async function AdminChannelsPage() {
  await requirePageAdmin();
  const channels = await listChannelsForAdmin();

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Channel 관리</h1>
          <p>이름과 사용 여부만 관리합니다. slug 는 이름에서 자동으로 만들어집니다.</p>
        </div>
        <div className="tag blue">{channels.length}개</div>
      </div>
      <ChannelAdmin channels={channels} />
    </>
  );
}
