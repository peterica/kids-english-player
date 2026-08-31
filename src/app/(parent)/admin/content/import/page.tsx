import { requirePageAdmin } from "@/lib/guard";
import { listChannelsForAdmin } from "@/lib/admin/channels";
import { ImportWorkbench } from "./ImportWorkbench";

export const dynamic = "force-dynamic";

export default async function AdminImportPage() {
  await requirePageAdmin();
  const channels = await listChannelsForAdmin();

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Markdown 일괄등록</h1>
          <p>
            Channel 을 고르고 .md 파일을 올리거나 Markdown 을 붙여 넣습니다. 두 방식 모두 같은
            검증을 거칩니다.
          </p>
        </div>
      </div>
      <ImportWorkbench
        channels={channels
          .filter((channel) => channel.enabled)
          .map((channel) => ({ id: channel.id, name: channel.name }))}
      />
    </>
  );
}
