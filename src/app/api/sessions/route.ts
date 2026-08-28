import { NextResponse } from "next/server";
import { authorizeChild, requireSessionUser } from "@/lib/auth";
import { getVideoForHousehold } from "@/lib/library";
import { startWatchSession } from "@/lib/progress-service";
import { AppError, toUserMessage } from "@/lib/errors";
import { readId, readNumber } from "@/lib/request";

export async function POST(request: Request) {
  try {
    const session = await requireSessionUser();
    const body = await request.json();

    // body 의 childId 는 반드시 세션의 Household 로 검증한다.
    const child = await authorizeChild(session.householdId, readId(body?.childId, "childId"));
    const videoId = readId(body?.videoId, "videoId");
    if (!(await getVideoForHousehold(session.householdId, videoId))) {
      throw new AppError("영상을 찾을 수 없습니다.");
    }

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
