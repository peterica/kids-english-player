import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { createAdminVideo, listVideosForAdmin } from "@/lib/admin/videos";
import { errorResponse, readBoolean, readInt } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdminSession();
    const { searchParams } = new URL(request.url);
    const videos = await listVideosForAdmin({
      channel: searchParams.get("channel"),
      level: readInt(searchParams.get("level")),
      category: searchParams.get("category"),
      enabled: readBoolean(searchParams.get("enabled")),
      q: searchParams.get("q"),
    });
    return NextResponse.json({ count: videos.length, videos });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    const body = await request.json();
    const video = await createAdminVideo({
      channelId: Number(body?.channelId),
      level: Number(body?.level),
      title: String(body?.title ?? ""),
      category: String(body?.category ?? ""),
      publisher: String(body?.publisher ?? ""),
      youtubeUrl: String(body?.youtubeUrl ?? ""),
      enabled: body?.enabled === undefined ? undefined : body.enabled === true,
    });
    return NextResponse.json({ video }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
