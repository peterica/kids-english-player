import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { validateImport } from "@/lib/admin/import-service";
import { errorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** DB 를 변경하지 않는 검증 전용 엔드포인트. */
export async function POST(request: Request) {
  try {
    await requireAdminSession();
    const body = await request.json();
    const result = await validateImport({
      channelId: Number(body?.channelId),
      markdown: String(body?.markdown ?? ""),
    });
    return NextResponse.json({ channel: result.channel, ...result.preview });
  } catch (error) {
    return errorResponse(error);
  }
}
