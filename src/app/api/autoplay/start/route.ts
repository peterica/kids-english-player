import { NextResponse } from "next/server";
import { requireParentSession } from "@/lib/auth";
import {
  previewAutoPlayQueue,
  startAutoPlaySession,
} from "@/lib/autoplay-service";
import { getChildCatalog } from "@/lib/child-content";
import { remainingSeconds } from "@/lib/autoplay-rules";
import { PLAY_MODE, type PlayMode } from "@/lib/constants";
import { errorResponse } from "@/lib/api-response";
import { readId } from "@/lib/request";

export const dynamic = "force-dynamic";

/**
 * Auto Play 세션을 시작한다.
 * 페이지를 이동하지 않고 같은 화면에서 시작해야 브라우저의 사용자 제스처가 유지되어
 * 첫 영상이 바로 재생된다. (이동하면 제스처가 사라져 다시 클릭해야 한다)
 */
export async function POST(request: Request) {
  try {
    // 새 엔드포인트는 미인증 401 / 권한 없음 403 규칙을 따른다.
    const session = await requireParentSession();
    const body = await request.json();

    const childId = readId(body?.childId, "childId");
    const playMode: PlayMode =
      String(body?.playMode) === PLAY_MODE.RANDOM
        ? PLAY_MODE.RANDOM
        : PLAY_MODE.SEQUENTIAL;
    const channelId = body?.channelId ? Number(body.channelId) : null;
    const maxMinutes = body?.maxMinutes ? Number(body.maxMinutes) : null;

    const created = await startAutoPlaySession(session.householdId, childId, {
      channelId,
      minLevel: Number(body?.minLevel),
      maxLevel: Number(body?.maxLevel),
      playMode,
      replayCompleted: body?.replayCompleted !== false,
      maxMinutes,
    });

    const catalog = await getChildCatalog(session.householdId, childId);
    const current = catalog.items.find((item) => item.id === created.currentVideoId);
    const queue = await previewAutoPlayQueue(
      session.householdId,
      childId,
      {
        channelId: created.channelId,
        minLevel: created.minLevel,
        maxLevel: created.maxLevel,
        playMode: created.playMode as PlayMode,
        replayCompleted: created.replayCompleted,
      },
      5,
    );

    return NextResponse.json({
      sessionId: created.id,
      playedVideoCount: created.playedVideoCount,
      remainingSeconds: remainingSeconds(created.startedAt, created.maxMinutes),
      channelName: created.channelId
        ? (catalog.channels.find((channel) => channel.id === created.channelId)?.name ??
          null)
        : null,
      minLevel: created.minLevel,
      maxLevel: created.maxLevel,
      playMode: created.playMode,
      video: current
        ? {
            id: current.id,
            youtubeVideoId: current.youtubeVideoId,
            title: current.title,
            channelName: current.channelName,
            level: current.level,
          }
        : null,
      queue: queue
        .filter((item) => item.id !== created.currentVideoId)
        .slice(0, 4)
        .map((item) => ({
          id: item.id,
          title: item.title,
          thumbnailUrl: item.thumbnailUrl,
          level: item.level,
        })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
