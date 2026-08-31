import { requirePageAdmin } from "@/lib/guard";
import { listChannelsForAdmin } from "@/lib/admin/channels";
import { listVideosForAdmin } from "@/lib/admin/videos";
import { CATEGORIES, LEVELS } from "@/lib/constants";
import { VideoAdmin } from "./VideoAdmin";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  channel?: string;
  level?: string;
  category?: string;
  enabled?: string;
  q?: string;
}>;

export default async function AdminVideosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requirePageAdmin();
  const params = await searchParams;

  const filter = {
    channel: params.channel || null,
    level: params.level ? Number(params.level) : null,
    category: params.category || null,
    enabled:
      params.enabled === "true" ? true : params.enabled === "false" ? false : null,
    q: params.q || null,
  };

  const [videos, channels] = await Promise.all([
    listVideosForAdmin(filter),
    listChannelsForAdmin(),
  ]);

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Content Library 관리</h1>
          <p>공용 Content Library 원본을 등록·수정·삭제합니다.</p>
        </div>
        <div className="tag blue">{videos.length}편</div>
      </div>

      <VideoAdmin
        videos={videos}
        channels={channels.map((channel) => ({
          id: channel.id,
          name: channel.name,
          slug: channel.slug,
          enabled: channel.enabled,
        }))}
        categories={[...CATEGORIES]}
        levels={[...LEVELS]}
        filter={{
          channel: params.channel ?? "",
          level: params.level ?? "",
          category: params.category ?? "",
          enabled: params.enabled ?? "",
          q: params.q ?? "",
        }}
      />
    </>
  );
}
