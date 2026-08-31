import { NextResponse } from "next/server";
import { requireParentSession } from "@/lib/auth";
import { createCorrectionRequest } from "@/lib/correction-requests";
import { errorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** 부모가 공용 Content Library 영상의 오류를 신고한다. requesterId 는 세션에서만 정해진다. */
export async function POST(request: Request) {
  try {
    const session = await requireParentSession();
    const body = await request.json();
    const created = await createCorrectionRequest({
      requesterId: session.userId,
      videoId: Number(body?.videoId),
      errorType: String(body?.errorType ?? ""),
      description: String(body?.description ?? ""),
    });
    return NextResponse.json({ request: created }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
