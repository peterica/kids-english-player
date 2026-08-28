import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth";
import { advanceAutoPlaySession } from "@/lib/autoplay-service";
import { prisma } from "@/lib/db";
import { toUserMessage } from "@/lib/errors";
import { readId } from "@/lib/request";

/** 현재 영상이 끝났을 때 다음 영상을 받아온다. */
export async function POST(request: Request) {
  try {
    const session = await requireSessionUser();
    const body = await request.json();
    const autoPlaySessionId = readId(body?.sessionId, "sessionId");

    const result = await advanceAutoPlaySession(session.householdId, autoPlaySessionId);
    if (!result.videoId) return NextResponse.json(result);

    const video = await prisma.video.findUnique({
      where: { id: result.videoId },
      include: { channel: true },
    });

    return NextResponse.json({
      ...result,
      youtubeVideoId: video?.youtubeVideoId ?? null,
      channelName: video?.channel.name ?? null,
      level: video?.level ?? null,
      thumbnailUrl: video?.thumbnailUrl ?? null,
    });
  } catch (error) {
    return NextResponse.json({ error: toUserMessage(error) }, { status: 400 });
  }
}
