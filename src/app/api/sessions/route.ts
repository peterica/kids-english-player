import { NextResponse } from "next/server";
import { startWatchSession } from "@/lib/progress-service";
import { requireVideo } from "@/lib/videos";
import { authorizeChild, requireSessionUser } from "@/lib/auth";
import { toUserMessage } from "@/lib/errors";
import { readNumber } from "@/lib/request";

export async function POST(request: Request) {
  try {
    const session = await requireSessionUser();
    const body = await request.json();

    // 요청 body 의 childId 는 반드시 세션의 Household 로 검증한다.
    const child = await authorizeChild(
      session.householdId,
      readNumber(body?.childId, "childId"),
    );
    const videoId = readNumber(body?.videoId, "videoId");
    await requireVideo(videoId);

    const sessionId = await startWatchSession(
      child.id,
      videoId,
      readNumber(body?.positionSeconds ?? 0, "positionSeconds"),
    );
    return NextResponse.json({ sessionId });
  } catch (error) {
    return NextResponse.json({ error: toUserMessage(error) }, { status: 400 });
  }
}
