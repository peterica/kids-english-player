import Link from "next/link";
import { requirePageAdmin } from "@/lib/guard";
import { getVideoForAdmin } from "@/lib/admin/videos";
import { listChannelsForAdmin } from "@/lib/admin/channels";
import { CATEGORIES, LEVELS } from "@/lib/constants";
import { VideoEditForm } from "./VideoEditForm";

export const dynamic = "force-dynamic";

export default async function AdminVideoEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePageAdmin();
  const { id } = await params;

  let video;
  try {
    video = await getVideoForAdmin(Number(id));
  } catch {
    return (
      <div className="card">
        <h1>영상을 찾을 수 없습니다</h1>
        <Link href="/admin/content" className="btn primary" style={{ marginTop: 16 }}>
          목록으로
        </Link>
      </div>
    );
  }

  const channels = await listChannelsForAdmin();

  return (
    <>
      <div className="topbar">
        <div>
          <h1>영상 수정</h1>
          <p>{video.youtubeUrl}</p>
        </div>
        <Link href="/admin/content" className="btn">
          목록으로
        </Link>
      </div>

      <VideoEditForm
        video={video}
        channels={channels.map((channel) => ({ id: channel.id, name: channel.name }))}
        categories={[...CATEGORIES]}
        levels={[...LEVELS]}
      />
    </>
  );
}
