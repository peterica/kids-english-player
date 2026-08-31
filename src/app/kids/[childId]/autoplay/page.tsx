import { requirePageChild } from "@/lib/guard";
import { getChildCatalog } from "@/lib/child-content";
import {
  getActiveAutoPlaySession,
  previewAutoPlayQueue,
} from "@/lib/autoplay-service";
import { remainingSeconds } from "@/lib/autoplay-rules";
import { type PlayMode } from "@/lib/constants";
import { AutoPlayShell, type StartedAutoPlay } from "./AutoPlayShell";

export const dynamic = "force-dynamic";

export default async function AutoPlayPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = await params;
  const { session, child } = await requirePageChild(Number(childId));

  const catalog = await getChildCatalog(session.householdId, child.id);
  const active = await getActiveAutoPlaySession(session.householdId, child.id);

  // 새로고침으로 들어온 경우에만 진행 중 세션을 넘긴다.
  let activeSession: StartedAutoPlay | null = null;
  if (active?.currentVideoId) {
    const current = catalog.items.find((item) => item.id === active.currentVideoId);
    if (current) {
      const queue = await previewAutoPlayQueue(
        session.householdId,
        child.id,
        {
          channelId: active.channelId,
          minLevel: active.minLevel,
          maxLevel: active.maxLevel,
          playMode: active.playMode as PlayMode,
          replayCompleted: active.replayCompleted,
        },
        5,
      );

      activeSession = {
        sessionId: active.id,
        playedVideoCount: active.playedVideoCount,
        remainingSeconds: remainingSeconds(active.startedAt, active.maxMinutes),
        channelName: active.channel?.name ?? null,
        minLevel: active.minLevel,
        maxLevel: active.maxLevel,
        playMode: active.playMode,
        video: {
          id: current.id,
          youtubeVideoId: current.youtubeVideoId,
          title: current.title,
          channelName: current.channelName,
          level: current.level,
        },
        queue: queue
          .filter((item) => item.id !== current.id)
          .slice(0, 4)
          .map((item) => ({
            id: item.id,
            title: item.title,
            thumbnailUrl: item.thumbnailUrl,
            level: item.level,
          })),
      };
    }
  }

  return (
    <main className="page">
      <AutoPlayShell
        childId={child.id}
        childName={child.name}
        channels={catalog.channels.map((channel) => ({
          id: channel.id,
          name: channel.name,
          count: channel.count,
        }))}
        minLevel={catalog.scope.minLevel}
        maxLevel={catalog.scope.maxLevel}
        catalogSize={catalog.items.length}
        activeSession={activeSession}
      />
    </main>
  );
}
