import { NextResponse } from "next/server";
import { recordProgressTick } from "@/lib/progress-service";
import { requireVideo } from "@/lib/videos";
import { authorizeChild, requireSessionUser } from "@/lib/auth";
import { toUserMessage } from "@/lib/errors";
import { readNumber, readOptionalNumber } from "@/lib/request";

export async function POST(request: Request) {
  try {
    const session = await requireSessionUser();
    const body = await request.json();

    const child = await authorizeChild(
      session.householdId,
      readNumber(body?.childId, "childId"),
    );
    const videoId = readNumber(body?.videoId, "videoId");
    await requireVideo(videoId);

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
