import { NextResponse } from "next/server";
import { startWatchSession } from "@/lib/progress-service";
import { requireVideo } from "@/lib/videos";
import { toUserMessage } from "@/lib/errors";
import { readNumber } from "@/lib/request";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const videoId = readNumber(body?.videoId, "videoId");
    const positionSeconds = readNumber(body?.positionSeconds ?? 0, "positionSeconds");

    await requireVideo(videoId);
    const sessionId = await startWatchSession(videoId, positionSeconds);
    return NextResponse.json({ sessionId });
  } catch (error) {
    return NextResponse.json({ error: toUserMessage(error) }, { status: 400 });
  }
}
