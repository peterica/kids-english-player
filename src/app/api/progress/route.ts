import { NextResponse } from "next/server";
import { authorizeChild, requireSessionUser } from "@/lib/auth";
import { getVideoForHousehold } from "@/lib/library";
import { recordProgressTick } from "@/lib/progress-service";
import { AppError, toUserMessage } from "@/lib/errors";
import { readId, readNumber, readOptionalNumber } from "@/lib/request";

export async function POST(request: Request) {
  try {
    const session = await requireSessionUser();
    const body = await request.json();

    const child = await authorizeChild(session.householdId, readId(body?.childId, "childId"));
    const videoId = readId(body?.videoId, "videoId");
    if (!(await getVideoForHousehold(session.householdId, videoId))) {
      throw new AppError("영상을 찾을 수 없습니다.");
    }

    const result = await recordProgressTick({
      childId: child.id,
      videoId,
      sessionId: readOptionalNumber(body?.sessionId),
      positionSeconds: readNumber(body?.positionSeconds ?? 0, "positionSeconds"),
      durationSeconds: readNumber(body?.durationSeconds ?? 0, "durationSeconds"),
      watchDeltaSeconds: readNumber(body?.watchDeltaSeconds ?? 0, "watchDeltaSeconds"),
      ended: body?.ended === true,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: toUserMessage(error) }, { status: 400 });
  }
}
