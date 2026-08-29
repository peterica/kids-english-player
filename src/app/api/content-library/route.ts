import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AppError, toUserMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * 읽기 전용 Content Library API.
 *
 * 공용 Library(Video.householdId = NULL) 영상 목록만 돌려준다.
 * 부모가 직접 등록한 가정 전용 영상과 사용자·아이·진도 데이터는 절대 포함하지 않는다.
 *
 *   GET /api/content-library
 *   GET /api/content-library?level=3
 *   GET /api/content-library?channel=caillou   (slug · 이름 · id 모두 허용)
 *
 * CONTENT_LIBRARY_TOKEN 환경변수를 설정하면 그 토큰이 있어야 조회할 수 있다.
 * (설정하지 않으면 공개 — 콘텐츠 메타데이터만 있으므로 기본값은 열어 둔다)
 */
export async function GET(request: Request) {
  try {
    requireToken(request);

    const { searchParams } = new URL(request.url);
    const level = readLevel(searchParams.get("level"));
    const channel = searchParams.get("channel")?.trim() || null;

    const videos = await prisma.video.findMany({
      where: {
        householdId: null,
        ...(level ? { level } : {}),
        ...(channel ? { channel: channelFilter(channel) } : {}),
      },
      orderBy: [{ level: "asc" }, { sequence: "asc" }, { id: "asc" }],
      select: {
        title: true,
        level: true,
        category: true,
        youtubeUrl: true,
        enabled: true,
        channel: { select: { name: true } },
      },
    });

    return NextResponse.json({
      count: videos.length,
      filters: { level, channel },
      videos: videos.map((video) => ({
        channel: video.channel.name,
        level: video.level,
        category: video.category,
        title: video.title,
        youtubeUrl: video.youtubeUrl,
        enabled: video.enabled,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: toUserMessage(error) }, { status: 400 });
  }
}

function requireToken(request: Request) {
  const expected = process.env.CONTENT_LIBRARY_TOKEN?.trim();
  if (!expected) return;

  const { searchParams } = new URL(request.url);
  const provided =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
    searchParams.get("token")?.trim() ||
    "";
  if (provided !== expected) throw new AppError("접근 토큰이 필요합니다.");
}

function readLevel(raw: string | null): number | null {
  if (!raw) return null;
  const level = Number(raw);
  if (!Number.isInteger(level) || level < 1 || level > 5) {
    throw new AppError("level 은 1~5 사이의 정수여야 합니다.");
  }
  return level;
}

/** channel 은 slug, 이름, id 중 무엇으로 와도 받는다. */
function channelFilter(channel: string) {
  const id = Number(channel);
  if (Number.isInteger(id) && id > 0) return { id };
  return { OR: [{ slug: channel.toLowerCase() }, { name: channel }] };
}
