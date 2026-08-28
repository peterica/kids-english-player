import Link from "next/link";
import { requirePageChild } from "@/lib/guard";
import { getChildCatalog } from "@/lib/child-content";
import {
  getActiveAutoPlaySession,
  previewAutoPlayQueue,
} from "@/lib/autoplay-service";
import { PLAY_MODE, type PlayMode } from "@/lib/constants";
import { remainingSeconds } from "@/lib/autoplay-rules";
import { AutoPlaySetup } from "./AutoPlaySetup";
import { AutoPlayRunner } from "./AutoPlayRunner";

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

  if (active && active.currentVideoId) {
    const current = catalog.items.find((item) => item.id === active.currentVideoId);
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

    if (current) {
      return (
        <main className="page">
          <div className="topbar">
            <div>
              <h1>Auto Play 재생 중</h1>
              <p>
                {active.channel?.name ?? "모든 Channel"} · Level {active.minLevel}–
                {active.maxLevel} ·{" "}
                {active.playMode === PLAY_MODE.RANDOM ? "랜덤" : "순차"} 재생
              </p>
            </div>
            <Link href={`/kids/${child.id}`} className="btn">
              아이 Home
            </Link>
          </div>

          <AutoPlayRunner
            childId={child.id}
            sessionId={active.id}
            initialVideo={{
              id: current.id,
              youtubeVideoId: current.youtubeVideoId,
              title: current.title,
              channelName: current.channelName,
              level: current.level,
            }}
            initialRemainingSeconds={remainingSeconds(
              active.startedAt,
              active.maxMinutes,
            )}
            playedVideoCount={active.playedVideoCount}
            queue={queue
              .filter((item) => item.id !== current.id)
              .slice(0, 4)
              .map((item) => ({
                id: item.id,
                title: item.title,
                thumbnailUrl: item.thumbnailUrl,
                level: item.level,
              }))}
          />
        </main>
      );
    }
  }

  return (
    <main className="page">
      <div className="topbar">
        <div>
          <h1>Auto Play</h1>
          <p>선택한 Channel과 Level의 영상을 일정 시간 계속 재생합니다.</p>
        </div>
        <Link href={`/kids/${child.id}`} className="btn">
          아이 Home
        </Link>
      </div>

      <AutoPlaySetup
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
      />
    </main>
  );
}
