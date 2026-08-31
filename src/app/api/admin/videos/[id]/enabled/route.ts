import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { setAdminVideoEnabled } from "@/lib/admin/videos";
import { errorResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const body = await request.json();
    if (typeof body?.enabled !== "boolean") {
      throw new AppError("enabled 값은 true 또는 false 여야 합니다.");
    }
    return NextResponse.json({
      video: await setAdminVideoEnabled(Number(id), body.enabled),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
